import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { derivePeerKey, getChatActor, getChatUserByKey } from '@/utils/chat-helpers';

async function getLastMessagesByThread(threadIds) {
  if (threadIds.length === 0) return new Map();

  const { data: rows } = await adminClient
    .from('chat_messages')
    .select('id, thread_id, sender_key, content, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false });

  const map = new Map();
  for (const row of rows || []) {
    if (!map.has(row.thread_id)) {
      map.set(row.thread_id, row);
    }
  }
  return map;
}

async function getUnreadCount(threadId, selfKey, lastReadAt) {
  let query = adminClient
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .neq('sender_key', selfKey);

  if (lastReadAt) {
    query = query.gt('created_at', lastReadAt);
  }

  const { count } = await query;
  return count || 0;
}

export async function GET(request) {
  try {
    const chatActor = await getChatActor(request);

    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberRows, error: memberError } = await adminClient
      .from('chat_thread_members')
      .select('thread_id, last_read_at')
      .eq('member_key', chatActor.actorKey);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    const threadIds = (memberRows || []).map((row) => row.thread_id);
    if (threadIds.length === 0) {
      return NextResponse.json({ success: true, actor: chatActor.user, threads: [] });
    }

    const { data: threads, error: threadError } = await adminClient
      .from('chat_threads')
      .select('id, participant_a_key, participant_b_key, last_message_at, updated_at')
      .in('id', threadIds)
      .order('updated_at', { ascending: false });

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }

    const lastMessageMap = await getLastMessagesByThread(threadIds);
    const memberMap = new Map((memberRows || []).map((row) => [row.thread_id, row]));

    const peerKeys = Array.from(
      new Set(
        (threads || [])
          .map((thread) => derivePeerKey(thread, chatActor.actorKey))
          .filter(Boolean)
      )
    );

    const peerEntries = await Promise.all(
      peerKeys.map(async (key) => [key, await getChatUserByKey(key)])
    );
    const peerMap = new Map(peerEntries);

    const threadModels = await Promise.all(
      (threads || []).map(async (thread) => {
        const peerKey = derivePeerKey(thread, chatActor.actorKey);
        const peer = peerMap.get(peerKey) || null;
        const lastMessage = lastMessageMap.get(thread.id) || null;
        const member = memberMap.get(thread.id);
        const unreadCount = await getUnreadCount(thread.id, chatActor.actorKey, member?.last_read_at || null);

        return {
          id: thread.id,
          peer,
          lastMessage,
          lastMessageAt: thread.last_message_at || lastMessage?.created_at || thread.updated_at,
          unreadCount,
          lastReadAt: member?.last_read_at || null,
        };
      })
    );

    return NextResponse.json({ success: true, actor: chatActor.user, threads: threadModels });
  } catch (error) {
    console.error('Error loading chat bootstrap:', error);
    return NextResponse.json({ error: 'Failed to load chat data' }, { status: 500 });
  }
}