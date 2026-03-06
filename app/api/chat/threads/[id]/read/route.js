import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getChatActor } from '@/utils/chat-helpers';

export async function PATCH(request, { params }) {
  try {
    const chatActor = await getChatActor(request);
    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const readAt = new Date().toISOString();

    const { data, error } = await adminClient
      .from('chat_thread_members')
      .update({ last_read_at: readAt })
      .eq('thread_id', threadId)
      .eq('member_key', chatActor.actorKey)
      .select('thread_id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, readAt });
  } catch (error) {
    console.error('Error marking thread as read:', error);
    return NextResponse.json({ error: 'Failed to mark thread as read' }, { status: 500 });
  }
}