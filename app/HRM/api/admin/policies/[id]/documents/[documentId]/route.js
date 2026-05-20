import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { deletePolicyDocument } from '@/utils/policies';

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

async function resolveParams(context) {
  const params = await context?.params;
  return {
    policyId: typeof params?.id === 'string' ? params.id : '',
    documentId: typeof params?.documentId === 'string' ? params.documentId : '',
  };
}

export async function DELETE(_request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const { policyId, documentId } = await resolveParams(context);
    if (!policyId || !documentId) {
      return NextResponse.json({ error: 'Policy id and document id are required.' }, { status: 400 });
    }

    await deletePolicyDocument({ policyId, documentId });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting policy document:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete policy document' }, { status: 500 });
  }
}
