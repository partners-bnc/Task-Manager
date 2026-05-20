import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { createPolicy, listPolicies } from '@/utils/policies';

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

export async function GET() {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const policies = await listPolicies({ publishedOnly: false });
    return NextResponse.json({ policies }, { status: 200 });
  } catch (error) {
    console.error('Error loading admin policies:', error);
    return NextResponse.json({ error: error.message || 'Failed to load policies' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const payload = parsePayload(formData);
    const files = formData.getAll('files').filter((entry) => entry instanceof File && entry.size > 0);
    const title = cleanText(payload.title);
    const summary = cleanText(payload.summary);
    const isPublished = true;

    if (!title || !summary) {
      return NextResponse.json({ error: 'Policy title and summary are required.' }, { status: 400 });
    }

    const policy = await createPolicy({
      title,
      summary,
      isPublished,
      files,
      actorProfileId: auth.authContext.userId,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json({ error: error.message || 'Failed to create policy' }, { status: 500 });
  }
}
