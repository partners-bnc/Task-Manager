import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';

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

async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { supabase, user };
}

export async function POST(request) {
  try {
    const adminContext = await getAdminContext();

    if (adminContext.error) {
      return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
    }

    const { supabase, user } = adminContext;
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
    const filePath = `admins/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
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

    const oldStoragePath = getStoragePathFromPublicUrl(user.user_metadata?.avatar_url);

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      },
    });

    if (authUpdateError) {
      await adminClient.storage.from(AVATAR_BUCKET).remove([filePath]);
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 });
    }

    if (oldStoragePath && oldStoragePath !== filePath) {
      await adminClient.storage.from(AVATAR_BUCKET).remove([oldStoragePath]);
    }

    return NextResponse.json({ success: true, avatarUrl, userId: user.id });
  } catch (error) {
    console.error('Error updating admin avatar:', error);
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
