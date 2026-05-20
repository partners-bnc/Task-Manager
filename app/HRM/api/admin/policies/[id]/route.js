import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { deletePolicy, updatePolicy } from '@/utils/policies';

async function requireHrAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.isHrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

function cleanText(value) {
  return String(value || '').trim();
}

function parsePayload(formData) {
  const rawPayload = formData.get('payload');
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawPayload);
  } catch {
    throw new Error('Invalid request payload.');
  }
}

async function resolvePolicyId(context) {
  const params = await context?.params;
  return typeof params?.id === 'string' ? params.id : '';
}

export async function PATCH(request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const policyId = await resolvePolicyId(context);
    if (!policyId) {
      return NextResponse.json({ error: 'Policy id is required.' }, { status: 400 });
    }

    const formData = await request.formData();
    const payload = parsePayload(formData);
    const files = formData.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);
    const title = cleanText(payload.title);
    const summary = cleanText(payload.summary);
    const isPublished = true;

    if (!title || !summary) {
      return NextResponse.json({ error: 'Policy title and summary are required.' }, { status: 400 });
    }

    const policy = await updatePolicy({
      policyId,
      title,
      summary,
      isPublished,
      files,
      actorProfileId: auth.authContext.userId,
    });

    return NextResponse.json({ policy }, { status: 200 });
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: error.message || 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(_request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const policyId = await resolvePolicyId(context);
    if (!policyId) {
      return NextResponse.json({ error: 'Policy id is required.' }, { status: 400 });
    }

    await deletePolicy(policyId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete policy' }, { status: 500 });
  }
}
