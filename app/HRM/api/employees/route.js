import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { enqueueEmployeeCreatedEmail } from '@/utils/email-outbox';
import { ensureEmployeeAuthUser } from '@/utils/employee-auth';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  deriveEmploymentFields,
  normalizeCurrentStage,
  normalizeEmployeeType,
  normalizeEmploymentLifecycleStatus,
  toLegacyEmployeeStatus,
} from '@/utils/hrm-employment';

const EMAIL_NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
const EMPLOYEE_FILES_BUCKET = 'employee-files';
const DOCUMENT_TYPES = [
  'aadhaar_card',
  'pan_card',
  'passport',
  'appointment_letter',
  'experience_letter',
  'salary_slip',
];

const hrmEmployeeColumnSupportPromises = new Map();

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

  return { user, authContext };
}

async function supportsHrmEmployeeColumn(columnName) {
  if (!hrmEmployeeColumnSupportPromises.has(columnName)) {
    const promise = (async () => {
      const infoSchemaResult = await adminClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'hrm_employees')
        .eq('column_name', columnName)
        .limit(1);

      if (!infoSchemaResult.error && infoSchemaResult.data?.length) {
        return true;
      }

      const probeResult = await adminClient
        .from('hrm_employees')
        .select(columnName)
        .limit(1);

      if (!probeResult.error) {
        return true;
      }

      const message = String(probeResult.error?.message || '').toLowerCase();
      return !(
        message.includes('could not find') ||
        message.includes('column') ||
        message.includes('schema cache') ||
        message.includes('does not exist')
      );
    })().catch(() => false);

    hrmEmployeeColumnSupportPromises.set(columnName, promise);
  }

  const supported = await hrmEmployeeColumnSupportPromises.get(columnName);

  if (!supported) {
    hrmEmployeeColumnSupportPromises.delete(columnName);
  }

  return supported;
}

async function supportsReportingSuperAdminColumn() {
  return supportsHrmEmployeeColumn('reporting_super_admin_id');
}

async function getSupportedEmploymentColumns() {
  const supportEntries = await Promise.all([
    'employee_type',
    'employment_lifecycle_status',
    'current_stage',
    'terminated_at',
    'termination_reason',
    'access_disabled_at',
  ].map(async (columnName) => [columnName, await supportsHrmEmployeeColumn(columnName)]));

  return new Set(
    supportEntries
      .filter(([, supported]) => supported)
      .map(([columnName]) => columnName)
  );
}

function filterPayloadByAllowedColumns(payload, allowedColumns) {
  const nextPayload = { ...payload };

  Object.keys(nextPayload).forEach((columnName) => {
    if (!allowedColumns.has(columnName)) {
      delete nextPayload[columnName];
    }
  });

  return nextPayload;
}

function cleanText(value) {
  const nextValue = String(value || '').trim();
  return nextValue || null;
}

function cleanEmail(value) {
  const nextValue = cleanText(value);
  return nextValue ? nextValue.toLowerCase() : null;
}

function parseDate(value) {
  return cleanText(value);
}

function parseTime(value) {
  const nextValue = cleanText(value);
  return nextValue || null;
}

function parseFixedWorkTime(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function parseNumeric(value) {
  const nextValue = cleanText(value);
  if (!nextValue) return null;
  const parsed = Number(nextValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerValue(value) {
  const nextValue = cleanText(value);
  if (!nextValue) return null;
  const parsed = Number.parseInt(nextValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', 'yes', '1', 'on'].includes(normalized);
}

function getEmploymentInputValues(source = {}) {
  return {
    employeeType: source.employeeType ?? source.employee_type ?? null,
    lifecycleStatus:
      source.lifecycleStatus ??
      source.employmentLifecycleStatus ??
      source.employment_lifecycle_status ??
      source.employeeStatus ??
      source.status ??
      source.employee_status ??
      null,
    currentStage: source.currentStage ?? source.current_stage ?? null,
    terminationReason: source.terminationReason ?? source.termination_reason ?? null,
  };
}

function buildEmploymentColumns(source, existingEmployee = {}) {
  const input = getEmploymentInputValues(source);
  const current = deriveEmploymentFields(existingEmployee);
  const lifecycleStatus = normalizeEmploymentLifecycleStatus(
    input.lifecycleStatus,
    current.employmentLifecycleStatus
  );
  const currentStage =
    lifecycleStatus === 'terminated'
      ? 'none'
      : normalizeCurrentStage(input.currentStage, current.currentStage);
  const employeeType = normalizeEmployeeType(input.employeeType, current.employeeType);
  const legacyEmployeeStatus = toLegacyEmployeeStatus({
    employmentLifecycleStatus: lifecycleStatus,
    currentStage,
  });
  const isTerminated = lifecycleStatus === 'terminated';
  const now = new Date().toISOString();

  return {
    employee_type: employeeType,
    employment_lifecycle_status: lifecycleStatus,
    current_stage: currentStage,
    employee_status: legacyEmployeeStatus,
    terminated_at: isTerminated ? existingEmployee.terminated_at || now : null,
    termination_reason: isTerminated
      ? cleanText(input.terminationReason) || existingEmployee.termination_reason || null
      : null,
    access_disabled_at: isTerminated ? existingEmployee.access_disabled_at || now : null,
  };
}

function parseJsonArray(value) {
  const nextValue = cleanText(value);
  if (!nextValue) return [];

  try {
    const parsed = JSON.parse(nextValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeWorkingDays(value) {
  const parsed = parseJsonArray(value);
  return parsed
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeWorkingDaysInput(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  return normalizeWorkingDays(value);
}

function generateTempPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  let output = '';

  for (let index = 0; index < length; index += 1) {
    output += alphabet[randomValues[index] % alphabet.length];
  }

  return output;
}

async function uploadProfilePicture(profilePicture, employeeId) {
  if (!profilePicture || typeof profilePicture === 'string' || profilePicture.size <= 0) {
    return null;
  }

  const fileExt = profilePicture.name.split('.').pop();
  const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
  const bytes = await profilePicture.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from('employee-avatars')
    .upload(fileName, buffer, {
      contentType: profilePicture.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error('Failed to upload profile picture');
  }

  const { data: urlData } = adminClient.storage.from('employee-avatars').getPublicUrl(fileName);
  return urlData?.publicUrl || null;
}

async function removeProfilePicture(profilePictureUrl) {
  if (!profilePictureUrl) return;

  const filePath = profilePictureUrl.split('/employee-avatars/')[1] || profilePictureUrl.split('/').pop();
  if (!filePath) return;

  await adminClient.storage.from('employee-avatars').remove([filePath]);
}

async function ensureEmployeeFilesBucket() {
  const { data: buckets, error } = await adminClient.storage.listBuckets();
  if (error) {
    throw new Error(error.message || 'Failed to inspect storage buckets');
  }

  const exists = (buckets || []).some((bucket) => bucket.name === EMPLOYEE_FILES_BUCKET);
  if (exists) return;

  const { error: createError } = await adminClient.storage.createBucket(EMPLOYEE_FILES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
    throw new Error(createError.message || 'Failed to create employee files bucket');
  }
}

async function uploadEmployeeFile(file, employeeId, folder) {
  if (!file || typeof file === 'string' || file.size <= 0) {
    return null;
  }

  await ensureEmployeeFilesBucket();

  const fileExt = file.name.split('.').pop();
  const sanitizedFolder = String(folder || 'misc').replace(/[^a-z0-9/_-]+/gi, '-');
  const fileName = `${employeeId}/${sanitizedFolder}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from(EMPLOYEE_FILES_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || `Failed to upload ${file.name}`);
  }

  const { data: urlData } = adminClient.storage.from(EMPLOYEE_FILES_BUCKET).getPublicUrl(fileName);
  return {
    file_name: file.name,
    file_path: fileName,
    file_url: urlData?.publicUrl || '',
    file_size: file.size || null,
  };
}

async function ensureDepartmentId(name) {
  const normalizedName = cleanText(name);
  if (!normalizedName) return null;

  const { data: existing, error: existingError } = await adminClient
    .from('hrm_departments')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Failed to load department');
  }

  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await adminClient
    .from('hrm_departments')
    .insert({
      name: normalizedName,
      description: `Created from employee onboarding for ${normalizedName}`,
      is_active: true,
    })
    .select('id')
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || 'Failed to create department');
  }

  return created.id;
}

async function ensureDesignationId(title, departmentId) {
  const normalizedTitle = cleanText(title);
  if (!normalizedTitle) return null;

  let query = adminClient
    .from('hrm_designations')
    .select('id')
    .ilike('title', normalizedTitle)
    .limit(1);

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data: existing, error: existingError } = await query.maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Failed to load designation');
  }

  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await adminClient
    .from('hrm_designations')
    .insert({
      title: normalizedTitle,
      department_id: departmentId,
      is_active: true,
    })
    .select('id')
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || 'Failed to create designation');
  }

  return created.id;
}

async function ensureShiftId(name, startTime, endTime) {
  const normalizedName = cleanText(name);
  if (!normalizedName) return null;

  const { data: existing, error: existingError } = await adminClient
    .from('hrm_shifts')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Failed to load shift');
  }

  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await adminClient
    .from('hrm_shifts')
    .insert({
      name: normalizedName,
      start_time: parseTime(startTime),
      end_time: parseTime(endTime),
      is_active: true,
    })
    .select('id')
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || 'Failed to create shift');
  }

  return created.id;
}

function validateEmployeeIdentityFields({ aadhaarNumber, panNumber }) {
  if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
    throw new Error('Aadhaar number must be exactly 12 digits');
  }

  if (panNumber && !/^[A-Z0-9]{10}$/.test(panNumber)) {
    throw new Error('PAN number must be exactly 10 characters');
  }
}

async function resolveReportingToEmployeeId(value) {
  const normalizedValue = cleanText(value);
  if (!normalizedValue) return null;

  const { data: employeeById } = await adminClient
    .from('hrm_employees')
    .select('id')
    .eq('id', normalizedValue)
    .maybeSingle();

  if (employeeById?.id) return employeeById.id;

  const { data: employeeByEmail } = await adminClient
    .from('hrm_employees')
    .select('id')
    .eq('email', normalizedValue.toLowerCase())
    .maybeSingle();

  if (employeeByEmail?.id) return employeeByEmail.id;

  const { data: employeeByCode } = await adminClient
    .from('hrm_employees')
    .select('id')
    .eq('employee_id', normalizedValue)
    .maybeSingle();

  if (employeeByCode?.id) return employeeByCode.id;

  const { data: employeeByName } = await adminClient
    .from('hrm_employees')
    .select('id')
    .ilike('name', normalizedValue)
    .limit(1)
    .maybeSingle();

  return employeeByName?.id || null;
}

async function resolveReportingTarget(value) {
  const normalizedValue = cleanText(value);
  if (!normalizedValue) {
    return {
      reportingManagerId: null,
      reportingSuperAdminId: null,
    };
  }

  if (normalizedValue.startsWith('employee:')) {
    return {
      reportingManagerId: normalizedValue.slice('employee:'.length) || null,
      reportingSuperAdminId: null,
    };
  }

  if (normalizedValue.startsWith('super_admin:')) {
    return {
      reportingManagerId: null,
      reportingSuperAdminId: normalizedValue.slice('super_admin:'.length) || null,
    };
  }

  return {
    reportingManagerId: await resolveReportingToEmployeeId(normalizedValue),
    reportingSuperAdminId: null,
  };
}

async function upsertProfileRecord({ authUserId, employeeId, email, fullName, phone }) {
  const payload = {
    id: authUserId,
    employee_id: employeeId,
    email,
    role: 'employee',
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient.from('hrm_profiles').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message || 'Failed to sync profile record');
  }
}

async function syncAuthUserMetadata({ authUserId, fullName, employeeCode, employeeUuid, email }) {
  const { error } = await adminClient.auth.admin.updateUserById(authUserId, {
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || '',
      employee_id: employeeCode || '',
      employee_uuid: employeeUuid,
      role: 'employee',
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to sync auth metadata');
  }
}

async function replaceEmployeeEducation(employeeId, educationRows) {
  await adminClient.from('hrm_employee_education').delete().eq('employee_id', employeeId);
  if (!educationRows.length) return;

  const { error } = await adminClient.from('hrm_employee_education').insert(
    educationRows.map((row) => ({
      employee_id: employeeId,
      ...row,
      updated_at: new Date().toISOString(),
    }))
  );

  if (error) {
    throw new Error(error.message || 'Failed to save education records');
  }
}

async function replaceEmployeeCertifications(employeeId, certifications) {
  await adminClient.from('hrm_employee_certifications').delete().eq('employee_id', employeeId);
  if (!certifications.length) return;

  const { error } = await adminClient.from('hrm_employee_certifications').insert(
    certifications.map((row) => ({
      employee_id: employeeId,
      ...row,
      updated_at: new Date().toISOString(),
    }))
  );

  if (error) {
    throw new Error(error.message || 'Failed to save certification records');
  }
}

async function replaceEmployeeDocuments(employeeId, documents) {
  await adminClient.from('hrm_employee_documents').delete().eq('employee_id', employeeId);
  if (!documents.length) return;

  const { error } = await adminClient.from('hrm_employee_documents').insert(
    documents.map((row) => ({
      employee_id: employeeId,
      ...row,
      updated_at: new Date().toISOString(),
    }))
  );

  if (error) {
    throw new Error(error.message || 'Failed to save employee documents');
  }
}

async function upsertModuleAccess(employeeId, payload) {
  const { error } = await adminClient
    .from('hrm_module_access')
    .upsert(
      {
        employee_id: employeeId,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to save module access');
  }
}

async function fetchEmployeeFormMeta() {
  const [employeesResult, superAdminsResult, departmentsResult, designationsResult] = await Promise.all([
    adminClient
      .from('hrm_employees')
      .select('id, employee_id, name, email')
      .order('created_at', { ascending: false }),
    adminClient
      .from('super_admins')
      .select('id, auth_user_id, name, email, status')
      .eq('status', 'Active')
      .order('name', { ascending: true }),
    adminClient
      .from('hrm_departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    adminClient
      .from('hrm_designations')
      .select('id, title, department_id')
      .eq('is_active', true)
      .order('title', { ascending: true }),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message || 'Failed to load employees');
  if (superAdminsResult.error) throw new Error(superAdminsResult.error.message || 'Failed to load super admins');
  if (departmentsResult.error) throw new Error(departmentsResult.error.message || 'Failed to load departments');
  if (designationsResult.error) throw new Error(designationsResult.error.message || 'Failed to load designations');
  return {
    employeeOptions: employeesResult.data || [],
    superAdminOptions: superAdminsResult.data || [],
    departments: departmentsResult.data || [],
    designations: designationsResult.data || [],
  };
}

function pickRelationRecord(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value && typeof value === 'object' ? value : null;
}

function pickFirstText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return '';
}

async function attachCreatorNames(rows = []) {
  const creatorIds = [...new Set((rows || []).map((row) => row.created_by).filter(Boolean))];
  const employeeAuthIds = [...new Set((rows || []).map((row) => row.auth_user_id).filter(Boolean))];
  const managerIds = [...new Set((rows || []).map((row) => row.reporting_manager_id).filter(Boolean))];
  const superAdminIds = [...new Set((rows || []).map((row) => row.reporting_super_admin_id).filter(Boolean))];
  const departmentIds = [...new Set((rows || []).map((row) => row.department_id).filter(Boolean))];
  const designationIds = [...new Set((rows || []).map((row) => row.designation_id).filter(Boolean))];
  const profileIds = [...new Set([...creatorIds, ...employeeAuthIds])];

  const [profilesResult, managersResult, superAdminsResult, departmentsResult, designationsResult] = await Promise.all([
    profileIds.length
      ? adminClient
          .from('hrm_profiles')
          .select('id, full_name, phone')
          .in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    managerIds.length
      ? adminClient
          .from('hrm_employees')
          .select('id, name, employee_id')
          .in('id', managerIds)
      : Promise.resolve({ data: [], error: null }),
    superAdminIds.length
      ? adminClient
          .from('super_admins')
          .select('id, name, email')
          .in('id', superAdminIds)
      : Promise.resolve({ data: [], error: null }),
    departmentIds.length
      ? adminClient
          .from('hrm_departments')
          .select('id, name')
          .in('id', departmentIds)
      : Promise.resolve({ data: [], error: null }),
    designationIds.length
      ? adminClient
          .from('hrm_designations')
          .select('id, title')
          .in('id', designationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message || 'Failed to load employee creators');
  }

  if (managersResult.error) {
    throw new Error(managersResult.error.message || 'Failed to load reporting managers');
  }

  if (superAdminsResult.error) {
    throw new Error(superAdminsResult.error.message || 'Failed to load reporting super admins');
  }

  if (departmentsResult.error) {
    throw new Error(departmentsResult.error.message || 'Failed to load employee departments');
  }

  if (designationsResult.error) {
    throw new Error(designationsResult.error.message || 'Failed to load employee designations');
  }

  const profileMap = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const managerMap = new Map((managersResult.data || []).map((manager) => [manager.id, manager]));
  const superAdminMap = new Map((superAdminsResult.data || []).map((superAdmin) => [superAdmin.id, superAdmin]));
  const departmentMap = new Map((departmentsResult.data || []).map((department) => [department.id, department.name || '']));
  const designationMap = new Map((designationsResult.data || []).map((designation) => [designation.id, designation.title || '']));

  return (rows || []).map((row) => {
    const employment = deriveEmploymentFields(row);
    const reportingManager = managerMap.get(row.reporting_manager_id) || null;
    const reportingSuperAdmin = superAdminMap.get(row.reporting_super_admin_id) || null;
    const resolvedReportingManagerName = reportingManager?.name || reportingSuperAdmin?.name || '';
    const resolvedReportingManagerEmployeeId = reportingManager?.employee_id || '';
    const resolvedReportingManagerValue = reportingManager?.id
      ? `employee:${reportingManager.id}`
      : reportingSuperAdmin?.id
        ? `super_admin:${reportingSuperAdmin.id}`
        : '';

    return {
      ...row,
      created_by_name: profileMap.get(row.created_by)?.full_name || '',
      reporting_manager_name: resolvedReportingManagerName,
      reporting_manager_employee_id: resolvedReportingManagerEmployeeId,
      reporting_manager_value: resolvedReportingManagerValue,
      reporting_manager_kind: reportingManager ? 'employee' : reportingSuperAdmin ? 'super_admin' : '',
      resolved_phone_number: pickFirstText(
        row.resolved_phone_number,
        row.mobile_phone,
        row.phone,
        row.mobile,
        row.alternate_phone,
        profileMap.get(row.auth_user_id)?.phone
      ),
      resolved_designation_title: pickFirstText(
        pickRelationRecord(row.designation)?.title,
        row.designation_title,
        designationMap.get(row.designation_id)
      ),
      resolved_department_name: pickFirstText(
        pickRelationRecord(row.department)?.name,
        row.department_name,
        departmentMap.get(row.department_id)
      ),
      resolved_employee_type: employment.employeeType,
      resolved_employment_lifecycle_status: employment.employmentLifecycleStatus,
      resolved_current_stage: employment.currentStage,
      resolved_employee_status: employment.legacyEmployeeStatus,
      directory_phone: pickFirstText(
        row.resolved_phone_number,
        row.mobile_phone,
        row.phone,
        row.mobile,
        row.alternate_phone,
        profileMap.get(row.auth_user_id)?.phone
      ),
      directory_designation: pickFirstText(
        pickRelationRecord(row.designation)?.title,
        row.designation_title,
        designationMap.get(row.designation_id)
      ),
      directory_department: pickFirstText(
        pickRelationRecord(row.department)?.name,
        row.department_name,
        departmentMap.get(row.department_id)
      ),
      directory_reporting_manager: resolvedReportingManagerName,
    };
  });
}

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeMeta = searchParams.get('includeMeta') === '1';
    const taskManagerOnly = searchParams.get('taskManagerOnly') === '1';

    if (id) {
      const { data: employee, error } = await adminClient
        .from('hrm_employees')
        .select(`
          *,
          department:hrm_departments (
            id,
            name
          ),
          designation:hrm_designations (
            id,
            title
          ),
          module_access:hrm_module_access!module_access_employee_id_fkey (*),
          education:hrm_employee_education (*),
          certifications:hrm_employee_certifications (*),
          documents:hrm_employee_documents (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      const [enrichedEmployee] = await attachCreatorNames([employee]);

      if (includeMeta) {
        const meta = await fetchEmployeeFormMeta();
        return NextResponse.json({ employee: enrichedEmployee, ...meta }, { status: 200 });
      }

      return NextResponse.json({ employee: enrichedEmployee }, { status: 200 });
    }

    const { data: employees, error } = await adminClient
      .from('hrm_employees')
      .select(`
        *,
        department:hrm_departments (
          id,
          name
        ),
        designation:hrm_designations (
          id,
          title
        ),
        module_access:hrm_module_access!module_access_employee_id_fkey (
          task_manager,
          hrm_admin,
          auditing,
          crm
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filteredEmployees = taskManagerOnly
      ? (employees || []).filter((employee) => {
          const access = Array.isArray(employee.module_access)
            ? employee.module_access[0]
            : employee.module_access;

          return access?.task_manager;
        })
      : employees || [];

    const enrichedEmployees = await attachCreatorNames(filteredEmployees);

    if (includeMeta) {
      const meta = await fetchEmployeeFormMeta();
      return NextResponse.json({ employees: enrichedEmployees, ...meta }, { status: 200 });
    }

    return NextResponse.json({ employees: enrichedEmployees }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /HRM/api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { authContext } = auth;
    const formData = await request.formData();

    const employeeId = cleanText(formData.get('employeeId'));
    const name = cleanText(formData.get('name'));
    const email = cleanEmail(formData.get('email'));
    const password = cleanText(formData.get('password'));
    const departmentName = cleanText(formData.get('department'));
    const designationTitle = cleanText(formData.get('designation'));
    const workingDays = normalizeWorkingDays(formData.get('workingDays'));
    const educationEntries = parseJsonArray(formData.get('educationEntries'));
    const certificationEntries = parseJsonArray(formData.get('certificationEntries'));

    if (!employeeId || !name || !email || !password || !departmentName || !designationTitle) {
      return NextResponse.json(
        { error: 'Employee ID, full name, email, password, department, and designation are required.' },
        { status: 400 }
      );
    }

    const reportingSuperAdminSupported = await supportsReportingSuperAdminColumn();
    const supportedEmploymentColumns = await getSupportedEmploymentColumns();
    const departmentId = await ensureDepartmentId(departmentName);
    const designationId = await ensureDesignationId(designationTitle, departmentId);
    const reportingTarget = await resolveReportingTarget(formData.get('reportingTo'));
    if (reportingTarget.reportingSuperAdminId && !reportingSuperAdminSupported) {
      return NextResponse.json(
        {
          error:
            'Reporting To cannot be saved as Super Admin yet because the hrm_employees.reporting_super_admin_id column is missing in the database. Please run the reporting super admin migration first.',
        },
        { status: 400 }
      );
    }
    const taskManagerEnabled = parseBoolean(formData.get('taskManagerAccess'));
    const providedPassword = password || generateTempPassword();
    const passwordHash = await bcrypt.hash(providedPassword, 10);
    const profilePictureUrl = await uploadProfilePicture(formData.get('profilePicture'), employeeId);
    const aadhaarNumber = cleanText(formData.get('aadhaarNumber'));
    const panNumber = cleanText(formData.get('panNumber'))?.toUpperCase() || null;

    validateEmployeeIdentityFields({ aadhaarNumber, panNumber });
    const employmentColumns = filterPayloadByAllowedColumns(
      buildEmploymentColumns(
        {
          employeeType: formData.get('employeeType'),
          lifecycleStatus: formData.get('lifecycleStatus') || formData.get('status'),
          currentStage: formData.get('currentStage'),
          terminationReason: formData.get('terminationReason'),
        },
        {}
      ),
      new Set(['employee_status', ...supportedEmploymentColumns])
    );

    const employeePayload = {
      employee_id: employeeId,
      name,
      role: 'employee',
      email,
      phone: cleanText(formData.get('phone')),
      personal_email: cleanEmail(formData.get('personalEmail')),
      date_of_birth: parseDate(formData.get('dateOfBirth')),
      blood_group: cleanText(formData.get('bloodGroup')),
      father_name: cleanText(formData.get('fatherName')),
      marital_status: cleanText(formData.get('maritalStatus')),
      marriage_date: parseDate(formData.get('marriageDate')),
      spouse_name: cleanText(formData.get('spouseName')),
      nationality: cleanText(formData.get('nationality')),
      residential_status: cleanText(formData.get('residentialStatus')),
      place_of_birth: cleanText(formData.get('placeOfBirth')),
      country_of_origin: cleanText(formData.get('countryOfOrigin')),
      religion: cleanText(formData.get('religion')),
      is_international: parseBoolean(formData.get('isInternational')),
      is_physically_challenged: parseBoolean(formData.get('isPhysicallyChallenged')),
      height_cm: parseNumeric(formData.get('heightCm')),
      weight_kg: parseNumeric(formData.get('weightKg')),
      hobby: cleanText(formData.get('hobby')),
      caste: cleanText(formData.get('caste')),
      address: cleanText(formData.get('address')),
      city: cleanText(formData.get('city')),
      district: cleanText(formData.get('district')),
      state: cleanText(formData.get('state')),
      country: cleanText(formData.get('country')),
      pincode: cleanText(formData.get('pincode')),
      alternate_phone: cleanText(formData.get('phone2')),
      mobile_phone: cleanText(formData.get('mobile')),
      date_of_joining: parseDate(formData.get('joinedOn')),
      confirmation_date: parseDate(formData.get('confirmationDate')),
      employee_status: employmentColumns.employee_status,
      probation_period_days: parseIntegerValue(formData.get('probationPeriodDays')),
      notice_period_days: parseIntegerValue(formData.get('noticePeriodDays')),
      current_company_experience: cleanText(formData.get('currentCompanyExperience')),
      previous_experience: cleanText(formData.get('previousExperience')),
      total_experience: cleanText(formData.get('totalExperience')),
      referred_by: cleanText(formData.get('referredBy')),
      department_id: departmentId,
      division: cleanText(formData.get('division')),
      designation_id: designationId,
      reporting_manager_id: reportingTarget.reportingManagerId,
      company: cleanText(formData.get('company')),
      shift_id: null,
      working_schedule_label: cleanText(formData.get('workingScheduleLabel')),
      working_days: workingDays,
      second_saturday_off: parseBoolean(formData.get('secondSaturdayOff')),
      working_hours_start: parseFixedWorkTime('10:00'),
      working_hours_end: parseFixedWorkTime('19:00'),
      aadhaar_number: aadhaarNumber,
      pan_number: panNumber,
      passport_number: cleanText(formData.get('passportNumber')),
      bank_account_number: cleanText(formData.get('bankAccountNumber')),
      bank_account_holder_name: cleanText(formData.get('bankAccountHolderName')),
      bank_ifsc: cleanText(formData.get('bankIfscCode')),
      bank_name: cleanText(formData.get('bankName')),
      password_hash: passwordHash,
      must_change_password: true,
      password_set_at: null,
      profile_picture_url: profilePictureUrl,
      auth_user_id: null,
      created_by: authContext.userId || null,
      updated_at: new Date().toISOString(),
    };

    Object.assign(employeePayload, employmentColumns);

    if (reportingSuperAdminSupported) {
      employeePayload.reporting_super_admin_id = reportingTarget.reportingSuperAdminId;
    }

    const { data: employeeRow, error: insertError } = await adminClient
      .from('hrm_employees')
      .insert(employeePayload)
      .select('*')
      .single();

    if (insertError || !employeeRow) {
      if (profilePictureUrl) {
        await removeProfilePicture(profilePictureUrl);
      }

      return NextResponse.json({ error: insertError?.message || 'Failed to create employee' }, { status: 500 });
    }

    try {
      const authUserId = await ensureEmployeeAuthUser(employeeRow, providedPassword);

      await adminClient
        .from('hrm_employees')
        .update({ auth_user_id: authUserId })
        .eq('id', employeeRow.id);

      await upsertProfileRecord({
        authUserId,
        employeeId,
        email,
        fullName: name,
        phone: employeePayload.phone || employeePayload.mobile_phone,
      });

      await syncAuthUserMetadata({
        authUserId,
        fullName: name,
        employeeCode: employeeId,
        employeeUuid: employeeRow.id,
        email,
      });

      const educationRows = [];
      for (const entry of educationEntries) {
        const level = cleanText(entry?.educationLevel);
        if (!level) continue;

        const file = formData.get(entry?.fileKey || '');
        const uploaded = await uploadEmployeeFile(file, employeeId, `education/${level}`);
        educationRows.push({
          education_level: level,
          institution_name: cleanText(entry?.institutionName),
          board_university: cleanText(entry?.boardUniversity),
          specialization: cleanText(entry?.specialization),
          passing_year: parseIntegerValue(entry?.passingYear),
          score: cleanText(entry?.score),
          degree_file_url: uploaded?.file_url || null,
          degree_file_path: uploaded?.file_path || null,
        });
      }
      await replaceEmployeeEducation(employeeRow.id, educationRows);

      const certificationRows = [];
      for (const entry of certificationEntries) {
        const certificationName = cleanText(entry?.certificationName);
        if (!certificationName) continue;

        const file = formData.get(entry?.fileKey || '');
        const uploaded = await uploadEmployeeFile(file, employeeId, 'certifications');
        certificationRows.push({
          certification_name: certificationName,
          issuer: cleanText(entry?.issuer),
          issued_year: parseIntegerValue(entry?.issuedYear),
          certificate_file_url: uploaded?.file_url || null,
          certificate_file_path: uploaded?.file_path || null,
        });
      }
      await replaceEmployeeCertifications(employeeRow.id, certificationRows);

      const documentRows = [];
      for (const documentType of DOCUMENT_TYPES) {
        const file = formData.get(`document_${documentType}`);
        const uploaded = await uploadEmployeeFile(file, employeeId, `documents/${documentType}`);
        if (uploaded) {
          documentRows.push({
            document_type: documentType,
            ...uploaded,
          });
        }
      }
      await replaceEmployeeDocuments(employeeRow.id, documentRows);

      await upsertModuleAccess(employeeRow.id, {
        task_manager: taskManagerEnabled,
        task_manager_role: null,
        auditing: false,
        auditing_role: null,
        crm: false,
        crm_role: null,
        hrm_admin: false,
        granted_by: authContext.employee?.id || null,
        granted_at: new Date().toISOString(),
      });

      try {
        await enqueueEmployeeCreatedEmail({
          employeeId: employeeRow.id,
          recipientEmail: employeeRow.email,
          employeeName: employeeRow.name,
          username: employeeRow.email,
          tempPassword: providedPassword,
        });
      } catch (emailError) {
        console.error('Failed to enqueue employee onboarding email:', emailError);
      }

      return NextResponse.json(
        {
          message: EMAIL_NOTIFICATIONS_ENABLED
            ? 'Employee added successfully. Credentials email has been queued.'
            : 'Employee added successfully. Credentials email is currently paused.',
          employee: { ...employeeRow, auth_user_id: authUserId },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error provisioning employee:', error);
      await adminClient.from('hrm_module_access').delete().eq('employee_id', employeeRow.id);
      await adminClient.from('hrm_employee_documents').delete().eq('employee_id', employeeRow.id);
      await adminClient.from('hrm_employee_certifications').delete().eq('employee_id', employeeRow.id);
      await adminClient.from('hrm_employee_education').delete().eq('employee_id', employeeRow.id);
      await adminClient.from('hrm_employees').delete().eq('id', employeeRow.id);

      if (profilePictureUrl) {
        await removeProfilePicture(profilePictureUrl);
      }

      return NextResponse.json(
        { error: error.message || 'Failed to provision employee account' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /HRM/api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { authContext } = auth;
    const body = await request.json();
    const id = cleanText(body?.id);

    if (!id) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    const { data: existingEmployee, error: existingEmployeeError } = await adminClient
      .from('hrm_employees')
      .select('*')
      .eq('id', id)
      .single();

    if (existingEmployeeError || !existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { data: currentModuleAccess } = await adminClient
      .from('hrm_module_access')
      .select('*')
      .eq('employee_id', id)
      .maybeSingle();

    const reportingSuperAdminSupported = await supportsReportingSuperAdminColumn();
    const supportedEmploymentColumns = await getSupportedEmploymentColumns();
    const name = body?.name !== undefined ? cleanText(body.name) : undefined;
    const email = body?.email !== undefined ? cleanEmail(body.email) : undefined;
    const role = body?.role !== undefined ? cleanText(body.role) : undefined;
    const employeeId = body?.employeeId !== undefined ? cleanText(body.employeeId) : undefined;
    const departmentName = body?.department !== undefined ? cleanText(body.department) : undefined;
    const designationTitle = body?.designation !== undefined ? cleanText(body.designation) : undefined;
    const reportingTo = body?.reportingTo !== undefined ? body.reportingTo : undefined;
    const taskManagerAccess = body?.taskManagerAccess !== undefined ? parseBoolean(body.taskManagerAccess) : undefined;

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (email !== undefined) payload.email = email;
    if (role !== undefined) payload.role = role;
    if (employeeId !== undefined) payload.employee_id = employeeId;

    const nextDepartmentId =
      departmentName !== undefined
        ? (departmentName ? await ensureDepartmentId(departmentName) : null)
        : existingEmployee.department_id;

    if (departmentName !== undefined) {
      payload.department_id = nextDepartmentId;
    }

    if (designationTitle !== undefined) {
      payload.designation_id = designationTitle
        ? await ensureDesignationId(designationTitle, nextDepartmentId)
        : null;
    }

    if (reportingTo !== undefined) {
      const reportingTarget = await resolveReportingTarget(reportingTo);
      if (reportingTarget.reportingSuperAdminId && !reportingSuperAdminSupported) {
        return NextResponse.json(
          {
            error:
              'Reporting To cannot be saved as Super Admin yet because the hrm_employees.reporting_super_admin_id column is missing in the database. Please run the reporting super admin migration first.',
          },
          { status: 400 }
        );
      }
      payload.reporting_manager_id = reportingTarget.reportingManagerId;
      if (reportingSuperAdminSupported) {
        payload.reporting_super_admin_id = reportingTarget.reportingSuperAdminId;
      }
    }

    const simpleFieldMap = [
      ['phone', 'phone', cleanText],
      ['personalEmail', 'personal_email', cleanEmail],
      ['dateOfBirth', 'date_of_birth', parseDate],
      ['bloodGroup', 'blood_group', cleanText],
      ['fatherName', 'father_name', cleanText],
      ['maritalStatus', 'marital_status', cleanText],
      ['marriageDate', 'marriage_date', parseDate],
      ['spouseName', 'spouse_name', cleanText],
      ['nationality', 'nationality', cleanText],
      ['residentialStatus', 'residential_status', cleanText],
      ['placeOfBirth', 'place_of_birth', cleanText],
      ['countryOfOrigin', 'country_of_origin', cleanText],
      ['religion', 'religion', cleanText],
      ['isInternational', 'is_international', parseBoolean],
      ['isPhysicallyChallenged', 'is_physically_challenged', parseBoolean],
      ['heightCm', 'height_cm', parseNumeric],
      ['weightKg', 'weight_kg', parseNumeric],
      ['hobby', 'hobby', cleanText],
      ['caste', 'caste', cleanText],
      ['address', 'address', cleanText],
      ['city', 'city', cleanText],
      ['district', 'district', cleanText],
      ['state', 'state', cleanText],
      ['country', 'country', cleanText],
      ['pincode', 'pincode', cleanText],
      ['phone2', 'alternate_phone', cleanText],
      ['mobile', 'mobile_phone', cleanText],
      ['joinedOn', 'date_of_joining', parseDate],
      ['confirmationDate', 'confirmation_date', parseDate],
      ['probationPeriodDays', 'probation_period_days', parseIntegerValue],
      ['noticePeriodDays', 'notice_period_days', parseIntegerValue],
      ['referredBy', 'referred_by', cleanText],
      ['currentCompanyExperience', 'current_company_experience', cleanText],
      ['previousExperience', 'previous_experience', cleanText],
      ['totalExperience', 'total_experience', cleanText],
      ['division', 'division', cleanText],
      ['company', 'company', cleanText],
      ['workingScheduleLabel', 'working_schedule_label', cleanText],
      ['secondSaturdayOff', 'second_saturday_off', parseBoolean],
      ['aadhaarNumber', 'aadhaar_number', cleanText],
      ['panNumber', 'pan_number', (value) => cleanText(value)?.toUpperCase() || null],
      ['passportNumber', 'passport_number', cleanText],
      ['bankAccountNumber', 'bank_account_number', cleanText],
      ['bankAccountHolderName', 'bank_account_holder_name', cleanText],
      ['bankIfscCode', 'bank_ifsc', cleanText],
      ['bankName', 'bank_name', cleanText],
    ];

    for (const [bodyKey, columnKey, parser] of simpleFieldMap) {
      if (body?.[bodyKey] !== undefined) {
        payload[columnKey] = parser(body[bodyKey]);
      }
    }

    if (body?.workingDays !== undefined) {
      payload.working_days = normalizeWorkingDaysInput(body.workingDays);
    }

    const employmentInputs = getEmploymentInputValues(body);
    if (
      employmentInputs.employeeType !== null ||
      employmentInputs.lifecycleStatus !== null ||
      employmentInputs.currentStage !== null ||
      employmentInputs.terminationReason !== null
    ) {
      Object.assign(
        payload,
        filterPayloadByAllowedColumns(
          buildEmploymentColumns(body, existingEmployee),
          new Set(['employee_status', ...supportedEmploymentColumns])
        )
      );
    }

    validateEmployeeIdentityFields({
      aadhaarNumber:
        payload.aadhaar_number !== undefined ? payload.aadhaar_number : existingEmployee.aadhaar_number,
      panNumber:
        payload.pan_number !== undefined ? payload.pan_number : existingEmployee.pan_number,
    });

    if (Object.keys(payload).length === 0 && taskManagerAccess === undefined) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    const { data: employee, error } = await adminClient
      .from('hrm_employees')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (taskManagerAccess !== undefined) {
      await upsertModuleAccess(employee.id, {
        task_manager: taskManagerAccess,
        task_manager_role: currentModuleAccess?.task_manager_role || null,
        auditing: currentModuleAccess?.auditing || false,
        auditing_role: currentModuleAccess?.auditing_role || null,
        crm: currentModuleAccess?.crm || false,
        crm_role: currentModuleAccess?.crm_role || null,
        hrm_admin: currentModuleAccess?.hrm_admin || false,
        granted_by: currentModuleAccess?.granted_by || authContext.employee?.id || null,
        granted_at: currentModuleAccess?.granted_at || new Date().toISOString(),
      });
    }

    const shouldSyncAuthProfile =
      employee.auth_user_id &&
      (email !== undefined ||
        name !== undefined ||
        employeeId !== undefined ||
        body?.phone !== undefined ||
        body?.mobile !== undefined);

    if (shouldSyncAuthProfile) {
      const authPayload = {};
      if (email !== undefined) authPayload.email = employee.email;
      if (name !== undefined || employeeId !== undefined) {
        authPayload.user_metadata = {
          full_name: employee.name || '',
          employee_id: employee.employee_id || '',
          employee_uuid: employee.id,
          role: 'employee',
        };
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        employee.auth_user_id,
        authPayload
      );

      if (authUpdateError) {
        return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
      }

      await upsertProfileRecord({
        authUserId: employee.auth_user_id,
        employeeId: employee.employee_id || null,
        email: employee.email || null,
        fullName: employee.name || null,
        phone: employee.phone || employee.mobile_phone || null,
      });
    }

    const { data: refreshedEmployee, error: refreshedEmployeeError } = await adminClient
      .from('hrm_employees')
      .select(`
        *,
        department:hrm_departments (
          id,
          name
        ),
        designation:hrm_designations (
          id,
          title
        ),
        module_access:hrm_module_access!module_access_employee_id_fkey (*),
        education:hrm_employee_education (*),
        certifications:hrm_employee_certifications (*),
        documents:hrm_employee_documents (*)
      `)
      .eq('id', employee.id)
      .single();

    if (refreshedEmployeeError) {
      return NextResponse.json({ error: refreshedEmployeeError.message }, { status: 500 });
    }

    const [enrichedEmployee] = await attachCreatorNames([refreshedEmployee]);

    return NextResponse.json(
      { message: 'Employee updated successfully', employee: enrichedEmployee },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /HRM/api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    const { data: employee, error: fetchError } = await adminClient
      .from('hrm_employees')
      .select('id, profile_picture_url')
      .eq('id', id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { count: assignedTaskCount, error: assignmentCountError } = await adminClient
      .from('task_assignments')
      .select('task_id', { count: 'exact', head: true })
      .eq('employee_id', id);

    if (assignmentCountError) {
      return NextResponse.json({ error: 'Failed to verify employee task assignments' }, { status: 500 });
    }

    if ((assignedTaskCount || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee with active task assignments (${assignedTaskCount}). Reassign or unassign tasks first.`,
          assignedTaskCount,
          code: 'EMPLOYEE_HAS_ASSIGNED_TASKS',
        },
        { status: 409 }
      );
    }

    if (employee.profile_picture_url) {
      await removeProfilePicture(employee.profile_picture_url);
    }

    const { data: deletedRows, error: deleteError } = await adminClient
      .from('hrm_employees')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: 'Delete failed due to permissions or employee no longer exists' },
        { status: 403 }
      );
    }

    await adminClient.from('hrm_module_access').delete().eq('employee_id', id);
    await adminClient.from('hrm_employee_documents').delete().eq('employee_id', id);
    await adminClient.from('hrm_employee_certifications').delete().eq('employee_id', id);
    await adminClient.from('hrm_employee_education').delete().eq('employee_id', id);

    return NextResponse.json({ message: 'Employee deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /HRM/api/employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

