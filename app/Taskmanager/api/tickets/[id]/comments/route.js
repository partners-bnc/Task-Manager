import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  canActorCommentOnTicket,
  canActorViewTicket,
  isMissingTicketSchemaError,
  loadTicketParticipants,
  normalizeTicketModuleKey,
  parseMultipartJson,
  requireTicketActor,
  uploadTicketFiles,
} from '@/utils/tickets';

export async function POST(request, context) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const resolvedParams = await context?.params;
    const ticketId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket id.' }, { status: 400 });
    }

    const formData = await request.formData();
    const payload = parseMultipartJson(formData);
    const commentBody = String(payload.commentBody || '').trim();
    const files = formData.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);

    if (!commentBody && files.length === 0) {
      return NextResponse.json({ error: 'Add a comment or attach at least one file.' }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await adminClient
      .from('hrm_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket || normalizeTicketModuleKey(ticket.module_key) !== 'task_manager') {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const participantsByTicketId = await loadTicketParticipants([ticketId]);
    const participants = participantsByTicketId[ticketId] || [];
    if (!canActorViewTicket(ticket, actor, participants) || !canActorCommentOnTicket(ticket, actor, participants)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const commentPayload = {
      id: commentId,
      ticket_id: ticketId,
      author_auth_user_id: actor.authUserId,
      author_employee_id: actor.employeeId || null,
      author_role: actor.role,
      comment_body: commentBody || 'Attachment added.',
      created_at: now,
      updated_at: now,
    };

    const { error: commentError } = await adminClient.from('hrm_ticket_comments').insert(commentPayload);
    if (commentError) {
      return NextResponse.json({ error: commentError.message || 'Failed to add comment.' }, { status: 500 });
    }

    let attachments = [];
    try {
      attachments = await uploadTicketFiles({
        ticketId,
        commentId,
        files,
        actor,
      });
    } catch (error) {
      await adminClient.from('hrm_ticket_comments').delete().eq('id', commentId);
      throw error;
    }
    const uploadedPaths = attachments.map((attachment) => attachment.file_path);

    if (attachments.length > 0) {
      const { error: attachmentError } = await adminClient.from('hrm_ticket_attachments').insert(attachments);
      if (attachmentError) {
        if (uploadedPaths.length > 0) {
          await adminClient.storage.from('hrm-ticket-files').remove(uploadedPaths);
        }
        await adminClient.from('hrm_ticket_comments').delete().eq('id', commentId);
        return NextResponse.json({ error: attachmentError.message || 'Comment added, but attachments failed.' }, { status: 500 });
      }
    }

    await adminClient.from('hrm_tickets').update({ last_activity_at: now }).eq('id', ticketId);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding task manager ticket comment:', error);
    if (isMissingTicketSchemaError(error)) {
      return NextResponse.json({ error: 'Ticket database setup is pending. Apply the latest migration first.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to add ticket comment' }, { status: 500 });
  }
}
