import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { cleanText, fetchOnboardingBundleById, mapOnboardingToAddEmployeePrefill, ONBOARDING_STATUSES } from '@/utils/onboarding';

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

export async function GET(_request, { params }) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const resolvedParams = await params;
    const id = cleanText(resolvedParams?.id);
    const bundle = await fetchOnboardingBundleById(id);
    if (!bundle?.request) {
      return NextResponse.json({ error: 'Onboarding request not found' }, { status: 404 });
    }

    if (![ONBOARDING_STATUSES.approved, ONBOARDING_STATUSES.converted].includes(bundle.request.status)) {
      return NextResponse.json({ error: 'Only approved onboarding requests can be converted to employees.' }, { status: 400 });
    }

    return NextResponse.json(mapOnboardingToAddEmployeePrefill(bundle), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to build onboarding prefill' }, { status: 500 });
  }
}
