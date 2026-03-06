import { NextResponse } from 'next/server';
import { getChatActor, searchChatUsers } from '@/utils/chat-helpers';

export async function GET(request) {
  try {
    const chatActor = await getChatActor(request);

    if (!chatActor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get('query') || '').trim();

    const users = await searchChatUsers({
      query,
      excludeKey: chatActor.actorKey,
      limit: 25,
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error searching chat users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}