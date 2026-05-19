import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { adminClient } from '@/utils/supabase/admin';
import {
  buildOnboardingLink,
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

export async function GET(_request, { params }) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const resolvedParams = await params;
    const bundle = await fetchOnboardingBundleById(cleanText(resolvedParams?.id));
    if (!bundle) {
      return NextResponse.json({ error: 'Onboarding request not found' }, { status: 404 });
    }

    return NextResponse.json(bundle, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load onboarding request' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) return auth.error;

    const { authContext } = auth;
    const resolvedParams = await params;
    const id = cleanText(resolvedParams?.id);
    const body = await request.json().catch(() => ({}));
    const action = cleanText(body.action);
    const reviewNote = cleanText(body.reviewNote);
    const sendEmail = body.sendEmail !== false;
    const expiryHoursRaw = Number(body.expiryHours);
    const expiryHours = Number.isFinite(expiryHoursRaw) && expiryHoursRaw > 0 ? Math.round(expiryHoursRaw) : DEFAULT_ONBOARDING_TOKEN_EXPIRY_HOURS;

    if (!id || !action) {
      return NextResponse.json({ error: 'Onboarding request id and action are required.' }, { status: 400 });
    }

    const bundle = await fetchOnboardingBundleById(id);
    if (!bundle?.request) {
      return NextResponse.json({ error: 'Onboarding request not found' }, { status: 404 });
    }

    const current = bundle.request;
    const now = new Date().toISOString();
    const updatePayload = {
      reviewed_by: authContext.userId,
      reviewed_at: now,
    };
    let inviteLink = '';
    let eventAction = action;

    if (action === 'approve') {
      updatePayload.status = ONBOARDING_STATUSES.approved;
      updatePayload.approved_at = now;
      updatePayload.review_note = reviewNote;
    } else if (action === 'reject') {
      updatePayload.status = ONBOARDING_STATUSES.rejected;
      updatePayload.review_note = reviewNote;
    } else if (action === 'archive') {
      updatePayload.archived_at = now;
      eventAction = 'archived';
    } else if (action === 'cancel') {
      updatePayload.status = ONBOARDING_STATUSES.cancelled;
      updatePayload.review_note = reviewNote;
      eventAction = 'cancelled';
    } else if (action === 'request_changes' || action === 'regenerate_link') {
      const plainToken = generateOnboardingToken();
      const expiresAt = getOnboardingInviteExpiryIso(expiryHours);
      updatePayload.token_hash = hashOnboardingToken(plainToken);
      updatePayload.token_expires_at = expiresAt;
      updatePayload.invite_sent_at = now;
      updatePayload.submitted = false;
      updatePayload.submitted_at = null;
      updatePayload.approved_at = null;
      updatePayload.review_note = reviewNote;
      updatePayload.status = action === 'request_changes' ? ONBOARDING_STATUSES.changesRequested : current.status;
      inviteLink = buildOnboardingLink(plainToken, new URL(request.url).origin);
      eventAction = action === 'request_changes' ? 'changes_requested' : 'invite_regenerated';

      if (sendEmail) {
        try {
          await enqueueOnboardingInviteEmail({
            onboardingRequestId: current.id,
            recipientEmail: current.candidate_email,
            candidateName: current.candidate_name,
            onboardingLink: inviteLink,
            expiresAt,
          });
        } catch (emailError) {
          console.error('Failed to queue onboarding invite email:', emailError);
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported onboarding action.' }, { status: 400 });
    }

    const { error: updateError } = await adminClient
      .from('hrm_onboarding_requests')
      .update(updatePayload)
      .eq('id', current.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update onboarding request' }, { status: 500 });
    }

    await logOnboardingEvent({
      onboardingRequestId: current.id,
      action: eventAction,
      actorProfileId: authContext.userId,
      note: reviewNote,
      metadata: inviteLink ? { inviteLinkSent: sendEmail } : {},
    });

    const refreshed = await fetchOnboardingBundleById(current.id);
    return NextResponse.json(
      {
        ...refreshed,
        inviteLink: inviteLink || undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update onboarding request' }, { status: 500 });
  }
}
