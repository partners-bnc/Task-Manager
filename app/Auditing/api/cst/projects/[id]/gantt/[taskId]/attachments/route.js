import { NextResponse } from 'next/server';
import { requirePdplActor, uploadCstTaskFiles } from '@/utils/auditing-cst';

export async function POST(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, taskId } = await params;
    const formData = await request.formData();
    const files = formData.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);
    const attachments = await uploadCstTaskFiles({
      projectId: id,
      taskId,
      files,
      actor: auth.actor,
    });

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error('Error uploading CST task attachments:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to upload CST task attachments' }, { status: 500 });
  }
}
