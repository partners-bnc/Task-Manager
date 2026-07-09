import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';

export const EXPENSE_CLAIM_STATUSES = ['submitted', 'needs_changes', 'approved', 'rejected'];
export const EXPENSE_REVIEW_ACTIONS = ['submitted', 'needs_changes', 'resubmitted', 'approved', 'rejected'];
export const EXPENSE_REVIEWER_ROLES = ['employee', 'hr_admin'];
export const EXPENSE_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
export const EXPENSE_CATEGORIES = [
  'travel',
  'lodging',
  'meals',
  'fuel',
  'client_meeting',
  'office_supplies',
  'internet_phone',
  'training',
  'software',
  'other',
];
export const HRM_EXPENSE_FILES_BUCKET = 'hrm-expense-files';
export const HRM_EXPENSE_FILE_SIZE_LIMIT = 10 * 1024 * 1024;
export const HRM_EXPENSE_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function normalizeExpenseStatus(status) {
  return String(status || '').trim().toLowerCase();
}

export function formatExpenseStatusLabel(status) {
  const normalized = normalizeExpenseStatus(status);
  if (normalized === 'needs_changes') return 'Needs Changes';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatExpenseCategoryLabel(category) {
  const normalized = String(category || '').trim().toLowerCase();
  if (!normalized) return 'Other';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function sanitizeStorageFileName(fileName = '') {
  return String(fileName)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120) || 'file';
}

export function isMissingExpenseSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (message.includes('hrm_expense_claim') || message.includes('hrm_expense')) &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

export function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

export async function ensureExpenseFilesBucketAccessible() {
  const { error } = await adminClient.storage.from(HRM_EXPENSE_FILES_BUCKET).list('', { limit: 1 });
  if (error) {
    if (isBucketNotFoundError(error)) {
      throw new Error('Expense files bucket is missing. Apply the expense claim migration first.');
    }
    throw new Error(error.message || 'Expense files bucket is not accessible.');
  }
}

export function validateExpenseUpload(file) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('A valid receipt file is required.');
  }

  if (file.size > HRM_EXPENSE_FILE_SIZE_LIMIT) {
    throw new Error(`${file.name} exceeds the 10 MB file size limit.`);
  }

  if (file.type && !HRM_EXPENSE_ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${file.name} is not a supported file type.`);
  }
}

export async function requireExpenseActor() {
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

  const actor = buildExpenseActor(authContext);
  if (!actor) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { actor, authContext };
}

export function buildExpenseActor(authContext) {
  if (!authContext?.userId) return null;

  if (authContext.accountType === 'hr_admin' && authContext.hrAdmin) {
    return {
      authUserId: authContext.userId,
      employeeId: null,
      role: 'hr_admin',
      name: authContext.hrAdmin.name || authContext.user?.name || authContext.user?.email || 'HR Admin',
      email: authContext.hrAdmin.email || authContext.user?.email || '',
      employeeCode: '',
      avatarUrl: authContext.user?.avatarUrl || '',
      isAdmin: true,
      canCreateClaims: false,
    };
  }

  if (authContext.accountType === 'employee' && hasLinkedEmployeeAccess(authContext)) {
    return {
      authUserId: authContext.userId,
      employeeId: authContext.employee.id,
      role: 'employee',
      name: authContext.employee.name || authContext.user?.name || authContext.user?.email || 'Employee',
      email: authContext.employee.email || authContext.user?.email || '',
      employeeCode: authContext.employee.employee_id || '',
      avatarUrl: authContext.employee.profile_picture_url || authContext.user?.avatarUrl || '',
      isAdmin: false,
      canCreateClaims: true,
    };
  }

  return null;
}

export async function listExpensePeople() {
  const [hrAdminsResult, employeesResult] = await Promise.all([
    adminClient
      .from('privileged_accounts')
      .select('id, auth_user_id, name, email, status')
      .eq('role', 'hr_admin')
      .eq('status', 'Active')
      .order('name', { ascending: true }),
    adminClient
      .from('hrm_employees')
      .select('id, auth_user_id, employee_id, name, email, role, profile_picture_url')
      .order('name', { ascending: true }),
  ]);

  if (hrAdminsResult.error) throw new Error(hrAdminsResult.error.message || 'Failed to load HR admins');
  if (employeesResult.error) throw new Error(employeesResult.error.message || 'Failed to load employees');

  const hrAdmins = hrAdminsResult.data || [];
  const employees = employeesResult.data || [];
  const adminAuthIds = new Set(hrAdmins.map((row) => row.auth_user_id).filter(Boolean));

  const people = [
    ...hrAdmins
      .filter((row) => row.auth_user_id)
      .map((row) => ({
        authUserId: row.auth_user_id,
        employeeId: null,
        role: 'hr_admin',
        name: row.name || 'HR Admin',
        email: row.email || '',
        employeeCode: '',
        avatarUrl: '',
      })),
    ...employees
      .filter((row) => row.auth_user_id && !adminAuthIds.has(row.auth_user_id))
      .map((row) => ({
        authUserId: row.auth_user_id,
        employeeId: row.id,
        role: 'employee',
        name: row.name || row.email || 'Employee',
        email: row.email || '',
        employeeCode: row.employee_id || '',
        avatarUrl: row.profile_picture_url || '',
      })),
  ];

  return {
    people,
    byAuthUserId: new Map(people.map((person) => [person.authUserId, person])),
  };
}

export async function listExpenseReviewers(currentAuthUserId = '') {
  const directory = await listExpensePeople();
  return directory.people.filter(
    (person) =>
      EXPENSE_REVIEWER_ROLES.includes(person.role) &&
      person.authUserId &&
      person.authUserId !== currentAuthUserId
  );
}

export async function getReportingManagerSummary(employeeId) {
  let employeeRowResult = await adminClient
    .from('hrm_employees')
    .select('id, reporting_manager_id, reporting_super_admin_id')
    .eq('id', employeeId)
    .maybeSingle();

  const missingSuperAdminColumn = String(employeeRowResult.error?.message || '')
    .toLowerCase()
    .includes('reporting_super_admin_id');

  if (missingSuperAdminColumn) {
    employeeRowResult = await adminClient
      .from('hrm_employees')
      .select('id, reporting_manager_id')
      .eq('id', employeeId)
      .maybeSingle();
  }

  const { data: employeeRow, error: employeeError } = employeeRowResult;
  if (employeeError) {
    throw new Error(employeeError.message || 'Failed to load reporting manager');
  }

  if (employeeRow?.reporting_manager_id) {
    const { data: managerRow, error: managerError } = await adminClient
      .from('hrm_employees')
      .select('id, auth_user_id, employee_id, name, email, profile_picture_url')
      .eq('id', employeeRow.reporting_manager_id)
      .maybeSingle();

    if (managerError) {
      throw new Error(managerError.message || 'Failed to load reporting manager');
    }

    if (managerRow) {
      return {
        id: managerRow.id,
        authUserId: managerRow.auth_user_id || '',
        employeeId: managerRow.employee_id || '',
        role: 'employee',
        name: managerRow.name || '',
        email: managerRow.email || '',
        avatarUrl: managerRow.profile_picture_url || '',
      };
    }
  }

  if (employeeRow?.reporting_super_admin_id) {
    const { data: superAdminRow, error: superAdminError } = await adminClient
      .from('privileged_accounts')
      .select('id, auth_user_id, name, email')
      .eq('role', 'super_admin')
      .eq('id', employeeRow.reporting_super_admin_id)
      .maybeSingle();

    if (superAdminError) {
      throw new Error(superAdminError.message || 'Failed to load reporting super admin');
    }

    if (superAdminRow) {
      return {
        id: superAdminRow.id,
        authUserId: superAdminRow.auth_user_id || '',
        employeeId: '',
        role: 'hr_admin',
        name: superAdminRow.name || '',
        email: superAdminRow.email || '',
        avatarUrl: '',
      };
    }
  }

  return null;
}

export function parseExpenseMultipart(formData, key = 'payload') {
  const rawValue = formData.get(key);
  if (typeof rawValue !== 'string' || !rawValue.trim()) return {};

  try {
    return JSON.parse(rawValue);
  } catch {
    throw new Error('Invalid expense request payload.');
  }
}

export function parseExpenseItems(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      id: typeof item?.id === 'string' ? item.id.trim() : '',
      clientId:
        (typeof item?.clientId === 'string' && item.clientId.trim()) ||
        (typeof item?.id === 'string' && item.id.trim()) ||
        crypto.randomUUID(),
      expenseDate: typeof item?.expenseDate === 'string' ? item.expenseDate.trim() : '',
      category: typeof item?.category === 'string' ? item.category.trim().toLowerCase() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : '',
      vendorName: typeof item?.vendorName === 'string' ? item.vendorName.trim() : '',
      amount: Number(item?.amount || 0),
    }))
    .filter((item) => item.expenseDate || item.description || item.amount || item.vendorName || item.category);
}

export function validateExpenseClaimPayload({ title, purpose, currency, reviewerAuthUserId, items, reviewerOptions }) {
  if (!String(title || '').trim()) {
    throw new Error('Claim title is required.');
  }
  if (!String(purpose || '').trim()) {
    throw new Error('Business purpose is required.');
  }
  if (!EXPENSE_CURRENCIES.includes(String(currency || '').trim().toUpperCase())) {
    throw new Error('Currency is invalid.');
  }
  if (!reviewerAuthUserId) {
    throw new Error('Select one reviewer for this claim.');
  }

  const reviewer = reviewerOptions.find((item) => item.authUserId === reviewerAuthUserId);
  if (!reviewer) {
    throw new Error('Selected reviewer is invalid.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Add at least one expense item.');
  }

  items.forEach((item, index) => {
    if (!item.expenseDate) {
      throw new Error(`Expense date is required for item ${index + 1}.`);
    }
    if (!EXPENSE_CATEGORIES.includes(item.category)) {
      throw new Error(`Category is invalid for item ${index + 1}.`);
    }
    if (!item.description) {
      throw new Error(`Description is required for item ${index + 1}.`);
    }
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      throw new Error(`Amount must be greater than zero for item ${index + 1}.`);
    }
  });

  return reviewer;
}

export function calculateExpenseTotal(items = []) {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return Number(total.toFixed(2));
}

export function groupByKey(rows = [], keyName) {
  return rows.reduce((map, row) => {
    const key = row?.[keyName];
    if (!key) return map;
    if (!map[key]) map[key] = [];
    map[key].push(row);
    return map;
  }, {});
}

export function extractExpenseFileMap(formData) {
  const fileMap = new Map();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('files:') || !(value instanceof File) || value.size <= 0) {
      continue;
    }

    const clientId = key.slice('files:'.length);
    if (!clientId) continue;
    if (!fileMap.has(clientId)) fileMap.set(clientId, []);
    fileMap.get(clientId).push(value);
  }

  return fileMap;
}

export async function uploadExpenseFiles({ claimId, itemId, files = [], actor }) {
  if (!Array.isArray(files) || files.length === 0) return [];

  await ensureExpenseFilesBucketAccessible();

  const uploadedPaths = [];
  const attachments = [];

  try {
    for (const file of files) {
      validateExpenseUpload(file);
      const attachmentId = crypto.randomUUID();
      const safeName = sanitizeStorageFileName(file.name);
      const storagePath = `expense-claims/${claimId}/${itemId || 'claim'}/${attachmentId}-${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage.from(HRM_EXPENSE_FILES_BUCKET).upload(storagePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message || `Failed to upload ${file.name}`);
      }

      uploadedPaths.push(storagePath);
      attachments.push({
        id: attachmentId,
        claim_id: claimId,
        claim_item_id: itemId || null,
        file_name: file.name,
        file_path: storagePath,
        mime_type: file.type || null,
        file_size: file.size || null,
        uploaded_by_auth_user_id: actor.authUserId,
      });
    }

    return attachments;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await adminClient.storage.from(HRM_EXPENSE_FILES_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export function withExpenseAttachmentUrls(attachments = []) {
  return attachments.map((attachment) => {
    const { data } = adminClient.storage.from(HRM_EXPENSE_FILES_BUCKET).getPublicUrl(attachment.file_path);
    return {
      id: attachment.id,
      claimId: attachment.claim_id,
      claimItemId: attachment.claim_item_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      createdAt: attachment.created_at,
      url: data?.publicUrl || '',
    };
  });
}

export function canActorViewExpenseClaim(claim, actor) {
  if (!claim || !actor?.authUserId) return false;
  return (
    claim.employee_auth_user_id === actor.authUserId ||
    claim.reviewer_auth_user_id === actor.authUserId ||
    actor.role === 'hr_admin'
  );
}

export function canActorEditExpenseClaim(claim, actor) {
  if (!claim || !actor?.authUserId) return false;
  return claim.employee_auth_user_id === actor.authUserId && normalizeExpenseStatus(claim.status) === 'needs_changes';
}

export function canActorReviewExpenseClaim(claim, actor) {
  if (!claim || !actor?.authUserId) return false;
  return (
    (claim.reviewer_auth_user_id === actor.authUserId || actor.role === 'hr_admin') &&
    normalizeExpenseStatus(claim.status) === 'submitted'
  );
}

export function mapExpenseClaimSummary(claim) {
  return {
    id: claim.id,
    claimNo: claim.claim_no,
    title: claim.title,
    purpose: claim.purpose,
    currency: claim.currency,
    totalAmount: Number(claim.total_amount || 0),
    status: claim.status,
    statusLabel: formatExpenseStatusLabel(claim.status),
    submittedAt: claim.submitted_at,
    reviewedAt: claim.reviewed_at,
    createdAt: claim.created_at,
    updatedAt: claim.updated_at,
    reviewNote: claim.review_note || '',
    reviewer: {
      authUserId: claim.reviewer_auth_user_id,
      employeeId: claim.reviewer_employee_id || null,
      role: claim.reviewer_role,
      name: claim.reviewer_name_snapshot,
      email: '',
      employeeCode: '',
      avatarUrl: '',
    },
    employee: {
      authUserId: claim.employee_auth_user_id,
      employeeId: claim.employee_id,
      role: 'employee',
      name: claim.employee_name_snapshot,
      email: '',
      employeeCode: claim.employee_code_snapshot || '',
      avatarUrl: '',
    },
    reportingManager: null,
    reportingManagerName: claim.reporting_manager_name_snapshot || '',
  };
}

export function enrichExpenseClaimSummary(summary, directory, reportingManager = null) {
  const reviewer = directory?.byAuthUserId?.get(summary.reviewer.authUserId) || summary.reviewer;
  const employee = directory?.byAuthUserId?.get(summary.employee.authUserId) || summary.employee;

  return {
    ...summary,
    reviewer: {
      ...summary.reviewer,
      ...reviewer,
      name: reviewer?.name || summary.reviewer.name,
      email: reviewer?.email || summary.reviewer.email,
      employeeCode: reviewer?.employeeCode || summary.reviewer.employeeCode,
      avatarUrl: reviewer?.avatarUrl || summary.reviewer.avatarUrl || '',
    },
    employee: {
      ...summary.employee,
      ...employee,
      name: employee?.name || summary.employee.name,
      email: employee?.email || summary.employee.email,
      employeeCode: employee?.employeeCode || summary.employee.employeeCode,
      avatarUrl: employee?.avatarUrl || summary.employee.avatarUrl || '',
    },
    reportingManager:
      reportingManager ||
      (summary.reportingManagerName
        ? {
            authUserId: '',
            employeeId: null,
            role: 'employee',
            name: summary.reportingManagerName,
            email: '',
            employeeCode: '',
            avatarUrl: '',
          }
        : null),
  };
}

export function mapExpenseReviewRows(rows = [], byAuthUserId) {
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actionLabel: formatExpenseStatusLabel(row.action),
    note: row.note || '',
    createdAt: row.created_at,
    reviewer:
      byAuthUserId.get(row.reviewer_auth_user_id) || {
        authUserId: row.reviewer_auth_user_id,
        employeeId: null,
        role: row.reviewer_role,
        name: row.reviewer_role === 'hr_admin' ? 'HR Admin' : 'Employee',
        email: '',
        employeeCode: '',
        avatarUrl: '',
      },
  }));
}
