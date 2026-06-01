import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  buildTicketSlaFields,
  ensureActorInTicketDirectory,
  getTicketCategories,
  getVisibleTicketGroups,
  insertTicketHistoryEntry,
  isMissingTicketSchemaError,
  listTicketPeople,
  loadTicketParticipants,
  loadVisibleTickets,
  parseMultipartJson,
  requireTicketActor,
  resolveInitialTicketOwner,
  TICKET_ATTACHMENTS_TABLE,
  TICKET_PARTICIPANTS_TABLE,
  TICKETS_TABLE,
  uploadTicketFiles,
} from '@/utils/tickets';

function createEmptyResponse(actor = null) {
  return {
    setupPending: true,
    actor,
    filters: {
      statuses: TICKET_STATUSES,
      priorities: TICKET_PRIORITIES,
      categories: getTicketCategories('all'),
    },
    people: [],
    myTickets: [],
    assignedTickets: [],
    closedTickets: [],
    adminOpenTickets: [],
    allTickets: [],
  };
}

export async function GET() {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const directory = ensureActorInTicketDirectory(await listTicketPeople(), actor);

    let tickets;
    try {
      tickets = await loadVisibleTickets(actor, 'all');
    } catch (error) {
      if (isMissingTicketSchemaError(error)) {
        return NextResponse.json(createEmptyResponse(actor), { status: 200 });
      }
      throw error;
    }

    const participantsByTicketId = await loadTicketParticipants(tickets.map((ticket) => ticket.id));
    const grouped = getVisibleTicketGroups(tickets, actor, participantsByTicketId, directory.byAuthUserId);

    return NextResponse.json(
      {
        setupPending: false,
        actor,
        filters: {
          statuses: TICKET_STATUSES,
          priorities: TICKET_PRIORITIES,
          categories: getTicketCategories('all'),
        },
        people: directory.people,
        ...grouped,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading task manager tickets:', error);
    return NextResponse.json({ error: error.message || 'Failed to load tickets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const formData = await request.formData();
    const payload = parseMultipartJson(formData);
    const subject = String(payload.subject || '').trim();
    const description = String(payload.description || '').trim();
    const category = String(payload.category || '').trim().toLowerCase();
    const priority = String(payload.priority || 'medium').trim().toLowerCase();
    const raisedForAuthUserId = String(payload.raisedForAuthUserId || actor.authUserId).trim() || actor.authUserId;
    const ccAuthUserIds = Array.isArray(payload.ccAuthUserIds)
      ? payload.ccAuthUserIds.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const files = formData.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }
    if (!getTicketCategories('all').includes(category)) {
      return NextResponse.json({ error: 'Category is invalid.' }, { status: 400 });
    }
    if (!TICKET_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: 'Priority is invalid.' }, { status: 400 });
    }
    const directory = ensureActorInTicketDirectory(await listTicketPeople(), actor);
    const owner = await resolveInitialTicketOwner();

    const raisedFor = directory.byAuthUserId.get(raisedForAuthUserId) || directory.byAuthUserId.get(actor.authUserId) || actor;
    const uniqueCcAuthIds = Array.from(new Set(ccAuthUserIds)).filter((authUserId) => authUserId !== owner.authUserId);
    const invalidCc = uniqueCcAuthIds.find((authUserId) => !directory.byAuthUserId.has(authUserId));
    if (invalidCc) {
      return NextResponse.json({ error: 'One or more CC recipients are invalid.' }, { status: 400 });
    }

    const ticketId = crypto.randomUUID();
    const now = new Date().toISOString();
    const ticketPayload = {
      id: ticketId,
      source_module: 'task_manager',
      subject,
      description,
      category,
      priority,
      status: 'ticket_raised',
      requester_auth_user_id: actor.authUserId,
      requester_employee_id: actor.employeeId || null,
      requester_role: actor.role,
      owner_auth_user_id: owner.authUserId,
      owner_employee_id: owner.employeeId || null,
      owner_role: owner.role,
      raised_for_auth_user_id: raisedFor?.authUserId || actor.authUserId,
      raised_for_employee_id: raisedFor?.employeeId || null,
      raised_for_role: raisedFor?.role || actor.role,
      last_activity_at: now,
      ...buildTicketSlaFields(now),
    };

    const participantRows = [
      {
        ticket_id: ticketId,
        participant_type: 'owner',
        participant_auth_user_id: owner.authUserId,
        participant_employee_id: owner.employeeId || null,
        participant_role: owner.role,
      },
      ...uniqueCcAuthIds.map((authUserId) => {
        const person = directory.byAuthUserId.get(authUserId);
        return {
          ticket_id: ticketId,
          participant_type: 'cc',
          participant_auth_user_id: person.authUserId,
          participant_employee_id: person.employeeId || null,
          participant_role: person.role,
        };
      }),
    ];

    const uploadedAttachments = await uploadTicketFiles({
      ticketId,
      files,
      actor,
    });
    const uploadedPaths = uploadedAttachments.map((attachment) => attachment.file_path);

    const { error: ticketInsertError } = await adminClient.from(TICKETS_TABLE).insert(ticketPayload);
    if (ticketInsertError) {
      if (uploadedPaths.length > 0) {
        await adminClient.storage.from('hrm-ticket-files').remove(uploadedPaths);
      }
      throw ticketInsertError;
    }

    const { error: participantError } = await adminClient.from(TICKET_PARTICIPANTS_TABLE).insert(participantRows);
    if (participantError) {
      if (uploadedPaths.length > 0) {
        await adminClient.storage.from('hrm-ticket-files').remove(uploadedPaths);
      }
      await adminClient.from(TICKETS_TABLE).delete().eq('id', ticketId);
      throw participantError;
    }

    try {
      await insertTicketHistoryEntry({
        ticketId,
        cycleNo: 1,
        stepNo: 1,
        stepKey: 'ticket_raised',
        actor,
        createdAt: now,
      });
    } catch (historyError) {
      if (uploadedPaths.length > 0) {
        await adminClient.storage.from('hrm-ticket-files').remove(uploadedPaths);
      }
      await adminClient.from(TICKET_PARTICIPANTS_TABLE).delete().eq('ticket_id', ticketId);
      await adminClient.from(TICKETS_TABLE).delete().eq('id', ticketId);
      throw historyError;
    }

    if (uploadedAttachments.length > 0) {
      const { error: attachmentError } = await adminClient.from(TICKET_ATTACHMENTS_TABLE).insert(uploadedAttachments);
      if (attachmentError) {
        if (uploadedPaths.length > 0) {
          await adminClient.storage.from('hrm-ticket-files').remove(uploadedPaths);
        }
        await adminClient.from(TICKET_PARTICIPANTS_TABLE).delete().eq('ticket_id', ticketId);
        await adminClient.from(TICKETS_TABLE).delete().eq('id', ticketId);
        throw attachmentError;
      }
    }

    const { data: insertedTicket, error: insertedError } = await adminClient
      .from(TICKETS_TABLE)
      .select('*')
      .eq('id', ticketId)
      .single();

    if (insertedError || !insertedTicket) {
      return NextResponse.json({ error: insertedError?.message || 'Ticket was created but could not be loaded.' }, { status: 201 });
    }

    return NextResponse.json({ ticket: insertedTicket }, { status: 201 });
  } catch (error) {
    console.error('Error creating task manager ticket:', error);
    if (isMissingTicketSchemaError(error)) {
      return NextResponse.json({ error: 'Ticket database setup is pending. Apply the latest migration first.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create ticket' }, { status: 500 });
  }
}
