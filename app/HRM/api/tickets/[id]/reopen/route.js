import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  canActorReopenTicket,
  getCurrentCycleNumber,
  getTicketCurrentStepNumber,
  insertTicketHistoryEntry,
  isMissingTicketSchemaError,
  isTicketClosedStatus,
  loadTicketStatusHistory,
  requireTicketActor,
  TICKETS_TABLE,
} from '@/utils/tickets';

export async function POST(_request, context) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    const resolvedParams = await context?.params;
    const ticketId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket id.' }, { status: 400 });
    }

    const [{ data: ticket, error: ticketError }, historyByTicketId] = await Promise.all([
      adminClient.from(TICKETS_TABLE).select('*').eq('id', ticketId).maybeSingle(),
      loadTicketStatusHistory([ticketId]),
    ]);

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }
    if (!canActorReopenTicket(ticket, actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isTicketClosedStatus(ticket.status)) {
      return NextResponse.json({ error: 'Only resolved tickets can be reopened.' }, { status: 400 });
    }

    const history = historyByTicketId[ticketId] || [];
    const currentCycleNo = getCurrentCycleNumber(history);
    const currentStepNo = getTicketCurrentStepNumber(history);
    const reopenAt = new Date().toISOString();

    await insertTicketHistoryEntry({
      ticketId,
      cycleNo: currentCycleNo,
      stepNo: currentStepNo + 1,
      stepKey: 'reopened',
      actor,
      createdAt: reopenAt,
    });

    await insertTicketHistoryEntry({
      ticketId,
      cycleNo: currentCycleNo + 1,
      stepNo: currentStepNo + 2,
      stepKey: 'open',
      actor,
      createdAt: reopenAt,
    });

    const { data: updatedTicket, error: updateError } = await adminClient
      .from(TICKETS_TABLE)
      .update({
        status: 'open',
        closed_at: null,
        last_activity_at: reopenAt,
      })
      .eq('id', ticketId)
      .select('*')
      .single();

    if (updateError || !updatedTicket) {
      return NextResponse.json({ error: updateError?.message || 'Failed to reopen ticket.' }, { status: 500 });
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
  } catch (error) {
    console.error('Error reopening ticket:', error);
    if (isMissingTicketSchemaError(error)) {
      return NextResponse.json({ error: 'Ticket database setup is pending. Apply the latest migration first.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to reopen ticket' }, { status: 500 });
  }
}
