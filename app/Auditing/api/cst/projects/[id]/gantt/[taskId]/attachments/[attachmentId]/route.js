import { NextResponse } from 'next/server';
import { deleteCstTaskAttachment, requirePdplActor } from '@/utils/auditing-cst';

export async function DELETE(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, taskId, attachmentId } = await params;
    await deleteCstTaskAttachment(id, taskId, attachmentId, auth.actor);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting CST task attachment:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete CST task attachment' }, { status: 500 });
  }
}
