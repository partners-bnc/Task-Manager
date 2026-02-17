import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';

const SESSION_COOKIE = 'employee_session';
const AVATAR_BUCKET = 'employee-avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function getFileExtension(fileName = '') {
  const parts = String(fileName).split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}

function getStoragePathFromPublicUrl(url) {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

async function getSessionEmployee(request) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: session, error: sessionError } = await adminClient
    .from('employee_sessions')
    .select('employee_id, expires_at')
    .eq('token', sessionToken)
    .single();

  if (sessionError || !session) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return { error: 'Session expired', status: 401 };
  }

  const { data: employee, error: employeeError } = await adminClient
    .from('employees')
    .select('id, profile_picture_url')
    .eq('id', session.employee_id)
    .single();

  if (employeeError || !employee) {
    await adminClient.from('employee_sessions').delete().eq('token', sessionToken);
    return { error: 'Unauthorized', status: 401 };
  }

  return { employee };
}

export async function POST(request) {
  try {
    const sessionData = await getSessionEmployee(request);

    if (sessionData.error) {
      return NextResponse.json({ error: sessionData.error }, { status: sessionData.status });
    }

    const { employee } = sessionData;
    const formData = await request.formData();
    const avatar = formData.get('avatar');

    if (!avatar || typeof avatar === 'string') {
      return NextResponse.json({ error: 'Avatar file is required' }, { status: 400 });
    }

    if (!avatar.type || !avatar.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Avatar must be 5MB or smaller' }, { status: 400 });
    }

    const ext = getFileExtension(avatar.name);
    const filePath = `${employee.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes = await avatar.arrayBuffer();

    const { error: uploadError } = await adminClient.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, Buffer.from(bytes), {
        contentType: avatar.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    const avatarUrl = urlData?.publicUrl || null;

    if (!avatarUrl) {
      await adminClient.storage.from(AVATAR_BUCKET).remove([filePath]);
      return NextResponse.json({ error: 'Failed to resolve avatar URL' }, { status: 500 });
    }

    const oldStoragePath = getStoragePathFromPublicUrl(employee.profile_picture_url);

    const { error: updateError } = await adminClient
      .from('employees')
      .update({ profile_picture_url: avatarUrl })
      .eq('id', employee.id);

    if (updateError) {
      await adminClient.storage.from(AVATAR_BUCKET).remove([filePath]);
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 });
    }

    if (oldStoragePath && oldStoragePath !== filePath) {
      await adminClient.storage.from(AVATAR_BUCKET).remove([oldStoragePath]);
    }

    return NextResponse.json({ success: true, avatarUrl, employeeId: employee.id });
  } catch (error) {
    console.error('Error updating employee avatar:', error);
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
