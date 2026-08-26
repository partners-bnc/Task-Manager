import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext, hasLinkedEmployeeAccess } from '@/utils/auth/context';
import { mapRegularizationItem } from '@/utils/regularization';

function isMissingSchemaError(error) {
  const message = error?.message || '';
  return (
    (message.includes('hrm_regularization_requests') || message.includes('hrm_regularization_request_recipients')) &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function groupRecipientsByRequestId(rows = []) {
  return rows.reduce((map, row) => {
    if (!row.request_id) return map;
    if (!map[row.request_id]) map[row.request_id] = [];
    map[row.request_id].push(row);
    return map;
  }, {});
}

function formatCurrentStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'halfday' || normalized === 'half_day') return 'Half Day';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    if (!hasLinkedEmployeeAccess(authContext)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeId = authContext.employee?.id;
    const authUserId = authContext.userId;

    // Find all recipient rows where this person is a reporting_manager approver
    const { data: myRecipientRows, error: recipientError } = await adminClient
      .from('hrm_regularization_request_recipients')
      .select('*')
      .eq('recipient_type', 'approver')
      .eq('recipient_role', 'reporting_manager')
      .or(`recipient_employee_id.eq.${employeeId},recipient_auth_user_id.eq.${authUserId}`);

    if (recipientError) {
      if (isMissingSchemaError(recipientError)) {
        return NextResponse.json({ pendingForMe: [], history: [], setupPending: true }, { status: 200 });
      }
      return NextResponse.json({ error: recipientError.message || 'Failed to load team requests' }, { status: 500 });
    }

    if (!myRecipientRows || myRecipientRows.length === 0) {
      return NextResponse.json({ pendingForMe: [], history: [] }, { status: 200 });
    }

    const requestIds = [...new Set(myRecipientRows.map((r) => r.request_id).filter(Boolean))];

    let rows = [];
    let allRecipientRows = [];
    const chunkSize = 100;

    for (let i = 0; i < requestIds.length; i += chunkSize) {
      const chunk = requestIds.slice(i, i + chunkSize);

      const [requestResult, recipientResult] = await Promise.all([
        adminClient
          .from('hrm_regularization_requests')
          .select(`
            *,
            employee:hrm_employees!hrm_regularization_requests_employee_id_fkey (
              id,
              employee_id,
              name,
              email
            )
          `)
          .in('id', chunk),
        adminClient
          .from('hrm_regularization_request_recipients')
          .select('*')
          .in('request_id', chunk)
      ]);

      if (requestResult.error) {
        return NextResponse.json({ error: requestResult.error.message || 'Failed to load requests' }, { status: 500 });
      }

      if (recipientResult.error) {
        return NextResponse.json({ error: recipientResult.error.message || 'Failed to load recipients' }, { status: 500 });
      }

      if (requestResult.data) {
        rows = rows.concat(requestResult.data);
      }
      if (recipientResult.data) {
        allRecipientRows = allRecipientRows.concat(recipientResult.data);
      }
    }

    // Sort requests by created_at descending
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recipientsByRequestId = groupRecipientsByRequestId(allRecipientRows);

    const pendingForMe = [];
    const history = [];

    for (const row of rows || []) {
      const recipients = recipientsByRequestId[row.id] || [];
      const myRecipient = myRecipientRows.find((r) => r.request_id === row.id);
      const isPending = String(row.status || '').toLowerCase() === 'pending';
      const canReview = Boolean(myRecipient && isPending && myRecipient.decision_status === 'pending');

      const mapped = {
        ...mapRegularizationItem({ ...row, recipients }, {
          currentStatusLabel: formatCurrentStatusLabel(row.current_attendance_status),
          canReview,
        }),
        employeeName: row.employee?.name || 'Employee',
        employeeEmail: row.employee?.email || '',
        employeeCode: row.employee?.employee_id || '',
      };

      if (isPending && myRecipient?.decision_status === 'pending') {
        pendingForMe.push(mapped);
      } else {
        history.push(mapped);
      }
    }

    return NextResponse.json({ pendingForMe, history }, { status: 200 });
  } catch (error) {
    console.error('Error loading team regularization:', error);
    return NextResponse.json({ error: error.message || 'Failed to load team regularization' }, { status: 500 });
  }
}
