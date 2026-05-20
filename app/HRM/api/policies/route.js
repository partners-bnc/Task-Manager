import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { listPolicies } from '@/utils/policies';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    const canAccess =
      Boolean(authContext?.isHrAdmin) ||
      Boolean(authContext?.isSuperAdmin) ||
      hasLinkedEmployeeAccess(authContext);

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const policies = await listPolicies({ publishedOnly: true });
    return NextResponse.json({ policies }, { status: 200 });
  } catch (error) {
    console.error('Error loading employee policies:', error);
    return NextResponse.json({ error: error.message || 'Failed to load policies' }, { status: 500 });
  }
}
