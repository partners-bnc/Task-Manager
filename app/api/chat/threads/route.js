import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getChatActor, getChatUserByKey } from '@/utils/chat-helpers';

function sortKeys(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function POST(request) {
  try {
    const chatActor = await getChatActor(request);

    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const targetKey = String(body?.targetKey || '').trim();

    if (!targetKey) {
      return NextResponse.json({ error: 'targetKey is required' }, { status: 400 });
    }

    if (targetKey === chatActor.actorKey) {
      return NextResponse.json({ error: 'You cannot chat with yourself' }, { status: 400 });
    }

    const targetUser = await getChatUserByKey(targetKey);
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const [participantA, participantB] = sortKeys(chatActor.actorKey, targetKey);

    const { data: upsertedRows, error: upsertError } = await adminClient
      .from('chat_threads')
      .upsert(
        {
          thread_type: 'dm',
          participant_a_key: participantA,
          participant_b_key: participantB,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'thread_type,participant_a_key,participant_b_key',
          ignoreDuplicates: false,
        }
      )
      .select('id, participant_a_key, participant_b_key, last_message_at, updated_at')
      .limit(1);

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const thread = (upsertedRows || [])[0];
    if (!thread) {
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: memberUpsertError } = await adminClient.from('chat_thread_members').upsert(
      [
        {
          thread_id: thread.id,
          member_key: chatActor.actorKey,
          joined_at: now,
          last_read_at: now,
        },
        {
          thread_id: thread.id,
          member_key: targetKey,
          joined_at: now,
          last_read_at: null,
        },
      ],
      {
        onConflict: 'thread_id,member_key',
        ignoreDuplicates: false,
      }
    );

    if (memberUpsertError) {
      return NextResponse.json({ error: memberUpsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        peer: targetUser,
        lastMessageAt: thread.last_message_at || thread.updated_at,
        unreadCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating chat thread:', error);
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }
}