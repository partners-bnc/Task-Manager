import { adminClient } from '@/utils/supabase/admin';

export const HRM_POLICY_DOCUMENTS_BUCKET = 'hrm-policy-documents';
export const HRM_POLICY_FILE_SIZE_LIMIT = 20 * 1024 * 1024;
export const HRM_POLICY_ALLOWED_MIME_TYPES = [
  'application/pdf',
];

export function sanitizeStorageFileName(fileName = '') {
  return String(fileName || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 160) || 'file';
}

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

export async function ensurePolicyDocumentsBucketAccessible() {
  const { error } = await adminClient.storage.from(HRM_POLICY_DOCUMENTS_BUCKET).list('', { limit: 1 });
  if (error) {
    if (isBucketNotFoundError(error)) {
      throw new Error('Policy documents bucket is missing. Apply the policy manual migration first.');
    }
    throw new Error(error.message || 'Policy documents bucket is not accessible.');
  }
}

export function validatePolicyUpload(file) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('A valid policy document is required.');
  }

  if (file.size > HRM_POLICY_FILE_SIZE_LIMIT) {
    throw new Error(`${file.name} exceeds the 20 MB file size limit.`);
  }

  if (file.type && !HRM_POLICY_ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`${file.name} is not a supported file type.`);
  }
}

function mapDocumentRow(row = {}) {
  const publicUrl = row.storage_bucket && row.storage_path
    ? adminClient.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data?.publicUrl || ''
    : '';

  return {
    id: row.id,
    policyId: row.policy_id,
    fileName: row.file_name || '',
    mimeType: row.mime_type || '',
    fileSizeBytes: row.file_size_bytes || 0,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
    viewUrl: publicUrl,
    downloadUrl: publicUrl,
  };
}

function mapPolicyRow(row = {}, documentsByPolicyId = {}) {
  const documents = documentsByPolicyId[row.id] || [];
  return {
    id: row.id,
    title: row.title || '',
    summary: row.summary || '',
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || row.created_at || null,
    documentCount: documents.length,
    documents,
  };
}

export async function listPolicies({ publishedOnly = false } = {}) {
  let query = adminClient
    .from('hrm_policies')
    .select('*')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (publishedOnly) {
    query = query.eq('is_published', true);
  }

  const { data: policyRows, error: policyError } = await query;
  if (policyError) {
    throw new Error(policyError.message || 'Failed to load policies.');
  }

  const policies = policyRows || [];
  if (!policies.length) {
    return [];
  }

  const policyIds = policies.map((policy) => policy.id);
  const { data: documentRows, error: documentError } = await adminClient
    .from('hrm_policy_documents')
    .select('*')
    .in('policy_id', policyIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (documentError) {
    throw new Error(documentError.message || 'Failed to load policy documents.');
  }

  const documentsByPolicyId = (documentRows || []).reduce((map, row) => {
    if (!map[row.policy_id]) {
      map[row.policy_id] = [];
    }
    map[row.policy_id].push(mapDocumentRow(row));
    return map;
  }, {});

  return policies.map((row) => mapPolicyRow(row, documentsByPolicyId));
}

export async function uploadPolicyFiles({ policyId, files = [], actorProfileId = null, startingSortOrder = 0 }) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  await ensurePolicyDocumentsBucketAccessible();

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const [index, file] of files.entries()) {
      validatePolicyUpload(file);
      const documentId = crypto.randomUUID();
      const safeName = sanitizeStorageFileName(file.name);
      const storagePath = `policies/${policyId}/${Date.now()}_${documentId}_${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage
        .from(HRM_POLICY_DOCUMENTS_BUCKET)
        .upload(storagePath, bytes, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || `Failed to upload ${file.name}`);
      }

      uploadedPaths.push(storagePath);
      attachmentRows.push({
        id: documentId,
        policy_id: policyId,
        file_name: file.name,
        storage_bucket: HRM_POLICY_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_size_bytes: file.size || null,
        sort_order: startingSortOrder + index,
        uploaded_by: actorProfileId,
      });
    }

    const { data, error } = await adminClient
      .from('hrm_policy_documents')
      .insert(attachmentRows)
      .select('*');

    if (error) {
      throw new Error(error.message || 'Failed to save policy document records.');
    }

    return (data || []).map(mapDocumentRow);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await adminClient.storage.from(HRM_POLICY_DOCUMENTS_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function createPolicy({ title, summary, isPublished = true, files = [], actorProfileId = null }) {
  const { data: createdPolicy, error: createError } = await adminClient
    .from('hrm_policies')
    .insert({
      title,
      summary,
      is_published: isPublished,
      created_by: actorProfileId,
      updated_by: actorProfileId,
    })
    .select('*')
    .single();

  if (createError || !createdPolicy) {
    throw new Error(createError?.message || 'Failed to create policy.');
  }

  try {
    if (files.length > 0) {
      await uploadPolicyFiles({
        policyId: createdPolicy.id,
        files,
        actorProfileId,
        startingSortOrder: 0,
      });
    }
  } catch (error) {
    await adminClient.from('hrm_policies').delete().eq('id', createdPolicy.id);
    throw error;
  }

  const [policy] = await Promise.all([
    listPolicies({ publishedOnly: false }).then((rows) => rows.find((row) => row.id === createdPolicy.id) || null),
  ]);

  if (!policy) {
    throw new Error('Policy was created but could not be loaded.');
  }

  return policy;
}

export async function updatePolicy({ policyId, title, summary, isPublished = true, files = [], actorProfileId = null }) {
  const { data: updatedPolicy, error: updateError } = await adminClient
    .from('hrm_policies')
    .update({
      title,
      summary,
      is_published: isPublished,
      updated_by: actorProfileId,
    })
    .eq('id', policyId)
    .select('*')
    .single();

  if (updateError || !updatedPolicy) {
    throw new Error(updateError?.message || 'Failed to update policy.');
  }

  if (files.length > 0) {
    const { count, error: countError } = await adminClient
      .from('hrm_policy_documents')
      .select('*', { count: 'exact', head: true })
      .eq('policy_id', policyId);

    if (countError) {
      throw new Error(countError.message || 'Failed to calculate policy document order.');
    }

    await uploadPolicyFiles({
      policyId,
      files,
      actorProfileId,
      startingSortOrder: count || 0,
    });
  }

  const policy = (await listPolicies({ publishedOnly: false })).find((row) => row.id === policyId) || null;
  if (!policy) {
    throw new Error('Updated policy could not be loaded.');
  }

  return policy;
}

export async function deletePolicy(policyId) {
  const { data: documents, error: documentError } = await adminClient
    .from('hrm_policy_documents')
    .select('storage_bucket, storage_path')
    .eq('policy_id', policyId);

  if (documentError) {
    throw new Error(documentError.message || 'Failed to load policy documents.');
  }

  const storagePaths = (documents || [])
    .filter((row) => row.storage_bucket === HRM_POLICY_DOCUMENTS_BUCKET && row.storage_path)
    .map((row) => row.storage_path);

  if (storagePaths.length > 0) {
    await adminClient.storage.from(HRM_POLICY_DOCUMENTS_BUCKET).remove(storagePaths);
  }

  const { error } = await adminClient.from('hrm_policies').delete().eq('id', policyId);
  if (error) {
    throw new Error(error.message || 'Failed to delete policy.');
  }
}

export async function deletePolicyDocument({ policyId, documentId }) {
  const { data: document, error: documentError } = await adminClient
    .from('hrm_policy_documents')
    .select('*')
    .eq('policy_id', policyId)
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message || 'Policy document not found.');
  }

  if (document.storage_bucket === HRM_POLICY_DOCUMENTS_BUCKET && document.storage_path) {
    await adminClient.storage.from(HRM_POLICY_DOCUMENTS_BUCKET).remove([document.storage_path]);
  }

  const { error: deleteError } = await adminClient
    .from('hrm_policy_documents')
    .delete()
    .eq('policy_id', policyId)
    .eq('id', documentId);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to delete policy document.');
  }
}
