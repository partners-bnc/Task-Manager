import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { getActor } from '@/utils/api-helpers';

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

async function getActorEmployee(request) {
  const actor = await getActor(request);

  if (!actor) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (actor.type !== 'employee') {
    return { error: 'Forbidden', status: 403 };
  }

  const { data: employee, error: employeeError } = await adminClient
    .from('employees')
    .select('id, profile_picture_url')
    .eq('id', actor.employeeId)
    .single();

  if (employeeError || !employee) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { employee };
}

export async function POST(request) {
  try {
    const actorData = await getActorEmployee(request);

    if (actorData.error) {
      return NextResponse.json({ error: actorData.error }, { status: actorData.status });
    }

    const { employee } = actorData;
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