import { randomBytes, createHash } from 'crypto';
import { adminClient } from '@/utils/supabase/admin';
import { getAppUrl } from '@/utils/app-url';

export const ONBOARDING_FILES_BUCKET = 'hrm-onboarding-files';
export const DEFAULT_ONBOARDING_TOKEN_EXPIRY_HOURS = 24;
export const ONBOARDING_DOCUMENT_TYPES = [
  { key: 'aadhaar_card', label: 'Aadhaar Card' },
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'passport', label: 'Passport' },
  { key: 'appointment_letter', label: 'Appointment Letter (Previous Organisation)' },
  { key: 'experience_letter', label: 'Experience Letter' },
  { key: 'salary_slip', label: 'Salary Slip' },
];
export const ONBOARDING_DOCUMENT_TYPE_KEYS = ONBOARDING_DOCUMENT_TYPES.map((item) => item.key);
export const ONBOARDING_EDUCATION_LEVELS = ['10th', '12th', 'graduation', 'post_graduation'];
export const ONBOARDING_ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
export const ONBOARDING_ALLOWED_FILE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ONBOARDING_PROFILE_PICTURE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const ONBOARDING_PROFILE_PICTURE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ONBOARDING_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const ONBOARDING_PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ONBOARDING_STATUSES = {
  invited: 'invited',
  inProgress: 'in_progress',
  submitted: 'submitted',
  approved: 'approved',
  changesRequested: 'changes_requested',
  rejected: 'rejected',
  converted: 'converted',
  expired: 'expired',
  cancelled: 'cancelled',
};

export function cleanText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function cleanEmail(value) {
  const normalized = cleanText(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function parseIntegerValue(value) {
  const normalized = cleanText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', 'yes', '1', 'on'].includes(normalized);
}

export function getFileExtension(fileName) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop()?.toLowerCase() || '';
}

export function sanitizeStorageSegment(value, fallback = 'file') {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-z0-9/_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

export function formatBytesToMb(value) {
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}

export function generateOnboardingToken() {
  return randomBytes(32).toString('hex');
}

export function hashOnboardingToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

export function buildOnboardingLink(token, appUrl = '') {
  return `${getAppUrl(appUrl)}/onboarding/${encodeURIComponent(token)}`;
}

export function getOnboardingInviteExpiryIso(hours = DEFAULT_ONBOARDING_TOKEN_EXPIRY_HOURS) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function validateOnboardingFile(file, label = 'File') {
  if (!file || typeof file === 'string' || file.size <= 0) return;

  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();

  if (!ONBOARDING_ALLOWED_FILE_EXTENSIONS.includes(extension) || !ONBOARDING_ALLOWED_FILE_MIME_TYPES.includes(mimeType)) {
    throw new Error(`${label} must be PDF, JPG, PNG, or WebP.`);
  }

  if (file.size > ONBOARDING_FILE_MAX_SIZE_BYTES) {
    throw new Error(`${label} must be smaller than ${formatBytesToMb(ONBOARDING_FILE_MAX_SIZE_BYTES)}.`);
  }
}

export function validateOnboardingProfilePicture(file, label = 'Profile picture') {
  if (!file || typeof file === 'string' || file.size <= 0) return;

  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();

  if (!ONBOARDING_PROFILE_PICTURE_ALLOWED_EXTENSIONS.includes(extension) || !ONBOARDING_PROFILE_PICTURE_ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`${label} must be JPG, PNG, or WebP.`);
  }

  if (file.size > ONBOARDING_PROFILE_PICTURE_MAX_SIZE_BYTES) {
    throw new Error(`${label} must be smaller than ${formatBytesToMb(ONBOARDING_PROFILE_PICTURE_MAX_SIZE_BYTES)}.`);
  }
}

export async function ensureOnboardingFilesBucket() {
  const { error } = await adminClient.storage.from(ONBOARDING_FILES_BUCKET).list('', { limit: 1 });
  if (!error) return;

  const normalizedMessage = String(error.message || '').toLowerCase();
  if (!normalizedMessage.includes('not found') && !normalizedMessage.includes('bucket')) {
    throw new Error(error.message || 'Failed to verify onboarding files bucket');
  }

  const { error: createError } = await adminClient.storage.createBucket(ONBOARDING_FILES_BUCKET, {
    public: true,
    fileSizeLimit: ONBOARDING_FILE_MAX_SIZE_BYTES,
    allowedMimeTypes: ONBOARDING_ALLOWED_FILE_MIME_TYPES,
  });

  if (createError && !String(createError.message || '').toLowerCase().includes('already')) {
    throw new Error(createError.message || 'Failed to create onboarding files bucket');
  }
}

export async function uploadOnboardingFile(file, onboardingRequestId, folder, label = 'File') {
  if (!file || typeof file === 'string' || file.size <= 0) {
    return null;
  }

  validateOnboardingFile(file, label);
  await ensureOnboardingFilesBucket();

  const fileExt = getFileExtension(file.name) || 'bin';
  const requestFolder = sanitizeStorageSegment(onboardingRequestId, 'request');
  const safeFolder = sanitizeStorageSegment(folder, 'misc');
  const storagePath = `${requestFolder}/${safeFolder}/${Date.now()}-${randomBytes(8).toString('hex')}.${fileExt}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from(ONBOARDING_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || `Failed to upload ${label.toLowerCase()}`);
  }

  const { data } = adminClient.storage.from(ONBOARDING_FILES_BUCKET).getPublicUrl(storagePath);
  return {
    file_name: file.name,
    file_path: storagePath,
    file_url: data?.publicUrl || '',
    file_size: file.size || null,
    mime_type: file.type || null,
  };
}

export async function uploadOnboardingProfilePicture(file, onboardingRequestId, folder = 'profile-picture', label = 'Profile picture') {
  if (!file || typeof file === 'string' || file.size <= 0) {
    return null;
  }

  validateOnboardingProfilePicture(file, label);
  await ensureOnboardingFilesBucket();

  const fileExt = getFileExtension(file.name) || 'jpg';
  const requestFolder = sanitizeStorageSegment(onboardingRequestId, 'request');
  const safeFolder = sanitizeStorageSegment(folder, 'profile-picture');
  const storagePath = `${requestFolder}/${safeFolder}/${Date.now()}-${randomBytes(8).toString('hex')}.${fileExt}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await adminClient.storage
    .from(ONBOARDING_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || `Failed to upload ${label.toLowerCase()}`);
  }

  const { data } = adminClient.storage.from(ONBOARDING_FILES_BUCKET).getPublicUrl(storagePath);
  return {
    file_name: file.name,
    file_path: storagePath,
    file_url: data?.publicUrl || '',
    file_size: file.size || null,
    mime_type: file.type || null,
  };
}

export async function removeOnboardingFiles(paths = []) {
  const normalizedPaths = [...new Set((paths || []).map((path) => cleanText(path)).filter(Boolean))];
  if (!normalizedPaths.length) return;
  await adminClient.storage.from(ONBOARDING_FILES_BUCKET).remove(normalizedPaths);
}

export async function copyOnboardingFileToEmployee(filePath, targetPath) {
  if (!filePath || !targetPath) return null;
  const { error } = await adminClient.storage.from(ONBOARDING_FILES_BUCKET).copy(filePath, targetPath);
  if (error) {
    throw new Error(error.message || 'Failed to copy onboarding file');
  }
  return targetPath;
}

export function normalizeOnboardingDocumentEntries(rows = []) {
  return ONBOARDING_DOCUMENT_TYPES.map((documentType) => {
    const record = (rows || []).find((row) => row.document_type === documentType.key) || null;
    return {
      key: documentType.key,
      label: documentType.label,
      id: record?.id || null,
      fileName: record?.file_name || '',
      fileUrl: record?.file_url || '',
      filePath: record?.file_path || '',
      fileSize: record?.file_size || null,
      mimeType: record?.mime_type || '',
    };
  });
}

export function mapOnboardingToAddEmployeePrefill(bundle) {
  const request = bundle?.request || {};
  const educationRows = Array.isArray(bundle?.education) ? bundle.education : [];
  const certificationRows = Array.isArray(bundle?.certifications) ? bundle.certifications : [];
  const documentRows = Array.isArray(bundle?.documents) ? bundle.documents : [];

  return {
    onboardingRequestId: request.id || '',
    form: {
      name: request.candidate_name || '',
      email: '',
      password: '',
      phone: request.phone || '',
      onboardingProfilePictureUrl: request.profile_picture_url || '',
      onboardingProfilePictureName: request.profile_picture_file_name || '',
      personalEmail: request.personal_email || request.candidate_email || '',
      dateOfBirth: request.date_of_birth ? String(request.date_of_birth).slice(0, 10) : '',
      gender: request.gender || '',
      bloodGroup: request.blood_group || '',
      fatherName: request.father_name || '',
      maritalStatus: request.marital_status || '',
      spouseName: request.spouse_name || '',
      nationality: request.nationality || 'Indian',
      religion: request.religion || '',
      isPhysicallyChallenged: request.is_physically_challenged ? 'Yes' : 'No',
      address: request.address || '',
      city: request.city || '',
      district: request.district || '',
      state: request.state || '',
      country: request.country || 'India',
      pincode: request.pincode || '',
      permanentAddress: request.permanent_address || '',
      permanentCity: request.permanent_city || '',
      permanentDistrict: request.permanent_district || '',
      permanentState: request.permanent_state || '',
      permanentCountry: request.permanent_country || 'India',
      permanentPincode: request.permanent_pincode || '',
      phone2: request.alternate_phone || '',
      mobile: request.mobile_phone || '',
      emergencyContactName: request.emergency_contact_name || '',
      emergencyContactNumber: request.emergency_contact_number || '',
      experienceCompanyName: request.experience_company_name || '',
      totalExperience: request.total_experience || '',
      aadhaarNumber: request.aadhaar_number || '',
      panNumber: request.pan_number || '',
      passportNumber: request.passport_number || '',
      bankAccountNumber: request.bank_account_number || '',
      bankAccountHolderName: request.bank_account_holder_name || '',
      bankIfscCode: request.bank_ifsc || '',
      bankName: request.bank_name || '',
    },
    educationEntries: educationRows.map((entry, index) => ({
      educationLevel: entry.education_level || ONBOARDING_EDUCATION_LEVELS[index] || 'graduation',
      institutionName: entry.institution_name || '',
      boardUniversity: entry.board_university || '',
      specialization: entry.specialization || '',
      passingYear: entry.passing_year ? String(entry.passing_year) : '',
      score: entry.score || '',
      fileName: entry.degree_file_name || '',
    })),
    certificationEntries: certificationRows.map((entry) => ({
      certificationName: entry.certification_name || '',
      issuer: entry.issuer || '',
      issuedYear: entry.issued_year ? String(entry.issued_year) : '',
      fileName: entry.certificate_file_name || '',
    })),
    documents: normalizeOnboardingDocumentEntries(documentRows),
  };
}

export async function logOnboardingEvent({
  onboardingRequestId,
  action,
  actorProfileId = null,
  note = null,
  metadata = {},
}) {
  if (!onboardingRequestId || !action) return;
  await adminClient.from('hrm_onboarding_review_events').insert({
    onboarding_request_id: onboardingRequestId,
    action,
    actor_profile_id: actorProfileId,
    note,
    metadata,
  });
}

export async function fetchOnboardingBundleById(id) {
  if (!id) return null;

  const [requestResult, educationResult, certificationResult, documentResult, eventResult] = await Promise.all([
    adminClient.from('hrm_onboarding_requests').select('*').eq('id', id).maybeSingle(),
    adminClient.from('hrm_onboarding_education').select('*').eq('onboarding_request_id', id).order('sort_order', { ascending: true }),
    adminClient.from('hrm_onboarding_certifications').select('*').eq('onboarding_request_id', id).order('sort_order', { ascending: true }),
    adminClient.from('hrm_onboarding_documents').select('*').eq('onboarding_request_id', id).order('document_type', { ascending: true }),
    adminClient.from('hrm_onboarding_review_events').select('*').eq('onboarding_request_id', id).order('created_at', { ascending: false }),
  ]);

  if (requestResult.error) {
    throw new Error(requestResult.error.message || 'Failed to load onboarding request');
  }
  if (!requestResult.data) return null;
  if (educationResult.error) throw new Error(educationResult.error.message || 'Failed to load onboarding education');
  if (certificationResult.error) throw new Error(certificationResult.error.message || 'Failed to load onboarding certifications');
  if (documentResult.error) throw new Error(documentResult.error.message || 'Failed to load onboarding documents');
  if (eventResult.error) throw new Error(eventResult.error.message || 'Failed to load onboarding review events');

  return {
    request: requestResult.data,
    education: educationResult.data || [],
    certifications: certificationResult.data || [],
    documents: documentResult.data || [],
    events: eventResult.data || [],
  };
}

export async function fetchOnboardingBundleByToken(token) {
  const tokenHash = hashOnboardingToken(token);
  const { data: request, error } = await adminClient
    .from('hrm_onboarding_requests')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load onboarding request');
  }

  if (!request?.id) {
    return null;
  }

  return fetchOnboardingBundleById(request.id);
}
