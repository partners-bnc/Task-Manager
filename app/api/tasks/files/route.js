import { NextResponse } from 'next/server';
import { requireTaskManager } from '@/utils/api-helpers';

const TASK_FILES_BUCKET_CANDIDATES = ['task-files', 'task_files'];

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

async function resolveTaskFilesBucket(supabase) {
  for (const bucket of TASK_FILES_BUCKET_CANDIDATES) {
    const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    if (!error) return bucket;
    if (!isBucketNotFoundError(error)) return null;
  }
  return null;
}

function sanitizeFileName(fileName = '') {
  return String(fileName)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120) || 'file';
}

export async function POST(request) {
  try {
    const auth = await requireTaskManager(request);
    if (auth.error) return auth.error;
    const { supabase, actor } = auth;

    const bucket = await resolveTaskFilesBucket(supabase);
    if (!bucket) {
      return NextResponse.json(
        { error: 'Task files bucket is missing or not accessible. Expected one of: task_files, task-files' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData
      .getAll('files')
      .filter((entry) => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const uploadedPaths = [];
    const attachments = [];

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const actorId = actor.type === 'admin' ? actor.userId : actor.employeeId;
      const storagePath = `pending/${actorId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(bucket).remove(uploadedPaths);
        }

        return NextResponse.json({ error: uploadError.message || 'Failed to upload files' }, { status: 500 });
      }

      uploadedPaths.push(storagePath);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      attachments.push({
        file_name: file.name,
        file_url: urlData?.publicUrl || '',
        file_path: storagePath,
      });
    }

    return NextResponse.json({ success: true, attachments });
  } catch (error) {
    console.error('Error uploading task files:', error);
    return NextResponse.json({ error: 'Failed to upload task files', success: false }, { status: 500 });
  }
}
