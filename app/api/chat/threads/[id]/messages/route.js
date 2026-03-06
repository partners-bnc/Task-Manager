import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getChatActor } from '@/utils/chat-helpers';

const PAGE_SIZE = 50;

async function ensureMember(threadId, memberKey) {
  const { data, error } = await adminClient
    .from('chat_thread_members')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('member_key', memberKey)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function GET(request, { params }) {
  try {
    const chatActor = await getChatActor(request);
    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const isMember = await ensureMember(threadId, chatActor.actorKey);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = String(searchParams.get('cursor') || '').trim();

    let query = adminClient
      .from('chat_messages')
      .select('id, thread_id, sender_key, sender_name, sender_avatar_url, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const messages = (rows || []).slice().reverse();

    return NextResponse.json({ success: true, messages, hasMore: (rows || []).length === PAGE_SIZE });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const chatActor = await getChatActor(request);
    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const isMember = await ensureMember(threadId, chatActor.actorKey);
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const content = String(body?.content || '').trim();

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const { data: message, error: insertError } = await adminClient
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_key: chatActor.actorKey,
        sender_name: chatActor.user.name,
        sender_avatar_url: chatActor.user.avatarUrl || null,
        content,
      })
      .select('id, thread_id, sender_key, sender_name, sender_avatar_url, content, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await adminClient
      .from('chat_thread_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('member_key', chatActor.actorKey);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error posting chat message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}