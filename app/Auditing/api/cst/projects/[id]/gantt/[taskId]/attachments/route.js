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
    const message = String(error?.message || '');
    if (message.includes('do not have access')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes('exceeds the 20 MB file size limit')) {
      return NextResponse.json({ error: message }, { status: 413 });
    }
    if (message.includes('valid document file is required')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message || 'Failed to upload CST task attachments' }, { status: 500 });
  }
}
