import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  cleanEmail,
  cleanText,
  fetchOnboardingBundleById,
  fetchOnboardingBundleByToken,
  logOnboardingEvent,
  ONBOARDING_DOCUMENT_TYPES,
  ONBOARDING_EDUCATION_LEVELS,
  ONBOARDING_STATUSES,
  parseBoolean,
  parseIntegerValue,
  removeOnboardingFiles,
  uploadOnboardingFile,
  uploadOnboardingProfilePicture,
} from '@/utils/onboarding';

const onboardingRequestColumnSupportPromises = new Map();

async function supportsOnboardingRequestColumn(columnName) {
  if (!onboardingRequestColumnSupportPromises.has(columnName)) {
    const promise = (async () => {
      const infoSchemaResult = await adminClient
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'hrm_onboarding_requests')
        .eq('column_name', columnName)
        .limit(1);

      if (!infoSchemaResult.error && infoSchemaResult.data?.length) {
        return true;
      }

      const probeResult = await adminClient
        .from('hrm_onboarding_requests')
        .select(columnName)
        .limit(1);

      if (!probeResult.error) {
        return true;
      }

      const message = String(probeResult.error?.message || '').toLowerCase();
      if (
        message.includes('schema cache') ||
        message.includes('could not find the column') ||
        (message.includes('column') && message.includes('does not exist'))
      ) {
        return false;
      }

      throw new Error(probeResult.error?.message || `Failed to inspect onboarding column ${columnName}`);
    })();

    onboardingRequestColumnSupportPromises.set(columnName, promise);
  }

  return onboardingRequestColumnSupportPromises.get(columnName);
}

function parseJsonArray(value) {
  const normalized = cleanText(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isRequestExpired(request) {
  if (!request?.token_expires_at) return false;
  return new Date(request.token_expires_at).getTime() < Date.now();
}

async function loadActiveTokenBundle(token) {
  const bundle = await fetchOnboardingBundleByToken(token);
  if (!bundle?.request?.id) {
    return { error: NextResponse.json({ error: 'This onboarding link is invalid or no longer available.' }, { status: 404 }) };
  }

  const { request } = bundle;
  if ([ONBOARDING_STATUSES.cancelled, ONBOARDING_STATUSES.rejected, ONBOARDING_STATUSES.converted].includes(request.status)) {
    return { error: NextResponse.json({ error: 'This onboarding link is no longer available.' }, { status: 410 }) };
  }

  if (isRequestExpired(request)) {
    if (request.status !== ONBOARDING_STATUSES.expired) {
      await adminClient.from('hrm_onboarding_requests').update({ status: ONBOARDING_STATUSES.expired }).eq('id', request.id);
      await logOnboardingEvent({
        onboardingRequestId: request.id,
        action: 'expired',
        note: 'Onboarding link expired before submission.',
      });
    }
    return { error: NextResponse.json({ error: 'This onboarding link has expired.' }, { status: 410 }) };
  }

  return { bundle };
}

function serializeCandidateBundle(bundle) {
  return {
    request: bundle.request,
    education: bundle.education || [],
    certifications: bundle.certifications || [],
    documents: bundle.documents || [],
  };
}

async function replaceOnboardingEducation(requestId, oldRows, entries, formData) {
  const nextRows = [];
  const keepPaths = new Set();

  for (const [index, entry] of entries.entries()) {
    const level = cleanText(entry.educationLevel) || ONBOARDING_EDUCATION_LEVELS[index] || 'graduation';
    const existing = (oldRows || []).find((row) => row.id === entry.id || row.education_level === level) || null;
    const file = formData.get(entry.fileKey || '');
    const uploaded = await uploadOnboardingFile(file, requestId, `education/${level}`, `${level.replace(/_/g, ' ')} education file`);
    const resolved = uploaded || (existing ? {
      file_name: existing.degree_file_name,
      file_url: existing.degree_file_url,
      file_path: existing.degree_file_path,
    } : null);

    if (resolved?.file_path) keepPaths.add(resolved.file_path);
    nextRows.push({
      onboarding_request_id: requestId,
      sort_order: index,
      education_level: level,
      institution_name: cleanText(entry.institutionName),
      board_university: cleanText(entry.boardUniversity),
      specialization: cleanText(entry.specialization),
      passing_year: parseIntegerValue(entry.passingYear),
      score: cleanText(entry.score),
      degree_file_name: resolved?.file_name || null,
      degree_file_url: resolved?.file_url || null,
      degree_file_path: resolved?.file_path || null,
    });
  }

  const removedPaths = (oldRows || [])
    .map((row) => row.degree_file_path)
    .filter((path) => path && !keepPaths.has(path));

  if (removedPaths.length) {
    await removeOnboardingFiles(removedPaths);
  }

  await adminClient.from('hrm_onboarding_education').delete().eq('onboarding_request_id', requestId);
  if (nextRows.length) {
    const { error } = await adminClient.from('hrm_onboarding_education').insert(nextRows);
    if (error) throw new Error(error.message || 'Failed to save onboarding education');
  }
}

async function replaceOnboardingCertifications(requestId, oldRows, entries, formData) {
  const nextRows = [];
  const keepPaths = new Set();

  for (const [index, entry] of entries.entries()) {
    const name = cleanText(entry.certificationName);
    if (!name) continue;

    const existing = (oldRows || []).find((row) => row.id === entry.id || row.certification_name === name) || null;
    const file = formData.get(entry.fileKey || '');
    const uploaded = await uploadOnboardingFile(file, requestId, 'certifications', `${name} certificate`);
    const resolved = uploaded || (existing ? {
      file_name: existing.certificate_file_name,
      file_url: existing.certificate_file_url,
      file_path: existing.certificate_file_path,
    } : null);

    if (resolved?.file_path) keepPaths.add(resolved.file_path);
    nextRows.push({
      onboarding_request_id: requestId,
      sort_order: index,
      certification_name: name,
      issuer: cleanText(entry.issuer),
      issued_year: parseIntegerValue(entry.issuedYear),
      certificate_file_name: resolved?.file_name || null,
      certificate_file_url: resolved?.file_url || null,
      certificate_file_path: resolved?.file_path || null,
    });
  }

  const removedPaths = (oldRows || [])
    .map((row) => row.certificate_file_path)
    .filter((path) => path && !keepPaths.has(path));

  if (removedPaths.length) {
    await removeOnboardingFiles(removedPaths);
  }

  await adminClient.from('hrm_onboarding_certifications').delete().eq('onboarding_request_id', requestId);
  if (nextRows.length) {
    const { error } = await adminClient.from('hrm_onboarding_certifications').insert(nextRows);
    if (error) throw new Error(error.message || 'Failed to save onboarding certifications');
  }
}

async function replaceOnboardingDocuments(requestId, oldRows, formData) {
  const nextRows = [];
  const keepPaths = new Set();

  for (const documentType of ONBOARDING_DOCUMENT_TYPES) {
    const existing = (oldRows || []).find((row) => row.document_type === documentType.key) || null;
    const file = formData.get(`document_${documentType.key}`);
    const uploaded = await uploadOnboardingFile(file, requestId, `documents/${documentType.key}`, documentType.label);
    const resolved = uploaded || (existing ? {
      file_name: existing.file_name,
      file_url: existing.file_url,
      file_path: existing.file_path,
      file_size: existing.file_size,
      mime_type: existing.mime_type,
    } : null);

    if (!resolved?.file_path) continue;
    keepPaths.add(resolved.file_path);
    nextRows.push({
      onboarding_request_id: requestId,
      document_type: documentType.key,
      file_name: resolved.file_name,
      file_url: resolved.file_url || null,
      file_path: resolved.file_path,
      file_size: resolved.file_size || null,
      mime_type: resolved.mime_type || null,
    });
  }

  const removedPaths = (oldRows || [])
    .map((row) => row.file_path)
    .filter((path) => path && !keepPaths.has(path));

  if (removedPaths.length) {
    await removeOnboardingFiles(removedPaths);
  }

  await adminClient.from('hrm_onboarding_documents').delete().eq('onboarding_request_id', requestId);
  if (nextRows.length) {
    const { error } = await adminClient.from('hrm_onboarding_documents').insert(nextRows);
    if (error) throw new Error(error.message || 'Failed to save onboarding documents');
  }
}

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const token = cleanText(resolvedParams?.token);
    const result = await loadActiveTokenBundle(token);
    if (result.error) return result.error;
    return NextResponse.json(serializeCandidateBundle(result.bundle), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load onboarding form' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const token = cleanText(resolvedParams?.token);
    const active = await loadActiveTokenBundle(token);
    if (active.error) return active.error;

    const bundle = active.bundle;
    const current = bundle.request;
    if (![ONBOARDING_STATUSES.invited, ONBOARDING_STATUSES.inProgress, ONBOARDING_STATUSES.changesRequested].includes(current.status)) {
      return NextResponse.json({ error: 'This onboarding link can no longer be edited.' }, { status: 400 });
    }

    const formData = await request.formData();
    const action = cleanText(formData.get('action')) || 'save_draft';
    const educationEntries = parseJsonArray(formData.get('educationEntries'));
    const certificationEntries = parseJsonArray(formData.get('certificationEntries'));
    const profilePictureColumnsSupported = await supportsOnboardingRequestColumn('profile_picture_file_name');
    const profilePicture = formData.get('profilePicture');
    const uploadedProfilePicture = profilePictureColumnsSupported
      ? await uploadOnboardingProfilePicture(profilePicture, current.id)
      : null;
    if (profilePictureColumnsSupported && uploadedProfilePicture?.file_path && current.profile_picture_path && current.profile_picture_path !== uploadedProfilePicture.file_path) {
      await removeOnboardingFiles([current.profile_picture_path]);
    }
    const resolvedProfilePicture = profilePictureColumnsSupported
      ? (uploadedProfilePicture || (current.profile_picture_path ? {
          file_name: current.profile_picture_file_name,
          file_url: current.profile_picture_url,
          file_path: current.profile_picture_path,
        } : null))
      : null;

    const payload = {
      candidate_name: cleanText(formData.get('name')) || current.candidate_name,
      candidate_email: cleanEmail(formData.get('candidateEmail')) || current.candidate_email,
      personal_email: cleanEmail(formData.get('personalEmail')),
      date_of_birth: cleanText(formData.get('dateOfBirth')),
      gender: cleanText(formData.get('gender')),
      blood_group: cleanText(formData.get('bloodGroup')),
      father_name: cleanText(formData.get('fatherName')),
      marital_status: cleanText(formData.get('maritalStatus')),
      spouse_name: cleanText(formData.get('spouseName')),
      nationality: cleanText(formData.get('nationality')),
      religion: cleanText(formData.get('religion')),
      is_physically_challenged: formData.get('isPhysicallyChallenged') ? parseBoolean(formData.get('isPhysicallyChallenged')) : null,
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
      phone: cleanText(formData.get('phone')),
      alternate_phone: cleanText(formData.get('phone2')),
      mobile_phone: cleanText(formData.get('mobile')),
      emergency_contact_name: cleanText(formData.get('emergencyContactName')),
      emergency_contact_number: cleanText(formData.get('emergencyContactNumber')),
      experience_company_name: cleanText(formData.get('experienceCompanyName')),
      total_experience: cleanText(formData.get('totalExperience')),
      aadhaar_number: cleanText(formData.get('aadhaarNumber')),
      pan_number: cleanText(formData.get('panNumber'))?.toUpperCase() || null,
      passport_number: cleanText(formData.get('passportNumber')),
      bank_account_number: cleanText(formData.get('bankAccountNumber')),
      bank_account_holder_name: cleanText(formData.get('bankAccountHolderName')),
      bank_ifsc: cleanText(formData.get('bankIfscCode')),
      bank_name: cleanText(formData.get('bankName')),
      declaration_name: cleanText(formData.get('declarationName')),
      declaration_accepted: parseBoolean(formData.get('declarationAccepted')),
      declaration_date: cleanText(formData.get('declarationDate')),
      status: action === 'submit' ? ONBOARDING_STATUSES.submitted : current.status === ONBOARDING_STATUSES.invited ? ONBOARDING_STATUSES.inProgress : current.status,
      submitted: action === 'submit',
      submitted_at: action === 'submit' ? new Date().toISOString() : null,
      token_hash: action === 'submit' ? null : current.token_hash,
      token_expires_at: action === 'submit' ? new Date().toISOString() : current.token_expires_at,
      archived_at: null,
    };

    if (profilePictureColumnsSupported) {
      payload.profile_picture_file_name = resolvedProfilePicture?.file_name || null;
      payload.profile_picture_url = resolvedProfilePicture?.file_url || null;
      payload.profile_picture_path = resolvedProfilePicture?.file_path || null;
    }

    if (action === 'submit' && !payload.declaration_accepted) {
      return NextResponse.json({ error: 'Please accept the declaration before submitting.' }, { status: 400 });
    }

    await replaceOnboardingEducation(current.id, bundle.education || [], educationEntries, formData);
    await replaceOnboardingCertifications(current.id, bundle.certifications || [], certificationEntries, formData);
    await replaceOnboardingDocuments(current.id, bundle.documents || [], formData);

    const { error: updateError } = await adminClient
      .from('hrm_onboarding_requests')
      .update(payload)
      .eq('id', current.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to save onboarding form' }, { status: 500 });
    }

    await logOnboardingEvent({
      onboardingRequestId: current.id,
      action: action === 'submit' ? 'submitted' : 'draft_saved',
      note: action === 'submit' ? 'Candidate submitted onboarding form.' : 'Candidate saved onboarding draft.',
    });

    const refreshed = await fetchOnboardingBundleById(current.id);
    return NextResponse.json(
      {
        message: action === 'submit' ? 'Onboarding form submitted successfully.' : 'Draft saved successfully.',
        ...(action === 'submit' ? {} : serializeCandidateBundle(refreshed)),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to save onboarding form' }, { status: 500 });
  }
}
