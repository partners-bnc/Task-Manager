import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { calculateAttendanceMetrics, createTimestampForAttendanceDate } from '@/utils/attendance';
import { buildFinalApproverRole, hasPendingApproverRecipient, isApproverRecipient } from '@/utils/regularization';

async function requireApproverContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { authContext };
}

function appendAttendanceNote(existingNotes, nextNote) {
  return [existingNotes, nextNote].filter(Boolean).join(' ').trim();
}

export async function PATCH(request, context) {
  try {
    const approverContext = await requireApproverContext();
    if (approverContext.error) {
      return approverContext.error;
    }

    const resolvedParams = await context?.params;
    const id = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    const body = await request.json();
    const decision = String(body?.decision || '').trim().toLowerCase();
    const approvalOutcome = String(body?.approvalOutcome || '').trim().toLowerCase();

    if (!id) {
      return NextResponse.json({ error: 'Invalid regularization request id' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    if (decision === 'approved' && !['full_day', 'half_day'].includes(approvalOutcome)) {
      return NextResponse.json({ error: 'Select full day or half day while approving' }, { status: 400 });
    }

    const { data: regularizationRequest, error } = await adminClient
      .from('hrm_regularization_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !regularizationRequest) {
      return NextResponse.json({ error: error?.message || 'Regularization request not found' }, { status: 404 });
    }

    if (String(regularizationRequest.status || regularizationRequest.request_status).toLowerCase() !== 'pending') {
      return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 400 });
    }

    const { data: recipientRows, error: recipientError } = await adminClient
      .from('hrm_regularization_request_recipients')
      .select('*')
      .eq('request_id', id);

    if (recipientError) {
      return NextResponse.json({ error: recipientError.message || 'Failed to load request recipients' }, { status: 500 });
    }

    const recipients = Array.isArray(recipientRows) ? recipientRows : [];
    const actorRecipient = recipients.find((recipient) => isApproverRecipient(recipient, approverContext.authContext));

    if (!actorRecipient || !hasPendingApproverRecipient(recipients, approverContext.authContext)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const decisionAt = new Date().toISOString();
    const parentPayload = {
      status: decision,
      approval_outcome: decision === 'approved' ? approvalOutcome : null,
      reviewed_at: decisionAt,
      final_approved_by:
        decision === 'approved'
          ? actorRecipient.recipient_auth_user_id || actorRecipient.recipient_employee_id || null
          : null,
      final_approved_role: decision === 'approved' ? buildFinalApproverRole(actorRecipient) : null,
      approved_at: decision === 'approved' ? decisionAt : null,
      rejected_at: decision === 'rejected' ? decisionAt : null,
    };

    const { data: reviewedRequest, error: reviewError } = await adminClient
      .from('hrm_regularization_requests')
      .update(parentPayload)
      .eq('id', id)
      .select('*')
      .single();

    if (reviewError || !reviewedRequest) {
      return NextResponse.json({ error: reviewError?.message || 'Failed to update regularization request' }, { status: 500 });
    }

    const recipientUpdates = recipients.map((recipient) => {
      if (recipient.id === actorRecipient.id) {
        return adminClient
          .from('hrm_regularization_request_recipients')
          .update({ decision_status: decision, decision_at: decisionAt, updated_at: decisionAt })
          .eq('id', recipient.id);
      }

      if (recipient.recipient_type === 'approver' && recipient.decision_status === 'pending') {
        return adminClient
          .from('hrm_regularization_request_recipients')
          .update({ decision_status: 'skipped', updated_at: decisionAt })
          .eq('id', recipient.id);
      }

      return adminClient
        .from('hrm_regularization_request_recipients')
        .update({ updated_at: decisionAt })
        .eq('id', recipient.id);
    });

    await Promise.all(recipientUpdates);

    if (decision === 'approved') {
      const { data: existingAttendance } = await adminClient
        .from('hrm_attendance')
        .select('*')
        .eq('employee_id', regularizationRequest.employee_id)
        .eq('date', regularizationRequest.date)
        .maybeSingle();

      const finalCheckInAt = reviewedRequest.requested_check_in
        ? createTimestampForAttendanceDate(regularizationRequest.date, reviewedRequest.requested_check_in)
        : existingAttendance?.check_in || null;
      const finalCheckOutAt = reviewedRequest.requested_check_out
        ? createTimestampForAttendanceDate(regularizationRequest.date, reviewedRequest.requested_check_out)
        : existingAttendance?.check_out || null;
      const metrics = calculateAttendanceMetrics({
        checkInAt: finalCheckInAt,
        checkOutAt: finalCheckOutAt,
      });

      const finalAttendanceStatus = approvalOutcome === 'half_day' ? 'halfday' : 'present';
      const attendancePayload = {
        employee_id: regularizationRequest.employee_id,
        date: regularizationRequest.date,
        check_in: finalCheckInAt,
        check_out: finalCheckOutAt,
        status: finalAttendanceStatus,
        late_in_minutes: metrics.lateInMinutes,
        early_out_minutes: metrics.earlyOutMinutes,
        work_hours_minutes: metrics.workHoursMinutes,
        source: 'manual',
        is_regularized: true,
        regularization_result: approvalOutcome,
        notes: appendAttendanceNote(
          existingAttendance?.notes,
          `Attendance regularization approved as ${approvalOutcome === 'half_day' ? 'half day' : 'full day'}.`
        ),
      };

      if (existingAttendance?.id) {
        await adminClient.from('hrm_attendance').update(attendancePayload).eq('id', existingAttendance.id);
      } else {
        await adminClient.from('hrm_attendance').insert(attendancePayload);
      }
    }

    return NextResponse.json({ request: reviewedRequest }, { status: 200 });
  } catch (error) {
    console.error('Error reviewing regularization request:', error);
    return NextResponse.json({ error: error.message || 'Failed to review regularization request' }, { status: 500 });
  }
}
