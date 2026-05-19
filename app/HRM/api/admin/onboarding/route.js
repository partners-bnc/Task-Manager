import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { adminClient } from '@/utils/supabase/admin';
import {
  buildOnboardingLink,
  cleanEmail,
  cleanText,
  DEFAULT_ONBOARDING_TOKEN_EXPIRY_HOURS,
  fetchOnboardingBundleById,
  generateOnboardingToken,
  getOnboardingInviteExpiryIso,
  hashOnboardingToken,
  logOnboardingEvent,
  ONBOARDING_STATUSES,
} from '@/utils/onboarding';
import { enqueueOnboardingInviteEmail } from '@/utils/email-outbox';

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

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = cleanText(searchParams.get('id'));
    const status = cleanText(searchParams.get('status'));
    const includeArchived = searchParams.get('includeArchived') === '1';

    if (id) {
      const bundle = await fetchOnboardingBundleById(id);
      if (!bundle) {
        return NextResponse.json({ error: 'Onboarding request not found' }, { status: 404 });
      }
      return NextResponse.json(bundle, { status: 200 });
    }

    let query = adminClient
      .from('hrm_onboarding_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else if (!includeArchived) {
      query = query.not('status', 'in', `(${ONBOARDING_STATUSES.converted},${ONBOARDING_STATUSES.cancelled},${ONBOARDING_STATUSES.expired})`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load onboarding requests' }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load onboarding requests' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const { authContext } = auth;
    const body = await request.json().catch(() => ({}));
    const candidateName = cleanText(body.candidateName);
    const candidateEmail = cleanEmail(body.candidateEmail);
    const sendEmail = body.sendEmail !== false;
    const expiryHoursRaw = Number(body.expiryHours);
    const expiryHours = Number.isFinite(expiryHoursRaw) && expiryHoursRaw > 0 ? Math.round(expiryHoursRaw) : DEFAULT_ONBOARDING_TOKEN_EXPIRY_HOURS;

    if (!candidateName || !candidateEmail) {
      return NextResponse.json({ error: 'Candidate name and email are required.' }, { status: 400 });
    }

    const plainToken = generateOnboardingToken();
    const tokenHash = hashOnboardingToken(plainToken);
    const expiresAt = getOnboardingInviteExpiryIso(expiryHours);

    const { data: created, error } = await adminClient
      .from('hrm_onboarding_requests')
      .insert({
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        token_hash: tokenHash,
        token_expires_at: expiresAt,
        invite_sent_at: new Date().toISOString(),
        status: ONBOARDING_STATUSES.invited,
        created_by: authContext.userId,
      })
      .select('*')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Failed to create onboarding invite' }, { status: 500 });
    }

    const requestOrigin = new URL(request.url).origin;
    const inviteLink = buildOnboardingLink(plainToken, requestOrigin);
    await logOnboardingEvent({
      onboardingRequestId: created.id,
      action: 'invite_created',
      actorProfileId: authContext.userId,
      note: 'Onboarding invite created.',
      metadata: { expiresAt, sendEmail },
    });

    if (sendEmail) {
      try {
        await enqueueOnboardingInviteEmail({
          onboardingRequestId: created.id,
          recipientEmail: candidateEmail,
          candidateName,
          onboardingLink: inviteLink,
          expiresAt,
        });
      } catch (emailError) {
        console.error('Failed to queue onboarding invite email:', emailError);
      }
    }

    return NextResponse.json(
      {
        request: created,
        inviteLink,
        message: sendEmail ? 'Onboarding invite created and email queued.' : 'Onboarding invite created.',
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to create onboarding invite' }, { status: 500 });
  }
}
