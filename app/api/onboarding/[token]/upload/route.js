import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  cleanText,
  fetchOnboardingBundleByToken,
  ONBOARDING_STATUSES,
  uploadOnboardingFile,
  uploadOnboardingProfilePicture,
  removeOnboardingFiles,
} from '@/utils/onboarding';

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const token = cleanText(resolvedParams?.token);
    
    // 1. Verify onboarding request is active and editable
    const bundle = await fetchOnboardingBundleByToken(token);
    if (!bundle?.request?.id) {
      return NextResponse.json({ error: 'This onboarding link is invalid or no longer available.' }, { status: 404 });
    }
    const current = bundle.request;
    if (![ONBOARDING_STATUSES.invited, ONBOARDING_STATUSES.inProgress, ONBOARDING_STATUSES.changesRequested].includes(current.status)) {
      return NextResponse.json({ error: 'This onboarding link can no longer be edited.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const uploadType = cleanText(formData.get('uploadType')); // 'profilePicture', 'education', 'certification', 'document'
    
    if (!file || typeof file === 'string' || file.size <= 0) {
      return NextResponse.json({ error: 'No file uploaded or file is empty.' }, { status: 400 });
    }

    // 2. Perform upload based on type
    if (uploadType === 'profilePicture') {
      const uploaded = await uploadOnboardingProfilePicture(file, current.id);
      if (!uploaded?.file_path) {
        return NextResponse.json({ error: 'Failed to upload profile picture.' }, { status: 500 });
      }

      // Remove previous profile picture if exists
      if (current.profile_picture_path && current.profile_picture_path !== uploaded.file_path) {
        await removeOnboardingFiles([current.profile_picture_path]);
      }

      // Update hrm_onboarding_requests table
      const { error: updateError } = await adminClient
        .from('hrm_onboarding_requests')
        .update({
          profile_picture_file_name: uploaded.file_name,
          profile_picture_url: uploaded.file_url,
          profile_picture_path: uploaded.file_path,
        })
        .eq('id', current.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Profile picture uploaded successfully.',
        file: uploaded,
      });
    }

    if (uploadType === 'education') {
      const educationLevel = cleanText(formData.get('educationLevel'));
      if (!educationLevel) {
        return NextResponse.json({ error: 'Missing education level.' }, { status: 400 });
      }

      const uploaded = await uploadOnboardingFile(
        file,
        current.id,
        `education/${educationLevel}`,
        `${educationLevel.replace(/_/g, ' ')} education file`
      );

      if (!uploaded?.file_path) {
        return NextResponse.json({ error: 'Failed to upload education file.' }, { status: 500 });
      }

      // Find existing education record for this level
      const { data: existing } = await adminClient
        .from('hrm_onboarding_education')
        .select('*')
        .eq('onboarding_request_id', current.id)
        .eq('education_level', educationLevel)
        .maybeSingle();

      if (existing?.degree_file_path && existing.degree_file_path !== uploaded.file_path) {
        await removeOnboardingFiles([existing.degree_file_path]);
      }

      const payload = {
        degree_file_name: uploaded.file_name,
        degree_file_url: uploaded.file_url,
        degree_file_path: uploaded.file_path,
      };

      let resultRecord;
      if (existing) {
        const { data: updated, error } = await adminClient
          .from('hrm_onboarding_education')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = updated;
      } else {
        const { data: inserted, error } = await adminClient
          .from('hrm_onboarding_education')
          .insert({
            onboarding_request_id: current.id,
            education_level: educationLevel,
            ...payload,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = inserted;
      }

      return NextResponse.json({
        message: 'Education document uploaded successfully.',
        record: resultRecord,
      });
    }

    if (uploadType === 'certification') {
      const certificationId = cleanText(formData.get('certificationId'));
      const certificationName = cleanText(formData.get('certificationName')) || 'Untitled Certification';
      
      if (!certificationId) {
        return NextResponse.json({ error: 'Missing certification entry ID.' }, { status: 400 });
      }

      const uploaded = await uploadOnboardingFile(
        file,
        current.id,
        'certifications',
        `${certificationName} certificate`
      );

      if (!uploaded?.file_path) {
        return NextResponse.json({ error: 'Failed to upload certification file.' }, { status: 500 });
      }

      // Check if certification with this ID exists
      const { data: existing } = await adminClient
        .from('hrm_onboarding_certifications')
        .select('*')
        .eq('onboarding_request_id', current.id)
        .eq('id', certificationId)
        .maybeSingle();

      if (existing?.certificate_file_path && existing.certificate_file_path !== uploaded.file_path) {
        await removeOnboardingFiles([existing.certificate_file_path]);
      }

      const payload = {
        certification_name: certificationName,
        certificate_file_name: uploaded.file_name,
        certificate_file_url: uploaded.file_url,
        certificate_file_path: uploaded.file_path,
      };

      let resultRecord;
      if (existing) {
        const { data: updated, error } = await adminClient
          .from('hrm_onboarding_certifications')
          .update(payload)
          .eq('id', certificationId)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = updated;
      } else {
        const { data: inserted, error } = await adminClient
          .from('hrm_onboarding_certifications')
          .insert({
            id: certificationId,
            onboarding_request_id: current.id,
            ...payload,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = inserted;
      }

      return NextResponse.json({
        message: 'Certification uploaded successfully.',
        record: resultRecord,
      });
    }

    if (uploadType === 'document') {
      const documentType = cleanText(formData.get('documentType'));
      if (!documentType) {
        return NextResponse.json({ error: 'Missing document type.' }, { status: 400 });
      }

      const uploaded = await uploadOnboardingFile(
        file,
        current.id,
        `documents/${documentType}`,
        documentType.replace(/_/g, ' ')
      );

      if (!uploaded?.file_path) {
        return NextResponse.json({ error: 'Failed to upload document.' }, { status: 500 });
      }

      // Check if document exists
      const { data: existing } = await adminClient
        .from('hrm_onboarding_documents')
        .select('*')
        .eq('onboarding_request_id', current.id)
        .eq('document_type', documentType)
        .maybeSingle();

      if (existing?.file_path && existing.file_path !== uploaded.file_path) {
        await removeOnboardingFiles([existing.file_path]);
      }

      const payload = {
        file_name: uploaded.file_name,
        file_url: uploaded.file_url,
        file_path: uploaded.file_path,
        file_size: uploaded.file_size,
        mime_type: uploaded.mime_type,
      };

      let resultRecord;
      if (existing) {
        const { data: updated, error } = await adminClient
          .from('hrm_onboarding_documents')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = updated;
      } else {
        const { data: inserted, error } = await adminClient
          .from('hrm_onboarding_documents')
          .insert({
            onboarding_request_id: current.id,
            document_type: documentType,
            ...payload,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        resultRecord = inserted;
      }

      return NextResponse.json({
        message: 'Document uploaded successfully.',
        record: resultRecord,
      });
    }

    return NextResponse.json({ error: 'Invalid upload type.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to upload file.' }, { status: 500 });
  }
}
