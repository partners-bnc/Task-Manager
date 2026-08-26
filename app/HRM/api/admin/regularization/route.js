import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { mapRegularizationItem } from '@/utils/regularization';

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

function isInboxApprover(recipient, authContext) {
  return (
    recipient.recipient_type === 'approver' &&
    recipient.recipient_role === 'hr_admin' &&
    recipient.recipient_auth_user_id === authContext.userId
  );
}

function isInboxCc(recipient, authContext) {
  return recipient.recipient_type === 'cc' && recipient.recipient_auth_user_id === authContext.userId;
}

function isMissingRegularizationSchemaError(error) {
  const message = error?.message || '';
  return (
    (message.includes('hrm_regularization_requests') || message.includes('hrm_regularization_request_recipients')) &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function groupRecipientsByRequestId(rows = []) {
  return rows.reduce((map, row) => {
    const key = row.request_id;
    if (!key) {
      return map;
    }
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(row);
    return map;
  }, {});
}

function formatCurrentStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }
  if (normalized === 'halfday' || normalized === 'half_day') {
    return 'Half Day';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function GET() {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { data: rows, error } = await adminClient
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
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingRegularizationSchemaError(error)) {
        return NextResponse.json({ pendingForMe: [], ccItems: [], history: [], setupPending: true }, { status: 200 });
      }
      return NextResponse.json({ error: error.message || 'Failed to load regularization inbox' }, { status: 500 });
    }

    const requestIds = (rows || []).map((row) => row.id).filter(Boolean);
    let recipientsByRequestId = {};

    if (requestIds.length > 0) {
      let recipientRows = [];
      const chunkSize = 100;
      for (let i = 0; i < requestIds.length; i += chunkSize) {
        const chunk = requestIds.slice(i, i + chunkSize);
        const { data: chunkRows, error: recipientError } = await adminClient
          .from('hrm_regularization_request_recipients')
          .select('*')
          .in('request_id', chunk);

        if (recipientError) {
          if (isMissingRegularizationSchemaError(recipientError)) {
            return NextResponse.json({ pendingForMe: [], ccItems: [], history: [], setupPending: true }, { status: 200 });
          }
          return NextResponse.json({ error: recipientError.message || 'Failed to load regularization recipients' }, { status: 500 });
        }
        if (chunkRows) {
          recipientRows = recipientRows.concat(chunkRows);
        }
      }

      recipientsByRequestId = groupRecipientsByRequestId(recipientRows);
    }

    const pendingForMe = [];
    const ccItems = [];
    const history = [];

    for (const row of rows || []) {
      const recipients = recipientsByRequestId[row.id] || [];
      const approverRecipient = recipients.find((recipient) => isInboxApprover(recipient, auth.authContext));
      const ccRecipient = recipients.find((recipient) => isInboxCc(recipient, auth.authContext));
      const mapped = {
        ...mapRegularizationItem({ ...row, recipients }, {
          currentStatusLabel: formatCurrentStatusLabel(row.current_attendance_status),
          canReview: Boolean(approverRecipient && String(row.status || '').toLowerCase() === 'pending'),
        }),
        employeeName: row.employee?.name || 'Employee',
        employeeEmail: row.employee?.email || '',
        employeeCode: row.employee?.employee_id || '',
      };

      if (approverRecipient && String(row.status || '').toLowerCase() === 'pending' && approverRecipient.decision_status === 'pending') {
        pendingForMe.push(mapped);
        continue;
      }

      if (ccRecipient && String(row.status || '').toLowerCase() === 'pending') {
        ccItems.push(mapped);
      }

      if ((approverRecipient || ccRecipient) && String(row.status || '').toLowerCase() !== 'pending') {
        history.push(mapped);
      }
    }

    return NextResponse.json(
      {
        pendingForMe,
        ccItems,
        history,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading HR regularization inbox:', error);
    return NextResponse.json({ error: error.message || 'Failed to load regularization inbox' }, { status: 500 });
  }
}
