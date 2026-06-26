import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { enqueueEmployeeCreatedEmail } from '@/utils/email-outbox';
import { ensureEmployeeAuthUser } from '@/utils/employee-auth';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  fetchOnboardingBundleById,
  logOnboardingEvent,
  ONBOARDING_FILES_BUCKET,
  ONBOARDING_STATUSES,
  removeOnboardingFiles,
} from '@/utils/onboarding';
import {
  deriveEmploymentFields,
  normalizeEmployeeType,
} from '@/utils/hrm-employment';
import {
  buildLifecycleColumns,
  DEFAULT_PROBATION_PERIOD_DAYS,
} from '@/utils/employee-lifecycle';

const EMAIL_NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';

const isSuperAdminEntity = (emp) => {
  if (!emp) return false;
  if (emp.email && ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(emp.email.toLowerCase().trim())) {
    return true;
  }
  if (emp.employee_id) {
    const empIdUpper = String(emp.employee_id).toUpperCase().trim();
    if (empIdUpper.startsWith('SA-') || empIdUpper.startsWith('SA0') || ['SA01', 'SA02', 'SA-01', 'SA-02'].includes(empIdUpper)) {
      return true;
    }
  }
  return false;
};
const EMPLOYEE_FILES_BUCKET = 'employee-files';
const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const EMPLOYEE_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const PROFILE_PICTURE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const PROFILE_PICTURE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMPLOYEE_FILE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const EMPLOYEE_FILE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const DOCUMENT_TYPES = ['aadhaar_card', 'pan_card', 'passport', 'appointment_letter', 'experience_letter', 'salary_slip'];

const hrmEmployeeColumnSupportPromises = new Map();

class IntakeFormError extends Error {
  constructor({
    message,
    fieldErrors = {},
    sectionErrors = {},
    status = 400,
    details = [],
  }) {
    super(message);
    this.name = 'IntakeFormError';
    this.fieldErrors = fieldErrors;
    this.sectionErrors = sectionErrors;
    this.status = status;
    this.details = details;
  }
}

function buildFriendlyErrorResponse(error, fallbackMessage = 'We could not save the employee form right now. Please try again or contact HR.') {
  if (error instanceof IntakeFormError) {
    const details = error.details?.length
      ? error.details
      : [
          ...Object.values(error.fieldErrors || {}),
          ...Object.values(error.sectionErrors || {}),
        ].filter(Boolean);

    return NextResponse.json(
      {
        error: error.message,
        fieldErrors: error.fieldErrors || {},
        sectionErrors: error.sectionErrors || {},
        details,
      },
      { status: error.status || 400 }
    );
  }

  const directErrorMessage = String(error?.message || '').trim();
  const errorMessage = directErrorMessage || fallbackMessage;

  return NextResponse.json(
    {
      error: errorMessage,
      fieldErrors: {},
      sectionErrors: {},
      details: [errorMessage],
    },
    { status: 500 }
  );
}

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

async function requireEmployeeFormAccess() {
  const auth = await requireHrAdminAccess();
  if (auth.error) {
    return auth;
  }

  return {
    ...auth,
    isPublic: false,
  };
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
    'probation_started_at',
    'probation_ends_at',
    'notice_started_at',
    'notice_ends_at',
    'separated_at',
    'separation_reason',
    'separation_reason_code',
    'access_disabled_at',
  ].map(async (columnName) => [columnName, await supportsHrmEmployeeColumn(columnName)]));

  return new Set(
    supportEntries
      .filter(([, supported]) => supported)
      .map(([columnName]) => columnName)
  );
}

async function supportsGenderColumn() {
  return supportsHrmEmployeeColumn('gender');
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

function toDateOnly(value) {
  const normalized = cleanText(value);
  return normalized ? normalized.slice(0, 10) : null;
}

function formatFriendlyDate(value) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return value || '--';
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateOnly;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function addDaysToDateOnly(value, daysToAdd) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
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

function parseGender(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'female', 'others'].includes(normalized)) {
    return normalized;
  }

  return null;
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
    separationReason:
      source.separationReason ??
      source.separation_reason ??
      source.terminationReason ??
      source.termination_reason ??
      null,
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

function getFileExtension(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop().toLowerCase();
}

function sanitizeStorageSegment(value, fallback = 'file') {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function validateUploadedFile(file, {
  fieldKey,
  fieldLabel,
  sectionKey,
  allowedExtensions,
  allowedMimeTypes,
  maxSizeBytes,
}) {
  if (!file || typeof file === 'string' || file.size <= 0) {
    return;
  }

  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();
  const isHeicLike = ['heic', 'heif'].includes(extension) || mimeType.includes('heic') || mimeType.includes('heif');

  if (isHeicLike) {
    const message = fieldKey === 'profilePicture'
      ? 'This image format is not supported for the profile picture. Please upload JPG, PNG, or WebP.'
      : `${fieldLabel} uses an unsupported image format. Please upload PDF, JPG, PNG, or WebP.`;
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: { [fieldKey]: message },
      sectionErrors: { [sectionKey]: 'Some uploaded files need attention.' },
      details: [message],
      status: 400,
    });
  }

  const extensionAllowed = !allowedExtensions?.length || allowedExtensions.includes(extension);
  const mimeAllowed = !allowedMimeTypes?.length || allowedMimeTypes.includes(mimeType);

  if (!extensionAllowed || !mimeAllowed) {
    const supportedFormats = fieldKey === 'profilePicture' ? 'JPG, PNG, or WebP' : 'PDF, JPG, PNG, or WebP';
    const message = `${fieldLabel} must be ${supportedFormats}.`;
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: { [fieldKey]: message },
      sectionErrors: { [sectionKey]: 'Some uploaded files need attention.' },
      details: [message],
      status: 400,
    });
  }

  if (Number.isFinite(maxSizeBytes) && file.size > maxSizeBytes) {
    const maxSizeMb = Math.round((maxSizeBytes / (1024 * 1024)) * 10) / 10;
    const message = `${fieldLabel} must be smaller than ${maxSizeMb} MB.`;
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: { [fieldKey]: message },
      sectionErrors: { [sectionKey]: 'Some uploaded files need attention.' },
      details: [message],
      status: 400,
    });
  }
}

function normalizeWorkingDays(value) {
  const parsed = parseJsonArray(value);
  const normalized = [];

  for (const item of parsed) {
    const day = String(item || '').trim().toLowerCase();
    if (!day || normalized.includes(day)) continue;
    normalized.push(day);
  }

  return normalized;
}

function normalizeWorkingDaysInput(value) {
  const normalized = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      const day = String(item || '').trim().toLowerCase();
      if (!day || normalized.includes(day)) continue;
      normalized.push(day);
    }

    return normalized;
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

  validateUploadedFile(profilePicture, {
    fieldKey: 'profilePicture',
    fieldLabel: 'Profile picture',
    sectionKey: 'accountAccess',
    allowedExtensions: PROFILE_PICTURE_ALLOWED_EXTENSIONS,
    allowedMimeTypes: PROFILE_PICTURE_ALLOWED_MIME_TYPES,
    maxSizeBytes: PROFILE_PICTURE_MAX_SIZE_BYTES,
  });

  const fileExt = getFileExtension(profilePicture.name) || 'jpg';
  const safeEmployeeId = sanitizeStorageSegment(employeeId, 'employee');
  const fileName = `${safeEmployeeId}-${Date.now()}.${fileExt}`;
  const bytes = await profilePicture.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from('employee-avatars')
    .upload(fileName, buffer, {
      contentType: profilePicture.type,
      upsert: false,
    });

  if (uploadError) {
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: {
        profilePicture: 'We could not upload the profile picture. Please try again with a JPG, PNG, or WebP image.',
      },
      sectionErrors: {
        accountAccess: 'Some uploaded files need attention.',
      },
      details: ['We could not upload the profile picture. Please try again with a JPG, PNG, or WebP image.'],
      status: 400,
    });
  }

  let urlData = null;
  try {
    const result = adminClient.storage.from('employee-avatars').getPublicUrl(fileName);
    urlData = result?.data || null;
  } catch {
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: {
        profilePicture: 'We could not process the profile picture. Please upload a JPG, PNG, or WebP image.',
      },
      sectionErrors: {
        accountAccess: 'Some uploaded files need attention.',
      },
      details: ['We could not process the profile picture. Please upload a JPG, PNG, or WebP image.'],
      status: 400,
    });
  }

  return urlData?.publicUrl || null;
}

async function removeProfilePicture(profilePictureUrl) {
  if (!profilePictureUrl) return;

  const filePath = profilePictureUrl.split('/employee-avatars/')[1] || profilePictureUrl.split('/').pop();
  if (!filePath) return;

  await adminClient.storage.from('employee-avatars').remove([filePath]);
}

async function removeEmployeeFiles(filePaths = []) {
  const normalizedPaths = [...new Set((filePaths || []).map((path) => cleanText(path)).filter(Boolean))];
  if (!normalizedPaths.length) return;

  await adminClient.storage.from(EMPLOYEE_FILES_BUCKET).remove(normalizedPaths);
}

async function promoteOnboardingFileToEmployeeStorage(sourcePath, employeeId, folder) {
  const normalizedSourcePath = cleanText(sourcePath);
  if (!normalizedSourcePath) return null;

  await ensureEmployeeFilesBucket();

  const fileExt = getFileExtension(normalizedSourcePath) || 'bin';
  const sanitizedFolder = String(folder || 'misc').replace(/[^a-z0-9/_-]+/gi, '-');
  const safeEmployeeId = sanitizeStorageSegment(employeeId, 'employee');
  const targetPath = `${safeEmployeeId}/${sanitizedFolder}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const { data: sourceFile, error: downloadError } = await adminClient.storage
    .from(ONBOARDING_FILES_BUCKET)
    .download(normalizedSourcePath);

  if (downloadError || !sourceFile) {
    throw new Error(downloadError?.message || 'Failed to download onboarding file for employee conversion');
  }

  const bytes = await sourceFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const contentType = sourceFile.type || 'application/octet-stream';

  const { error: uploadError } = await adminClient.storage
    .from(EMPLOYEE_FILES_BUCKET)
    .upload(targetPath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to promote onboarding file into employee storage');
  }

  const { data } = adminClient.storage.from(EMPLOYEE_FILES_BUCKET).getPublicUrl(targetPath);
  return {
    file_path: targetPath,
    file_url: data?.publicUrl || '',
  };
}

async function promoteOnboardingProfilePictureToEmployeeAvatar(sourcePath, employeeId) {
  const normalizedSourcePath = cleanText(sourcePath);
  if (!normalizedSourcePath) return null;

  const fileExt = getFileExtension(normalizedSourcePath) || 'jpg';
  const safeEmployeeId = sanitizeStorageSegment(employeeId, 'employee');
  const fileName = `${safeEmployeeId}-${Date.now()}-onboarding.${fileExt}`;

  const { data: sourceFile, error: downloadError } = await adminClient.storage
    .from(ONBOARDING_FILES_BUCKET)
    .download(normalizedSourcePath);

  if (downloadError || !sourceFile) {
    throw new Error(downloadError?.message || 'Failed to download onboarding profile picture for employee conversion');
  }

  const bytes = await sourceFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const contentType = sourceFile.type || 'application/octet-stream';

  const { error: uploadError } = await adminClient.storage
    .from('employee-avatars')
    .upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to promote onboarding profile picture into employee avatars');
  }

  const { data } = adminClient.storage.from('employee-avatars').getPublicUrl(fileName);
  return data?.publicUrl || null;
}

function buildOnboardingEducationLookup(rows = []) {
  const lookup = new Map();
  for (const row of rows || []) {
    const level = cleanText(row?.education_level);
    if (level && !lookup.has(level)) {
      lookup.set(level, row);
    }
  }
  return lookup;
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

async function uploadEmployeeFile(file, employeeId, folder, fieldKey, fieldLabel, sectionKey) {
  if (!file || typeof file === 'string' || file.size <= 0) {
    return null;
  }

  validateUploadedFile(file, {
    fieldKey,
    fieldLabel,
    sectionKey,
    allowedExtensions: EMPLOYEE_FILE_ALLOWED_EXTENSIONS,
    allowedMimeTypes: EMPLOYEE_FILE_ALLOWED_MIME_TYPES,
    maxSizeBytes: EMPLOYEE_FILE_MAX_SIZE_BYTES,
  });

  await ensureEmployeeFilesBucket();

  const fileExt = getFileExtension(file.name) || 'bin';
  const sanitizedFolder = String(folder || 'misc').replace(/[^a-z0-9/_-]+/gi, '-');
  const safeEmployeeId = sanitizeStorageSegment(employeeId, 'employee');
  const fileName = `${safeEmployeeId}/${sanitizedFolder}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from(EMPLOYEE_FILES_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    const message = `We could not upload ${fieldLabel.toLowerCase()}. Please try again with a supported file.`;
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: { [fieldKey]: message },
      sectionErrors: { [sectionKey]: 'Some uploaded files need attention.' },
      details: [message],
      status: 400,
    });
  }

  let urlData = null;
  try {
    const result = adminClient.storage.from(EMPLOYEE_FILES_BUCKET).getPublicUrl(fileName);
    urlData = result?.data || null;
  } catch {
    const message = `We could not process ${fieldLabel.toLowerCase()}. Please try again with a supported file.`;
    throw new IntakeFormError({
      message: 'Please fix the highlighted uploads and try again.',
      fieldErrors: { [fieldKey]: message },
      sectionErrors: { [sectionKey]: 'Some uploaded files need attention.' },
      details: [message],
      status: 400,
    });
  }

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

  const titleQuery = adminClient
    .from('hrm_designations')
    .select('id')
    .ilike('title', normalizedTitle)
    .limit(1)
    .maybeSingle();

  const { data: existingByTitle, error: existingByTitleError } = await titleQuery;

  if (existingByTitleError) {
    throw new Error(existingByTitleError.message || 'Failed to load designation');
  }

  if (existingByTitle?.id) return existingByTitle.id;

  let departmentQuery = adminClient
    .from('hrm_designations')
    .select('id')
    .limit(1);

  if (departmentId) {
    departmentQuery = departmentQuery.eq('department_id', departmentId).ilike('title', normalizedTitle);
  } else {
    departmentQuery = departmentQuery.ilike('title', normalizedTitle);
  }

  const { data: existing, error: existingError } = await departmentQuery.maybeSingle();

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

function validateEmployeeIdentityFields({ aadhaarNumber, panNumber }) {
  if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
    throw new IntakeFormError({
      message: 'Please fix the highlighted fields and try again.',
      fieldErrors: {
        aadhaarNumber: 'Aadhaar number must be exactly 12 digits.',
      },
      sectionErrors: {
        identityFinancials: 'Some identity details need attention.',
      },
      details: ['Aadhaar number must be exactly 12 digits.'],
      status: 400,
    });
  }

  if (panNumber && !/^[A-Z0-9]{10}$/.test(panNumber)) {
    throw new IntakeFormError({
      message: 'Please fix the highlighted fields and try again.',
      fieldErrors: {
        panNumber: 'PAN number must be exactly 10 characters.',
      },
      sectionErrors: {
        identityFinancials: 'Some identity details need attention.',
      },
      details: ['PAN number must be exactly 10 characters.'],
      status: 400,
    });
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

async function replaceEmployeeDocumentTypes(employeeId, employeeCode, documentEntries) {
  const validEntries = (documentEntries || []).filter(
    (entry) => entry?.document_type && DOCUMENT_TYPES.includes(entry.document_type) && entry?.file
  );

  if (!validEntries.length) return 0;

  const documentTypesToReplace = [...new Set(validEntries.map((entry) => entry.document_type))];

  const { error: deleteError } = await adminClient
    .from('hrm_employee_documents')
    .delete()
    .eq('employee_id', employeeId)
    .in('document_type', documentTypesToReplace);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to replace employee documents');
  }

  const uploadedRows = [];
  for (const entry of validEntries) {
    const documentLabel = entry.document_type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const uploaded = await uploadEmployeeFile(
      entry.file,
      employeeCode,
      `documents/${entry.document_type}`,
      `document_${entry.document_type}`,
      documentLabel,
      'documents'
    );
    if (!uploaded) continue;

    uploadedRows.push({
      employee_id: employeeId,
      document_type: entry.document_type,
      ...uploaded,
      updated_at: new Date().toISOString(),
    });
  }

  if (!uploadedRows.length) return 0;

  const { error: insertError } = await adminClient
    .from('hrm_employee_documents')
    .insert(uploadedRows);

  if (insertError) {
    throw new Error(insertError.message || 'Failed to upload employee documents');
  }

  return uploadedRows.length;
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
      .from('privileged_accounts')
      .select('id, auth_user_id, name, email, status')
      .eq('role', 'super_admin')
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
    employeeOptions: (employeesResult.data || []).filter(emp => !isSuperAdminEntity(emp)),
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
          .from('privileged_accounts')
          .select('id, name, email')
          .eq('role', 'super_admin')
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeMeta = searchParams.get('includeMeta') === '1';
    const taskManagerOnly = searchParams.get('taskManagerOnly') === '1';

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    if (!authContext?.isHrAdmin && !authContext?.isSupport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

      if (!employee || isSuperAdminEntity(employee)) {
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

    const enrichedEmployees = await attachCreatorNames((filteredEmployees || []).filter(emp => !isSuperAdminEntity(emp)));

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
    const auth = await requireEmployeeFormAccess();
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
    const phone = cleanText(formData.get('phone'));
    const mobilePhone = cleanText(formData.get('mobile'));
    const onboardingRequestId = cleanText(formData.get('onboardingRequestId'));
    const onboardingBundle = onboardingRequestId ? await fetchOnboardingBundleById(onboardingRequestId) : null;

    if (!employeeId || !name || !email || !password || !departmentName || !designationTitle) {
      const fieldErrors = {};
      if (!employeeId) fieldErrors.employeeId = 'Employee ID is required.';
      if (!name) fieldErrors.name = 'Full name is required.';
      if (!email) fieldErrors.email = 'Work email is required.';
      if (!password) fieldErrors.password = 'Password is required.';
      if (!departmentName) fieldErrors.department = 'Department is required.';
      if (!designationTitle) fieldErrors.designation = 'Designation is required.';

      return buildFriendlyErrorResponse(
        new IntakeFormError({
          message: 'Please fix the highlighted fields and try again.',
          fieldErrors,
          sectionErrors: {
            accountAccess: 'Some account details need attention.',
            currentPosition: 'Some position details need attention.',
          },
          details: Object.values(fieldErrors),
          status: 400,
        })
      );
    }

    if (onboardingRequestId) {
      if (!onboardingBundle?.request) {
        return buildFriendlyErrorResponse(
          new IntakeFormError({
            message: 'The onboarding request could not be found.',
            details: ['The onboarding request could not be found.'],
            status: 404,
          })
        );
      }

      if (onboardingBundle.request.status !== ONBOARDING_STATUSES.approved) {
        return buildFriendlyErrorResponse(
          new IntakeFormError({
            message: 'Only approved onboarding requests can be converted into employees.',
            details: ['Only approved onboarding requests can be converted into employees.'],
            status: 400,
          })
        );
      }
    }

    const reportingSuperAdminSupported = await supportsReportingSuperAdminColumn();
    const supportedEmploymentColumns = await getSupportedEmploymentColumns();
    const genderSupported = await supportsGenderColumn();
    const departmentId = await ensureDepartmentId(departmentName);
    const designationId = await ensureDesignationId(designationTitle, departmentId);
    const reportingTarget = await resolveReportingTarget(formData.get('reportingTo'));
    if (reportingTarget.reportingSuperAdminId && !reportingSuperAdminSupported) {
      return buildFriendlyErrorResponse(
        new IntakeFormError({
          message: 'Please review the reporting details and try again.',
          fieldErrors: {
            reportingTo: 'Super Admin reporting is not available yet. Please choose an employee reporting manager for now.',
          },
          sectionErrors: {
            currentPosition: 'Some position details need attention.',
          },
          details: ['Super Admin reporting is not available yet. Please choose an employee reporting manager for now.'],
          status: 400,
        })
      );
    }
    const taskManagerEnabled = parseBoolean(formData.get('taskManagerAccess'));
    const providedPassword = password || generateTempPassword();
    const passwordHash = await bcrypt.hash(providedPassword, 10);
    const promotedOnboardingSourcePaths = [];
    let profilePictureUrl = await uploadProfilePicture(formData.get('profilePicture'), employeeId);
    if (!profilePictureUrl && onboardingBundle?.request?.profile_picture_path) {
      profilePictureUrl = await promoteOnboardingProfilePictureToEmployeeAvatar(
        onboardingBundle.request.profile_picture_path,
        employeeId
      );
      if (profilePictureUrl) {
        promotedOnboardingSourcePaths.push(onboardingBundle.request.profile_picture_path);
      }
    }
    const aadhaarNumber = cleanText(formData.get('aadhaarNumber'));
    const panNumber = cleanText(formData.get('panNumber'))?.toUpperCase() || null;

    validateEmployeeIdentityFields({ aadhaarNumber, panNumber });
    const employmentColumns = filterPayloadByAllowedColumns(
      {
        employee_type: normalizeEmployeeType(formData.get('employeeType')),
        ...buildLifecycleColumns(
        {
          employeeType: formData.get('employeeType'),
          lifecycleStatus: formData.get('lifecycleStatus') || formData.get('status'),
          currentStage: formData.get('currentStage'),
          noticePeriodDays: formData.get('noticePeriodDays'),
          separationReason: formData.get('separationReason') || formData.get('terminationReason'),
          separationReasonCode: formData.get('separationReasonCode') || formData.get('terminationReasonCode'),
          separatedAt: formData.get('separatedAt') || formData.get('terminatedAt'),
          accessDisabledAt: formData.get('accessDisabledAt'),
          joinedOn: formData.get('joinedOn'),
        },
        {}
      ),
      },
      new Set(['employee_status', ...supportedEmploymentColumns])
    );

    const employeePayload = {
      employee_id: employeeId,
      name,
      role: 'employee',
      email,
      phone,
      personal_email: cleanEmail(formData.get('personalEmail')),
      date_of_birth: parseDate(formData.get('dateOfBirth')),
      ...(genderSupported ? { gender: parseGender(formData.get('gender')) } : {}),
      blood_group: cleanText(formData.get('bloodGroup')),
      father_name: cleanText(formData.get('fatherName')),
      marital_status: cleanText(formData.get('maritalStatus')),
      spouse_name: cleanText(formData.get('spouseName')),
      nationality: cleanText(formData.get('nationality')),
      religion: cleanText(formData.get('religion')),
      is_physically_challenged: parseBoolean(formData.get('isPhysicallyChallenged')),
      address: cleanText(formData.get('address')),
      city: cleanText(formData.get('city')),
      district: cleanText(formData.get('district')),
      state: cleanText(formData.get('state')),
      country: cleanText(formData.get('country')),
      pincode: cleanText(formData.get('pincode')),
      permanent_address: cleanText(formData.get('permanentAddress')),
      permanent_city: cleanText(formData.get('permanentCity')),
      permanent_district: cleanText(formData.get('permanentDistrict')),
      permanent_state: cleanText(formData.get('permanentState')),
      permanent_country: cleanText(formData.get('permanentCountry')),
      permanent_pincode: cleanText(formData.get('permanentPincode')),
      alternate_phone: cleanText(formData.get('phone2')),
      mobile_phone: mobilePhone,
      emergency_contact_name: cleanText(formData.get('emergencyContactName')),
      emergency_contact_number: cleanText(formData.get('emergencyContactNumber')),
      date_of_joining: parseDate(formData.get('joinedOn')),
      confirmation_date: parseDate(formData.get('confirmationDate')),
      employee_status: employmentColumns.employee_status,
      probation_period_days: formData.get('employeeType') === 'intern' ? 0 : DEFAULT_PROBATION_PERIOD_DAYS,
      notice_period_days: parseIntegerValue(formData.get('noticePeriodDays')),
      experience_company_name: cleanText(formData.get('experienceCompanyName')),
      total_experience: cleanText(formData.get('totalExperience')),
      referred_by: cleanText(formData.get('referredBy')),
      department_id: departmentId,
      division: cleanText(formData.get('division')),
      designation_id: designationId,
      reporting_manager_id: reportingTarget.reportingManagerId,
      company: cleanText(formData.get('company')),
      salary: parseNumeric(formData.get('salary')),
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
      created_by: authContext?.userId || null,
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

      return buildFriendlyErrorResponse(
        new IntakeFormError({
          message: 'We could not save the employee form right now. Please try again or contact HR.',
          status: 500,
          details: ['We could not save the employee form right now. Please try again or contact HR.'],
        })
      );
    }

    let promotedEmployeeFilePaths = [];

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

      const onboardingEducationByLevel = buildOnboardingEducationLookup(onboardingBundle?.education);
      const educationRows = [];
      for (const entry of educationEntries) {
        const level = cleanText(entry?.educationLevel);
        if (!level) continue;

        const file = formData.get(entry?.fileKey || '');
        let uploaded = await uploadEmployeeFile(
          file,
          employeeId,
          `education/${level}`,
          entry?.fileKey || `education_file_${educationRows.length}`,
          `${level.replace(/_/g, ' ')} education file`,
          'education'
        );
        const onboardingEducationEntry = onboardingEducationByLevel.get(level);
        if (!uploaded && onboardingEducationEntry?.degree_file_path) {
          const promoted = await promoteOnboardingFileToEmployeeStorage(
            onboardingEducationEntry.degree_file_path,
            employeeId,
            `education/${level}`
          );
          if (promoted?.file_path) promotedEmployeeFilePaths.push(promoted.file_path);
          promotedOnboardingSourcePaths.push(onboardingEducationEntry.degree_file_path);
          uploaded = promoted;
        }
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
        let uploaded = await uploadEmployeeFile(
          file,
          employeeId,
          'certifications',
          entry?.fileKey || `certification_file_${certificationRows.length}`,
          `${certificationName} certificate`,
          'certifications'
        );
        if (!uploaded && onboardingBundle?.certifications?.[certificationRows.length]?.certificate_file_path) {
          const promoted = await promoteOnboardingFileToEmployeeStorage(
            onboardingBundle.certifications[certificationRows.length].certificate_file_path,
            employeeId,
            'certifications'
          );
          if (promoted?.file_path) promotedEmployeeFilePaths.push(promoted.file_path);
          promotedOnboardingSourcePaths.push(onboardingBundle.certifications[certificationRows.length].certificate_file_path);
          uploaded = promoted;
        }
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
        const documentLabel = documentType
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        let uploaded = await uploadEmployeeFile(
          file,
          employeeId,
          `documents/${documentType}`,
          `document_${documentType}`,
          documentLabel,
          'documents'
        );
        const onboardingDocument = onboardingBundle?.documents?.find((entry) => entry.document_type === documentType);
        if (!uploaded && onboardingDocument?.file_path) {
          const promoted = await promoteOnboardingFileToEmployeeStorage(
            onboardingDocument.file_path,
            employeeId,
            `documents/${documentType}`
          );
          if (promoted?.file_path) promotedEmployeeFilePaths.push(promoted.file_path);
          promotedOnboardingSourcePaths.push(onboardingDocument.file_path);
          uploaded = {
            ...promoted,
            file_name: onboardingDocument.file_name,
            file_size: onboardingDocument.file_size,
          };
        }
        if (uploaded) {
          documentRows.push({
            document_type: documentType,
            ...uploaded,
          });
        }
      }
      await replaceEmployeeDocuments(employeeRow.id, documentRows);

      if (onboardingBundle?.request?.id) {
        await adminClient
          .from('hrm_onboarding_requests')
          .update({
            status: ONBOARDING_STATUSES.converted,
            converted_employee_id: employeeRow.id,
            archived_at: new Date().toISOString(),
          })
          .eq('id', onboardingBundle.request.id);

        await logOnboardingEvent({
          onboardingRequestId: onboardingBundle.request.id,
          action: 'converted',
          actorProfileId: authContext?.userId || null,
          note: `Converted into employee ${employeeId}.`,
          metadata: {
            employeeId: employeeRow.id,
            employeeCode: employeeId,
          },
        });
      }

      await upsertModuleAccess(employeeRow.id, {
        task_manager: taskManagerEnabled,
        task_manager_role: null,
        auditing: false,
        auditing_role: null,
        crm: false,
        crm_role: null,
        hrm_admin: false,
        granted_by: authContext?.employee?.id || null,
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

      if (promotedOnboardingSourcePaths.length) {
        try {
          await removeOnboardingFiles(promotedOnboardingSourcePaths);
        } catch (cleanupError) {
          console.error('Failed to remove onboarding source files after employee conversion:', cleanupError);
        }
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

      if (promotedEmployeeFilePaths.length) {
        await removeEmployeeFiles(promotedEmployeeFilePaths);
      }

      if (onboardingBundle?.request?.id) {
        await adminClient
          .from('hrm_onboarding_requests')
          .update({
            status: ONBOARDING_STATUSES.approved,
            converted_employee_id: null,
            archived_at: null,
          })
          .eq('id', onboardingBundle.request.id);
      }

      return buildFriendlyErrorResponse(error);
    }
  } catch (error) {
    console.error('Error in POST /HRM/api/employees:', error);
    return buildFriendlyErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { authContext } = auth;
    const { searchParams } = new URL(request.url);
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const body = isMultipart ? null : await request.json();
    const formData = isMultipart ? await request.formData() : null;
    const id = cleanText(
      (isMultipart ? formData?.get('id') : body?.id) ||
      searchParams.get('id')
    );

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

    if (isMultipart) {
      const educationRecordId = cleanText(formData?.get('educationRecordId'));
      const educationLevel = cleanText(formData?.get('educationLevel'));
      const educationDocument = formData?.get('educationDocument');

      if (
        educationRecordId &&
        educationDocument &&
        typeof educationDocument !== 'string' &&
        educationDocument.size > 0
      ) {
        const { data: educationRecord, error: educationRecordError } = await adminClient
          .from('hrm_employee_education')
          .select('*')
          .eq('id', educationRecordId)
          .eq('employee_id', existingEmployee.id)
          .maybeSingle();

        if (educationRecordError) {
          return NextResponse.json({ error: educationRecordError.message }, { status: 500 });
        }

        if (!educationRecord) {
          return NextResponse.json({ error: 'Education record not found' }, { status: 404 });
        }

        const resolvedEducationLevel =
          educationLevel || cleanText(educationRecord.education_level) || 'general';

        const uploaded = await uploadEmployeeFile(
          educationDocument,
          existingEmployee.employee_id || existingEmployee.id,
          `education/${resolvedEducationLevel}`,
          'educationDocument',
          `${resolvedEducationLevel.replace(/_/g, ' ')} education file`,
          'education'
        );

        if (!uploaded) {
          return NextResponse.json({ error: 'No education document was selected for upload' }, { status: 400 });
        }

        const previousFilePath = cleanText(educationRecord.degree_file_path);

        const { error: updateEducationError } = await adminClient
          .from('hrm_employee_education')
          .update({
            degree_file_url: uploaded.file_url || null,
            degree_file_path: uploaded.file_path || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', educationRecord.id)
          .eq('employee_id', existingEmployee.id);

        if (updateEducationError) {
          if (uploaded.file_path) {
            await removeEmployeeFiles([uploaded.file_path]);
          }
          return NextResponse.json({ error: updateEducationError.message }, { status: 500 });
        }

        if (previousFilePath && previousFilePath !== uploaded.file_path) {
          await removeEmployeeFiles([previousFilePath]);
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
          .eq('id', existingEmployee.id)
          .single();

        if (refreshedEmployeeError) {
          return NextResponse.json({ error: refreshedEmployeeError.message }, { status: 500 });
        }

        const [enrichedEmployee] = await attachCreatorNames([refreshedEmployee]);

        return NextResponse.json(
          {
            message: 'Education document uploaded successfully',
            employee: enrichedEmployee,
          },
          { status: 200 }
        );
      }

      const documentEntries = DOCUMENT_TYPES.map((documentType) => ({
        document_type: documentType,
        file: formData?.get(`document_${documentType}`),
      })).filter((entry) => entry.file && typeof entry.file !== 'string' && entry.file.size > 0);

      if (!documentEntries.length) {
        return NextResponse.json({ error: 'No documents were selected for upload' }, { status: 400 });
      }

      const uploadedCount = await replaceEmployeeDocumentTypes(
        existingEmployee.id,
        existingEmployee.employee_id || existingEmployee.id,
        documentEntries
      );

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
        .eq('id', existingEmployee.id)
        .single();

      if (refreshedEmployeeError) {
        return NextResponse.json({ error: refreshedEmployeeError.message }, { status: 500 });
      }

      const [enrichedEmployee] = await attachCreatorNames([refreshedEmployee]);

      return NextResponse.json(
        {
          message: uploadedCount === 1 ? 'Document uploaded successfully' : 'Documents uploaded successfully',
          employee: enrichedEmployee,
        },
        { status: 200 }
      );
    }

    const { data: currentModuleAccess } = await adminClient
      .from('hrm_module_access')
      .select('*')
      .eq('employee_id', id)
      .maybeSingle();

    const reportingSuperAdminSupported = await supportsReportingSuperAdminColumn();
    const supportedEmploymentColumns = await getSupportedEmploymentColumns();
    const genderSupported = await supportsGenderColumn();
    const name = body?.name !== undefined ? cleanText(body.name) : undefined;
    const email = body?.email !== undefined ? cleanEmail(body.email) : undefined;
    const role = body?.role !== undefined ? cleanText(body.role) : undefined;
    const employeeId = body?.employeeId !== undefined ? cleanText(body.employeeId) : undefined;
    const departmentName = body?.department !== undefined ? cleanText(body.department) : undefined;
    const designationTitle = body?.designation !== undefined ? cleanText(body.designation) : undefined;
    const reportingTo = body?.reportingTo !== undefined ? body.reportingTo : undefined;
    const taskManagerAccess = body?.taskManagerAccess !== undefined ? parseBoolean(body.taskManagerAccess) : undefined;
    const hrmAdminAccess = body?.hrmAdminAccess !== undefined ? parseBoolean(body.hrmAdminAccess) : undefined;
    const auditingAccess = body?.auditingAccess !== undefined ? parseBoolean(body.auditingAccess) : undefined;
    const crmAccess = body?.crmAccess !== undefined ? parseBoolean(body.crmAccess) : undefined;

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
      ...(genderSupported ? [['gender', 'gender', parseGender]] : []),
      ['bloodGroup', 'blood_group', cleanText],
      ['fatherName', 'father_name', cleanText],
      ['maritalStatus', 'marital_status', cleanText],
      ['spouseName', 'spouse_name', cleanText],
      ['nationality', 'nationality', cleanText],
      ['religion', 'religion', cleanText],
      ['isPhysicallyChallenged', 'is_physically_challenged', parseBoolean],
      ['address', 'address', cleanText],
      ['city', 'city', cleanText],
      ['district', 'district', cleanText],
      ['state', 'state', cleanText],
      ['country', 'country', cleanText],
      ['pincode', 'pincode', cleanText],
      ['permanentAddress', 'permanent_address', cleanText],
      ['permanentCity', 'permanent_city', cleanText],
      ['permanentDistrict', 'permanent_district', cleanText],
      ['permanentState', 'permanent_state', cleanText],
      ['permanentCountry', 'permanent_country', cleanText],
      ['permanentPincode', 'permanent_pincode', cleanText],
      ['phone2', 'alternate_phone', cleanText],
      ['mobile', 'mobile_phone', cleanText],
      ['emergencyContactName', 'emergency_contact_name', cleanText],
      ['emergencyContactNumber', 'emergency_contact_number', cleanText],
      ['joinedOn', 'date_of_joining', parseDate],
      ['confirmationDate', 'confirmation_date', parseDate],
      ['probationPeriodDays', 'probation_period_days', parseIntegerValue],
      ['probationStartedAt', 'probation_started_at', cleanText],
      ['probationEndsAt', 'probation_ends_at', parseDate],
      ['noticePeriodDays', 'notice_period_days', parseIntegerValue],
      ['noticeStartedAt', 'notice_started_at', cleanText],
      ['noticeEndsAt', 'notice_ends_at', parseDate],
      ['separatedAt', 'separated_at', cleanText],
      ['separationReasonCode', 'separation_reason_code', cleanText],
      ['accessDisabledAt', 'access_disabled_at', cleanText],
      ['referredBy', 'referred_by', cleanText],
      ['experienceCompanyName', 'experience_company_name', cleanText],
      ['totalExperience', 'total_experience', cleanText],
      ['division', 'division', cleanText],
      ['company', 'company', cleanText],
      ['salary', 'salary', parseNumeric],
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
    const resolvedEmployeeType = employmentInputs.employeeType || existingEmployee.employee_type || null;
    const isIntern = resolvedEmployeeType === 'intern';

    if (isIntern) {
      payload.probation_period_days = 0;
      payload.probation_started_at = null;
      payload.probation_ends_at = null;
      payload.current_stage = 'none';
    } else if (existingEmployee.probation_period_days !== DEFAULT_PROBATION_PERIOD_DAYS || body?.probationPeriodDays !== undefined) {
      payload.probation_period_days = DEFAULT_PROBATION_PERIOD_DAYS;
    }

    const requestedCurrentStage = employmentInputs.currentStage !== null
      ? String(employmentInputs.currentStage || '').trim().toLowerCase()
      : null;
    const existingCurrentStage = String(existingEmployee.current_stage || '').trim().toLowerCase();
    const probationEndDate =
      toDateOnly(existingEmployee.probation_ends_at) ||
      addDaysToDateOnly(
        payload.date_of_joining !== undefined ? payload.date_of_joining : existingEmployee.date_of_joining,
        DEFAULT_PROBATION_PERIOD_DAYS
      );
    const todayDate = new Date().toISOString().slice(0, 10);

    if (!isIntern && existingCurrentStage === 'probation' && requestedCurrentStage === 'none' && probationEndDate && todayDate < probationEndDate) {
      return NextResponse.json(
        {
          error: `You can remove this employee from probation after ${formatFriendlyDate(probationEndDate)}.`,
        },
        { status: 400 }
      );
    }

    if (
      employmentInputs.employeeType !== null ||
      employmentInputs.lifecycleStatus !== null ||
      employmentInputs.currentStage !== null ||
      employmentInputs.separationReason !== null ||
      body?.probationStartedAt !== undefined ||
      body?.probationEndsAt !== undefined ||
      body?.noticeStartedAt !== undefined ||
      body?.noticeEndsAt !== undefined ||
      body?.separatedAt !== undefined ||
      body?.terminationReason !== undefined ||
      body?.separationReason !== undefined ||
      body?.terminationReasonCode !== undefined ||
      body?.separationReasonCode !== undefined ||
      body?.accessDisabledAt !== undefined
    ) {
      Object.assign(
        payload,
        filterPayloadByAllowedColumns(
          {
            employee_type:
              employmentInputs.employeeType !== null
                ? normalizeEmployeeType(employmentInputs.employeeType, existingEmployee.employee_type)
                : existingEmployee.employee_type,
            ...buildLifecycleColumns(
              {
                ...body,
                employeeType: resolvedEmployeeType,
              },
              {
                ...existingEmployee,
                employee_type: resolvedEmployeeType,
                date_of_joining:
                  payload.date_of_joining !== undefined ? payload.date_of_joining : existingEmployee.date_of_joining,
                probation_period_days:
                  payload.probation_period_days !== undefined ? payload.probation_period_days : existingEmployee.probation_period_days,
                notice_period_days:
                  payload.notice_period_days !== undefined ? payload.notice_period_days : existingEmployee.notice_period_days,
              }
            ),
          },
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

    const hasModuleAccessUpdate =
      taskManagerAccess !== undefined ||
      hrmAdminAccess !== undefined ||
      auditingAccess !== undefined ||
      crmAccess !== undefined;

    if (Object.keys(payload).length === 0 && !hasModuleAccessUpdate) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    const employeeResult = Object.keys(payload).length
      ? await adminClient
          .from('hrm_employees')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single()
      : await adminClient
          .from('hrm_employees')
          .select('*')
          .eq('id', id)
          .single();

    const { data: employee, error } = employeeResult;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (hasModuleAccessUpdate) {
      await upsertModuleAccess(employee.id, {
        task_manager: taskManagerAccess !== undefined ? taskManagerAccess : currentModuleAccess?.task_manager || false,
        task_manager_role: currentModuleAccess?.task_manager_role || null,
        auditing: auditingAccess !== undefined ? auditingAccess : currentModuleAccess?.auditing || false,
        auditing_role: currentModuleAccess?.auditing_role || null,
        crm: crmAccess !== undefined ? crmAccess : currentModuleAccess?.crm || false,
        crm_role: currentModuleAccess?.crm_role || null,
        hrm_admin: hrmAdminAccess !== undefined ? hrmAdminAccess : currentModuleAccess?.hrm_admin || false,
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
    const documentType = cleanText(searchParams.get('documentType'));
    const documentId = cleanText(searchParams.get('documentId'));

    if (!id) {
      return NextResponse.json({ error: 'Employee id is required' }, { status: 400 });
    }

    if (documentType || documentId) {
      let query = adminClient
        .from('hrm_employee_documents')
        .select('id, employee_id, file_path, document_type')
        .eq('employee_id', id);

      if (documentId) {
        query = query.eq('id', documentId);
      }

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data: documents, error: documentsError } = await query;

      if (documentsError) {
        return NextResponse.json({ error: documentsError.message }, { status: 500 });
      }

      if (!documents?.length) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const documentIds = documents.map((item) => item.id).filter(Boolean);
      const filePaths = documents.map((item) => item.file_path).filter(Boolean);

      const { error: deleteDocumentError } = await adminClient
        .from('hrm_employee_documents')
        .delete()
        .in('id', documentIds);

      if (deleteDocumentError) {
        return NextResponse.json({ error: deleteDocumentError.message }, { status: 500 });
      }

      await removeEmployeeFiles(filePaths);

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
        .eq('id', id)
        .single();

      if (refreshedEmployeeError) {
        return NextResponse.json({ error: refreshedEmployeeError.message }, { status: 500 });
      }

      const [enrichedEmployee] = await attachCreatorNames([refreshedEmployee]);

      return NextResponse.json(
        {
          message: 'Document deleted successfully',
          employee: enrichedEmployee,
        },
        { status: 200 }
      );
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

