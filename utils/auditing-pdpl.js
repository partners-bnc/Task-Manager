import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';

export const AUDITING_PDPL_DOCUMENTS_BUCKET = 'auditing-pdpl-documents';
export const AUDITING_PDPL_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const AUDITING_PDPL_FILE_SIZE_LIMIT = 20 * 1024 * 1024;

export const PDPL_PROJECT_STATUSES = ['active', 'completed', 'archived'];
export const PDPL_CONTROL_STATUSES = ['Completed', 'In Progress', 'Not Started'];
export const PDPL_POLICY_STATUSES = ['Approved', 'Pending', 'Draft', 'Rejected'];
export const PDPL_DOCUMENT_RECEIPT_STATUSES = ['Received', 'Not Received'];
export const PDPL_DOCUMENT_EXECUTION_STATUSES = ['Complete', 'Incomplete', 'In Progress', 'Not Started'];
export const PDPL_SECTIONS = ['gantt', 'controls', 'policies', 'documents'];

export const PDPL_SECTION_TABLES = {
  gantt: 'auditing_pdpl_gantt_tasks',
  controls: 'auditing_pdpl_controls',
  policies: 'auditing_pdpl_policies',
  documents: 'auditing_pdpl_documents',
};

export const PDPL_SECTION_SORT_KEY = {
  gantt: 'sort_order',
  controls: 'sort_order',
  policies: 'sort_order',
  documents: 'sort_order',
};

const EMPLOYEE_DIRECTORY_SELECT = `
  id,
  employee_id,
  name,
  email,
  role,
  profile_picture_url,
  designation:hrm_designations (
    title
  ),
  module_access:hrm_module_access!module_access_employee_id_fkey (
    auditing
  )
`;

function getEmployeeModuleAccessRecord(employee) {
  if (!employee?.module_access) return null;
  return Array.isArray(employee.module_access) ? employee.module_access[0] || null : employee.module_access;
}

export function isMissingPdplSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('auditing_pdpl_') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

export async function ensurePdplDocumentsBucketAccessible() {
  const { error } = await adminClient.storage.from(AUDITING_PDPL_DOCUMENTS_BUCKET).list('', { limit: 1 });
  if (error) {
    if (isBucketNotFoundError(error)) {
      throw new Error('PDPL documents bucket is missing. Apply the PDPL audit migration first.');
    }
    throw new Error(error.message || 'PDPL documents bucket is not accessible.');
  }
}

export function sanitizeStorageFileName(fileName = '') {
  return String(fileName || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 160) || 'file';
}

export function validatePdplUpload(file) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('A valid document file is required.');
  }
  if (file.size > AUDITING_PDPL_FILE_SIZE_LIMIT) {
    throw new Error(`${file.name} exceeds the 20 MB file size limit.`);
  }
}

export function normalizeMultiValue(input) {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof input === 'string') {
    return Array.from(
      new Set(
        input
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

function normalizeNumeric(input, fallback = 0) {
  const number = Number(input);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePercentDoneValue(input, fallback = 0) {
  if (input === null || input === undefined || input === '') {
    return fallback;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return fallback;
    const normalized = input > 0 && input <= 1 ? input * 100 : input;
    return normalized;
  }

  const text = String(input || '').trim();
  if (!text) return fallback;

  const hasPercentSymbol = text.includes('%');
  const numeric = Number(text.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) return fallback;

  if (!hasPercentSymbol && text.includes('.') && numeric > 0 && numeric <= 1) {
    return numeric * 100;
  }

  return numeric;
}

function calculateRemainingPercentValue(percentDone) {
  const normalizedDone = Math.max(0, Math.min(100, normalizePercentDoneValue(percentDone, 0)));
  return Number.parseFloat((100 - normalizedDone).toFixed(2));
}

function normalizeStatus(input, allowed, fallback) {
  const value = String(input || '').trim();
  return allowed.includes(value) ? value : fallback;
}

function normalizeDate(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function buildPdplActor(authContext) {
  if (!authContext?.userId) return null;

  if (authContext.accountType === 'hr_admin' || authContext.accountType === 'super_admin') {
    return {
      authUserId: authContext.userId,
      employeeId: authContext.employee?.id || null,
      accountType: authContext.accountType,
      name: authContext.user?.name || authContext.user?.email || 'Admin',
      email: authContext.user?.email || '',
      avatarUrl: authContext.user?.avatarUrl || '',
      canManageAll: true,
      hasAuditingAccess: true,
    };
  }

  if (authContext.accountType === 'employee' && hasLinkedEmployeeAccess(authContext)) {
    const moduleAccess = getEmployeeModuleAccessRecord(authContext.employee);
    if (!moduleAccess?.auditing) {
      return null;
    }

    return {
      authUserId: authContext.userId,
      employeeId: authContext.employee.id,
      accountType: 'employee',
      name: authContext.employee.name || authContext.user?.name || authContext.user?.email || 'Employee',
      email: authContext.employee.email || authContext.user?.email || '',
      avatarUrl: authContext.employee.profile_picture_url || authContext.user?.avatarUrl || '',
      canManageAll: false,
      hasAuditingAccess: true,
    };
  }

  return null;
}

export async function requirePdplActor() {
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

  const actor = buildPdplActor(authContext);
  if (!actor) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { actor, authContext };
}

export async function listPdplAuditingMembers() {
  const { data, error } = await adminClient
    .from('hrm_employees')
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message || 'Failed to load auditing members.');

  return (data || [])
    .filter((employee) => Boolean(getEmployeeModuleAccessRecord(employee)?.auditing))
    .map((employee) => ({
      id: employee.id,
      employeeId: employee.employee_id || '',
      name: employee.name || '',
      email: employee.email || '',
      role: employee.role || employee.designation?.title || 'Employee',
      designation: employee.designation?.title || '',
      profilePictureUrl: employee.profile_picture_url || null,
    }));
}

export async function listVisiblePdplProjects(actor) {
  if (actor.canManageAll) {
    const { data, error } = await adminClient
      .from('auditing_pdpl_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  const { data, error } = await adminClient
    .from('auditing_pdpl_project_members')
    .select(`
      project:auditing_pdpl_projects!inner (*)
    `)
    .eq('employee_id', actor.employeeId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => row.project).filter(Boolean);
}

export async function assertPdplProjectAccess(projectId, actor) {
  const { data: project, error } = await adminClient
    .from('auditing_pdpl_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!project) {
    throw new Error('PDPL project not found.');
  }

  if (actor.canManageAll) {
    return project;
  }

  const { data: membership, error: membershipError } = await adminClient
    .from('auditing_pdpl_project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('employee_id', actor.employeeId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) {
    throw new Error('You do not have access to this PDPL project.');
  }

  return project;
}

export async function listPdplProjectMembers(projectId) {
  const { data, error } = await adminClient
    .from('auditing_pdpl_project_members')
    .select(`
      id,
      employee_id,
      role_in_project,
      assigned_at,
      employee:hrm_employees!auditing_pdpl_project_members_employee_id_fkey (
        id,
        employee_id,
        name,
        email,
        role,
        profile_picture_url
      )
    `)
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    roleInProject: row.role_in_project || '',
    assignedAt: row.assigned_at,
    member: {
      id: row.employee?.id || row.employee_id,
      employeeCode: row.employee?.employee_id || '',
      name: row.employee?.name || '',
      email: row.employee?.email || '',
      role: row.employee?.role || 'Employee',
      profilePictureUrl: row.employee?.profile_picture_url || null,
    },
  }));
}

export async function loadPdplSectionRows(projectId, section) {
  if (!PDPL_SECTION_TABLES[section]) {
    throw new Error('Unsupported PDPL section.');
  }

  if (section === 'gantt') {
    const { data: rows, error } = await adminClient
      .from('auditing_pdpl_gantt_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const taskIds = (rows || []).map((row) => row.id);
    let memberRows = [];
    if (taskIds.length > 0) {
      const result = await adminClient
        .from('auditing_pdpl_gantt_task_members')
        .select(`
          task_id,
          employee_id,
          employee:hrm_employees!auditing_pdpl_gantt_task_members_employee_id_fkey (
            id,
            name,
            employee_id,
            profile_picture_url
          )
        `)
        .in('task_id', taskIds);
      if (result.error) throw result.error;
      memberRows = result.data || [];
    }

    const membersByTaskId = memberRows.reduce((map, row) => {
      if (!map[row.task_id]) map[row.task_id] = [];
      map[row.task_id].push({
        employeeId: row.employee_id,
        name: row.employee?.name || '',
        employeeCode: row.employee?.employee_id || '',
        profilePictureUrl: row.employee?.profile_picture_url || null,
      });
      return map;
    }, {});

    return (rows || []).map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      label: row.label_code || '',
      taskName: row.task_name || '',
      indiaTeam: row.india_team || '',
      ksaTeam: row.ksa_team || '',
      memberAssignEmployeeIds: (membersByTaskId[row.id] || []).map((member) => member.employeeId),
      memberAssignNames: (membersByTaskId[row.id] || []).map((member) => member.name),
      memberAssign: (membersByTaskId[row.id] || []).map((member) => member.name).join(', '),
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      percentDone: normalizePercentDoneValue(row.percent_done, 0),
      isDone: Boolean(row.is_done),
      doneMarkedOn: row.done_marked_on || '',
      doneMarkedBy: row.done_marked_by || null,
      workDays: row.work_days ?? 0,
      remaining: calculateRemainingPercentValue(row.percent_done),
      remark: row.remark || '',
    }));
  }

  if (section === 'documents') {
    const { data: rows, error } = await adminClient
      .from('auditing_pdpl_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const documentIds = (rows || []).map((row) => row.id);
    let attachmentRows = [];
    if (documentIds.length > 0) {
      const result = await adminClient
        .from('auditing_pdpl_document_attachments')
        .select('*')
        .in('document_id', documentIds)
        .order('created_at', { ascending: true });
      if (result.error) throw result.error;
      attachmentRows = result.data || [];
    }

    const attachmentsByDocumentId = attachmentRows.reduce((map, row) => {
      if (!map[row.document_id]) map[row.document_id] = [];
      map[row.document_id].push({
        id: row.id,
        bucket: row.storage_bucket,
        storagePath: row.storage_path,
        fileName: row.file_name,
        mimeType: row.mime_type || '',
        fileSizeBytes: row.file_size_bytes || 0,
        createdAt: row.created_at,
        viewUrl: adminClient.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data?.publicUrl || '',
      });
      return map;
    }, {});

    return (rows || []).map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      serialNo: row.serial_no || '',
      documentName: row.document_name || '',
      status: row.status || 'Incomplete',
      documentStatus: row.document_status || 'Not Received',
      attachments: attachmentsByDocumentId[row.id] || [],
    }));
  }

  const table = PDPL_SECTION_TABLES[section];
  const { data, error } = await adminClient
    .from(table)
    .select('*')
    .eq('project_id', projectId)
    .order(PDPL_SECTION_SORT_KEY[section], { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (section === 'controls') {
    return (data || []).map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      serialNo: row.serial_no || '',
      category: row.category || '',
      title: row.title || '',
      status: row.status || 'Not Started',
    }));
  }

  return (data || []).map((row) => ({
    id: row.id,
    sortOrder: row.sort_order,
    serialNo: row.serial_no || '',
    policyName: row.policy_name || '',
    status: row.status || 'Pending',
    documentStatus: row.document_status || 'Not Received',
  }));
}

export async function loadPdplProject(projectId, actor) {
  const project = await assertPdplProjectAccess(projectId, actor);
  const [members, ganttRows, controlRows, policyRows, documentRows] = await Promise.all([
    listPdplProjectMembers(projectId),
    loadPdplSectionRows(projectId, 'gantt'),
    loadPdplSectionRows(projectId, 'controls'),
    loadPdplSectionRows(projectId, 'policies'),
    loadPdplSectionRows(projectId, 'documents'),
  ]);

  return {
    id: project.id,
    projectName: project.project_name,
    clientName: project.client_name,
    projectLeader: project.project_leader,
    projectStartDate: project.project_start_date,
    projectEndDate: project.project_end_date,
    projectLength: project.project_length,
    status: project.status,
    createdBy: project.created_by,
    updatedBy: project.updated_by,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    members,
    sections: {
      gantt: ganttRows,
      controls: controlRows,
      policies: policyRows,
      documents: documentRows,
    },
  };
}

export async function buildPdplProjectCardData(projects) {
  const projectIds = (projects || []).map((project) => project.id);
  if (!projectIds.length) return [];

  const [membersRows, ganttRows, controlRows, policyRows, documentRows] = await Promise.all([
    adminClient
      .from('auditing_pdpl_project_members')
      .select(`
        project_id,
        employee:hrm_employees!auditing_pdpl_project_members_employee_id_fkey (
          id,
          name,
          employee_id,
          profile_picture_url
        )
      `)
      .in('project_id', projectIds),
    adminClient.from('auditing_pdpl_gantt_tasks').select('project_id, percent_done').in('project_id', projectIds),
    adminClient.from('auditing_pdpl_controls').select('project_id').in('project_id', projectIds),
    adminClient.from('auditing_pdpl_policies').select('project_id').in('project_id', projectIds),
    adminClient.from('auditing_pdpl_documents').select('project_id').in('project_id', projectIds),
  ]);

  if (membersRows.error) throw membersRows.error;
  if (ganttRows.error) throw ganttRows.error;
  if (controlRows.error) throw controlRows.error;
  if (policyRows.error) throw policyRows.error;
  if (documentRows.error) throw documentRows.error;

  const memberMap = {};
  (membersRows.data || []).forEach((row) => {
    if (!memberMap[row.project_id]) memberMap[row.project_id] = [];
    memberMap[row.project_id].push({
      id: row.employee?.id || null,
      name: row.employee?.name || '',
      employeeCode: row.employee?.employee_id || '',
      profilePictureUrl: row.employee?.profile_picture_url || null,
    });
  });

  const countByProject = (rows) =>
    (rows || []).reduce((map, row) => {
      map[row.project_id] = (map[row.project_id] || 0) + 1;
      return map;
    }, {});

  const ganttByProject = (ganttRows.data || []).reduce((map, row) => {
    if (!map[row.project_id]) map[row.project_id] = { total: 0, percent: 0 };
    map[row.project_id].total += 1;
    map[row.project_id].percent += normalizePercentDoneValue(row.percent_done, 0);
    return map;
  }, {});

  const controlCount = countByProject(controlRows.data);
  const policyCount = countByProject(policyRows.data);
  const documentCount = countByProject(documentRows.data);

  return (projects || []).map((project) => {
    const ganttStats = ganttByProject[project.id] || { total: 0, percent: 0 };
    return {
      id: project.id,
      projectName: project.project_name,
      clientName: project.client_name,
      projectLeader: project.project_leader,
      projectStartDate: project.project_start_date,
      projectEndDate: project.project_end_date,
      projectLength: project.project_length,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      progressPercent: ganttStats.total ? Math.round(ganttStats.percent / ganttStats.total) : 0,
      ganttCount: ganttStats.total,
      controlsCount: controlCount[project.id] || 0,
      policiesCount: policyCount[project.id] || 0,
      documentsCount: documentCount[project.id] || 0,
      members: memberMap[project.id] || [],
    };
  });
}

export function normalizePdplProjectPayload(payload = {}) {
  const projectName = String(payload.projectName || payload.project_name || '').trim();
  const clientName = String(payload.clientName || payload.client_name || '').trim();
  const projectLeader = String(payload.projectLeader || payload.project_leader || '').trim();
  const projectStartDate = normalizeDate(payload.projectStartDate || payload.project_start_date);
  const projectEndDate = normalizeDate(payload.projectEndDate || payload.project_end_date);
  const projectLength = payload.projectLength === '' || payload.projectLength === null || payload.projectLength === undefined
    ? null
    : Math.max(0, Math.round(normalizeNumeric(payload.projectLength || payload.project_length, 0)));
  const status = normalizeStatus(payload.status, PDPL_PROJECT_STATUSES, 'active');
  const memberIds = normalizeMultiValue(payload.memberIds || payload.member_ids);

  if (!projectName) throw new Error('Project name is required.');
  if (!clientName) throw new Error('Client name is required.');
  if (!projectLeader) throw new Error('Project leader is required.');
  if (projectStartDate && projectEndDate && projectEndDate < projectStartDate) {
    throw new Error('Project end date cannot be before project start date.');
  }

  return {
    projectName,
    clientName,
    projectLeader,
    projectStartDate,
    projectEndDate,
    projectLength,
    status,
    memberIds,
  };
}

export async function createPdplProject(payload, actor) {
  const normalized = normalizePdplProjectPayload(payload);
  const projectId = crypto.randomUUID();

  const insertPayload = {
    id: projectId,
    project_name: normalized.projectName,
    client_name: normalized.clientName,
    project_leader: normalized.projectLeader,
    project_start_date: normalized.projectStartDate,
    project_end_date: normalized.projectEndDate,
    project_length: normalized.projectLength,
    status: normalized.status,
    created_by: actor.authUserId,
    updated_by: actor.authUserId,
  };

  const { error } = await adminClient.from('auditing_pdpl_projects').insert(insertPayload);
  if (error) throw error;

  const uniqueMemberIds = Array.from(new Set(normalized.memberIds));
  if (actor.employeeId) {
    uniqueMemberIds.push(actor.employeeId);
  }

  const finalMemberIds = Array.from(new Set(uniqueMemberIds)).filter(Boolean);
  if (finalMemberIds.length > 0) {
    const memberRows = finalMemberIds.map((employeeId) => ({
      project_id: projectId,
      employee_id: employeeId,
      assigned_by: actor.authUserId,
    }));

    const memberResult = await adminClient.from('auditing_pdpl_project_members').insert(memberRows);
    if (memberResult.error) {
      await adminClient.from('auditing_pdpl_projects').delete().eq('id', projectId);
      throw memberResult.error;
    }
  }

  return projectId;
}

export async function updatePdplProject(projectId, payload, actor) {
  await assertPdplProjectAccess(projectId, actor);
  const normalized = normalizePdplProjectPayload(payload);

  const updatePayload = {
    project_name: normalized.projectName,
    client_name: normalized.clientName,
    project_leader: normalized.projectLeader,
    project_start_date: normalized.projectStartDate,
    project_end_date: normalized.projectEndDate,
    project_length: normalized.projectLength,
    status: normalized.status,
    updated_by: actor.authUserId,
  };

  const { error } = await adminClient
    .from('auditing_pdpl_projects')
    .update(updatePayload)
    .eq('id', projectId);

  if (error) throw error;

  const desiredMembers = Array.from(new Set(normalized.memberIds.concat(actor.employeeId ? [actor.employeeId] : []))).filter(Boolean);
  const existingMembers = await listPdplProjectMembers(projectId);
  const existingIds = existingMembers.map((member) => member.employeeId);

  const toAdd = desiredMembers.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !desiredMembers.includes(id));

  if (toAdd.length > 0) {
    const insertRows = toAdd.map((employeeId) => ({
      project_id: projectId,
      employee_id: employeeId,
      assigned_by: actor.authUserId,
    }));
    const insertResult = await adminClient.from('auditing_pdpl_project_members').insert(insertRows);
    if (insertResult.error) throw insertResult.error;
  }

  if (toRemove.length > 0) {
    const removeResult = await adminClient
      .from('auditing_pdpl_project_members')
      .delete()
      .eq('project_id', projectId)
      .in('employee_id', toRemove);
    if (removeResult.error) throw removeResult.error;
  }
}

export async function deletePdplProject(projectId, actor) {
  await assertPdplProjectAccess(projectId, actor);

  const documentRows = await loadPdplSectionRows(projectId, 'documents');
  const storagePaths = documentRows.flatMap((row) => (row.attachments || []).map((attachment) => attachment.storagePath)).filter(Boolean);
  if (storagePaths.length > 0) {
    await adminClient.storage.from(AUDITING_PDPL_DOCUMENTS_BUCKET).remove(storagePaths);
  }

  const { error } = await adminClient.from('auditing_pdpl_projects').delete().eq('id', projectId);
  if (error) throw error;
}

function normalizeGanttRowPayload(payload = {}, index = 0) {
  const memberAssignEmployeeIds = normalizeMultiValue(payload.memberAssignEmployeeIds || payload.member_assign_employee_ids || payload.memberIds || payload.member_ids);
  const isDoneRaw = payload.isDone ?? payload.is_done;
  const explicitDone =
    isDoneRaw === true ||
    isDoneRaw === 'true' ||
    isDoneRaw === 'yes' ||
    isDoneRaw === 'done' ||
    isDoneRaw === 1 ||
    isDoneRaw === '1';
  const normalizedPercentDone = Math.max(0, Math.min(100, normalizePercentDoneValue(payload.percentDone ?? payload.percent_done, 0)));
  const isDone = explicitDone || normalizedPercentDone >= 100;
  const doneMarkedOn = isDone ? normalizeDate(payload.doneMarkedOn || payload.done_marked_on) || new Date().toISOString().slice(0, 10) : null;

  return {
    sort_order: payload.sortOrder ?? payload.sort_order ?? index,
    label_code: String(payload.label || payload.label_code || '').trim() || null,
    task_name: String(payload.taskName || payload.task_name || '').trim(),
    india_team: String(payload.indiaTeam || payload.india_team || '').trim() || null,
    ksa_team: String(payload.ksaTeam || payload.ksa_team || '').trim() || null,
    start_date: normalizeDate(payload.startDate || payload.start_date),
    end_date: normalizeDate(payload.endDate || payload.end_date),
    percent_done: normalizedPercentDone,
    is_done: isDone,
    done_marked_on: doneMarkedOn,
    remaining: calculateRemainingPercentValue(normalizedPercentDone),
    remark: String(payload.remark || '').trim() || null,
    memberAssignEmployeeIds,
  };
}

function normalizeControlRowPayload(payload = {}, index = 0) {
  return {
    sort_order: payload.sortOrder ?? payload.sort_order ?? index,
    serial_no: String(payload.serialNo || payload.serial_no || '').trim() || null,
    category: String(payload.category || '').trim(),
    title: String(payload.title || '').trim(),
    status: normalizeStatus(payload.status, PDPL_CONTROL_STATUSES, 'Not Started'),
  };
}

function normalizePolicyRowPayload(payload = {}, index = 0) {
  return {
    sort_order: payload.sortOrder ?? payload.sort_order ?? index,
    serial_no: String(payload.serialNo || payload.serial_no || '').trim() || null,
    policy_name: String(payload.policyName || payload.policy_name || '').trim(),
    status: normalizeStatus(payload.status, PDPL_POLICY_STATUSES, 'Pending'),
    document_status: normalizeStatus(payload.documentStatus || payload.document_status, PDPL_DOCUMENT_RECEIPT_STATUSES, 'Not Received'),
  };
}

function normalizeDocumentRowPayload(payload = {}, index = 0) {
  return {
    sort_order: payload.sortOrder ?? payload.sort_order ?? index,
    serial_no: String(payload.serialNo || payload.serial_no || '').trim() || null,
    document_name: String(payload.documentName || payload.document_name || '').trim(),
    status: normalizeStatus(payload.status, PDPL_DOCUMENT_EXECUTION_STATUSES, 'Incomplete'),
    document_status: normalizeStatus(payload.documentStatus || payload.document_status, PDPL_DOCUMENT_RECEIPT_STATUSES, 'Not Received'),
  };
}

function validateProjectMemberAssignments(memberIds, projectMembers) {
  const allowedIds = new Set((projectMembers || []).map((member) => member.employeeId));
  const invalidId = (memberIds || []).find((id) => !allowedIds.has(id));
  if (invalidId) {
    throw new Error('One or more assigned task members do not belong to this project.');
  }
}

export async function createPdplSectionRow(projectId, section, payload, actor) {
  await assertPdplProjectAccess(projectId, actor);

  if (section === 'gantt') {
    const projectMembers = await listPdplProjectMembers(projectId);
    const row = normalizeGanttRowPayload(payload);
    if (!row.task_name) throw new Error('Task name is required.');
    validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);

    const id = crypto.randomUUID();
    const { memberAssignEmployeeIds, ...insertRow } = row;
    const result = await adminClient.from('auditing_pdpl_gantt_tasks').insert({
      id,
      project_id: projectId,
      ...insertRow,
      done_marked_by: insertRow.is_done ? actor.authUserId : null,
      created_by: actor.authUserId,
      updated_by: actor.authUserId,
    });
    if (result.error) throw result.error;

    if (memberAssignEmployeeIds.length > 0) {
      const memberRows = memberAssignEmployeeIds.map((employeeId) => ({
        task_id: id,
        employee_id: employeeId,
      }));
      const memberResult = await adminClient.from('auditing_pdpl_gantt_task_members').insert(memberRows);
      if (memberResult.error) throw memberResult.error;
    }

    return id;
  }

  const table = PDPL_SECTION_TABLES[section];
  if (!table) throw new Error('Unsupported PDPL section.');

  const row =
    section === 'controls'
      ? normalizeControlRowPayload(payload)
      : section === 'policies'
      ? normalizePolicyRowPayload(payload)
      : normalizeDocumentRowPayload(payload);

  if (section === 'controls' && (!row.category || !row.title)) throw new Error('Category and title are required.');
  if (section === 'policies' && !row.policy_name) throw new Error('Policy name is required.');
  if (section === 'documents' && !row.document_name) throw new Error('Document name is required.');

  const id = crypto.randomUUID();
  const result = await adminClient.from(table).insert({
    id,
    project_id: projectId,
    ...row,
    created_by: actor.authUserId,
    updated_by: actor.authUserId,
  });
  if (result.error) throw result.error;
  return id;
}

export async function updatePdplSectionRow(projectId, section, rowId, payload, actor) {
  await assertPdplProjectAccess(projectId, actor);

  if (section === 'gantt') {
    const projectMembers = await listPdplProjectMembers(projectId);
    const { data: existingRow, error: existingRowError } = await adminClient
      .from('auditing_pdpl_gantt_tasks')
      .select('is_done, done_marked_on, done_marked_by')
      .eq('id', rowId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (existingRowError) throw existingRowError;

    const row = normalizeGanttRowPayload(payload);
    if (!row.task_name) throw new Error('Task name is required.');
    validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);

    const { memberAssignEmployeeIds, ...updateRow } = row;
    const shouldMarkDoneBy = updateRow.is_done
      ? existingRow?.done_marked_by || actor.authUserId
      : null;
    const result = await adminClient
      .from('auditing_pdpl_gantt_tasks')
      .update({
        ...updateRow,
        done_marked_by: shouldMarkDoneBy,
        updated_by: actor.authUserId,
      })
      .eq('id', rowId)
      .eq('project_id', projectId);
    if (result.error) throw result.error;

    const deleteMembers = await adminClient.from('auditing_pdpl_gantt_task_members').delete().eq('task_id', rowId);
    if (deleteMembers.error) throw deleteMembers.error;

    if (memberAssignEmployeeIds.length > 0) {
      const memberRows = memberAssignEmployeeIds.map((employeeId) => ({
        task_id: rowId,
        employee_id: employeeId,
      }));
      const memberResult = await adminClient.from('auditing_pdpl_gantt_task_members').insert(memberRows);
      if (memberResult.error) throw memberResult.error;
    }
    return;
  }

  const table = PDPL_SECTION_TABLES[section];
  if (!table) throw new Error('Unsupported PDPL section.');
  const row =
    section === 'controls'
      ? normalizeControlRowPayload(payload)
      : section === 'policies'
      ? normalizePolicyRowPayload(payload)
      : normalizeDocumentRowPayload(payload);

  const result = await adminClient
    .from(table)
    .update({
      ...row,
      updated_by: actor.authUserId,
    })
    .eq('id', rowId)
    .eq('project_id', projectId);

  if (result.error) throw result.error;
}

export async function deletePdplSectionRow(projectId, section, rowId, actor) {
  await assertPdplProjectAccess(projectId, actor);

  if (section === 'documents') {
    const { data: attachments, error: attachmentError } = await adminClient
      .from('auditing_pdpl_document_attachments')
      .select('storage_path')
      .eq('document_id', rowId);
    if (attachmentError) throw attachmentError;
    const paths = (attachments || []).map((row) => row.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await adminClient.storage.from(AUDITING_PDPL_DOCUMENTS_BUCKET).remove(paths);
    }
  }

  const table = PDPL_SECTION_TABLES[section];
  if (!table) throw new Error('Unsupported PDPL section.');
  const result = await adminClient.from(table).delete().eq('id', rowId).eq('project_id', projectId);
  if (result.error) throw result.error;
}

export async function replacePdplSectionRows(projectId, section, rows, actor) {
  await assertPdplProjectAccess(projectId, actor);
  const safeRows = Array.isArray(rows) ? rows : [];

  if (section === 'gantt') {
    const projectMembers = await listPdplProjectMembers(projectId);
    const normalizedRows = safeRows.map((row, index) => normalizeGanttRowPayload(row, index));
    normalizedRows.forEach((row) => {
      if (!row.task_name) {
        throw new Error('Each Gantt row requires a task name.');
      }
      validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);
    });

    const deleteResult = await adminClient.from('auditing_pdpl_gantt_tasks').delete().eq('project_id', projectId);
    if (deleteResult.error) throw deleteResult.error;

    if (!normalizedRows.length) return;

    const insertRows = normalizedRows.map((row) => {
      const id = crypto.randomUUID();
      return {
        id,
        task: row,
      };
    });

    const taskInsertRows = insertRows.map(({ id, task }) => {
      const { memberAssignEmployeeIds, ...rest } = task;
      return {
        id,
        project_id: projectId,
        ...rest,
        done_marked_by: rest.is_done ? actor.authUserId : null,
        created_by: actor.authUserId,
        updated_by: actor.authUserId,
      };
    });

    const insertResult = await adminClient.from('auditing_pdpl_gantt_tasks').insert(taskInsertRows);
    if (insertResult.error) throw insertResult.error;

    const memberRows = insertRows.flatMap(({ id, task }) =>
      task.memberAssignEmployeeIds.map((employeeId) => ({
        task_id: id,
        employee_id: employeeId,
      }))
    );
    if (memberRows.length > 0) {
      const memberResult = await adminClient.from('auditing_pdpl_gantt_task_members').insert(memberRows);
      if (memberResult.error) throw memberResult.error;
    }
    return;
  }

  const table = PDPL_SECTION_TABLES[section];
  if (!table) throw new Error('Unsupported PDPL section.');

  if (section === 'documents') {
    const existingRows = await loadPdplSectionRows(projectId, 'documents');
    const storagePaths = existingRows
      .flatMap((row) => (row.attachments || []).map((attachment) => attachment.storagePath))
      .filter(Boolean);
    if (storagePaths.length > 0) {
      await adminClient.storage.from(AUDITING_PDPL_DOCUMENTS_BUCKET).remove(storagePaths);
    }
  }

  const deleteResult = await adminClient.from(table).delete().eq('project_id', projectId);
  if (deleteResult.error) throw deleteResult.error;

  if (!safeRows.length) return;

  const normalizedRows = safeRows.map((row, index) => {
    if (section === 'controls') return normalizeControlRowPayload(row, index);
    if (section === 'policies') return normalizePolicyRowPayload(row, index);
    return normalizeDocumentRowPayload(row, index);
  });

  const insertRows = normalizedRows.map((row) => ({
    id: crypto.randomUUID(),
    project_id: projectId,
    ...row,
    created_by: actor.authUserId,
    updated_by: actor.authUserId,
  }));

  const insertResult = await adminClient.from(table).insert(insertRows);
  if (insertResult.error) throw insertResult.error;
}

export async function loadPdplControlsPivot(projectId, actor) {
  await assertPdplProjectAccess(projectId, actor);

  const { data, error } = await adminClient
    .from('auditing_pdpl_controls')
    .select('category, status')
    .eq('project_id', projectId);

  if (error) throw error;

  const pivot = {};
  for (const row of data || []) {
    const category = String(row.category || '').trim() || 'Uncategorized';
    const status = normalizeStatus(row.status, PDPL_CONTROL_STATUSES, 'Not Started');
    if (!pivot[category]) {
      pivot[category] = {
        category,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        grandTotal: 0,
      };
    }
    if (status === 'Completed') pivot[category].completed += 1;
    if (status === 'In Progress') pivot[category].inProgress += 1;
    if (status === 'Not Started') pivot[category].notStarted += 1;
    pivot[category].grandTotal += 1;
  }

  return Object.values(pivot).sort((a, b) => a.category.localeCompare(b.category));
}

export async function loadPdplDashboard(projectId, actor) {
  await assertPdplProjectAccess(projectId, actor);
  const [ganttRows, controlRows, policyRows, documentRows] = await Promise.all([
    loadPdplSectionRows(projectId, 'gantt'),
    loadPdplSectionRows(projectId, 'controls'),
    loadPdplSectionRows(projectId, 'policies'),
    loadPdplSectionRows(projectId, 'documents'),
  ]);

  const totalTasks = ganttRows.length;
  const completedTasks = ganttRows.filter((row) => Boolean(row.isDone)).length;
  const averagePercentDone = totalTasks
    ? Math.round(ganttRows.reduce((sum, row) => sum + Number(row.percentDone || 0), 0) / totalTasks)
    : 0;
  const totalRemainingDays = ganttRows.reduce((sum, row) => sum + Math.max(0, Number(row.remaining || 0)), 0);

  const memberBreakdownMap = {};
  ganttRows.forEach((row) => {
    const members = Array.isArray(row.memberAssignNames) ? row.memberAssignNames : [];
    if (!members.length) {
      memberBreakdownMap['Unassigned'] = memberBreakdownMap['Unassigned'] || { member: 'Unassigned', tasks: 0, averageDone: 0, _doneTotal: 0 };
      memberBreakdownMap['Unassigned'].tasks += 1;
      memberBreakdownMap['Unassigned']._doneTotal += Number(row.percentDone || 0);
      return;
    }

    members.forEach((member) => {
      memberBreakdownMap[member] = memberBreakdownMap[member] || { member, tasks: 0, averageDone: 0, _doneTotal: 0 };
      memberBreakdownMap[member].tasks += 1;
      memberBreakdownMap[member]._doneTotal += Number(row.percentDone || 0);
    });
  });

  const memberBreakdown = Object.values(memberBreakdownMap)
    .map((row) => ({
      member: row.member,
      tasks: row.tasks,
      averageDone: row.tasks ? Math.round(row._doneTotal / row.tasks) : 0,
    }))
    .sort((a, b) => b.tasks - a.tasks || a.member.localeCompare(b.member));

  return {
    totalTasks,
    completedTasks,
    averagePercentDone,
    totalRemainingDays,
    taskPercentages: ganttRows.map((row) => ({
      label: row.label,
      taskName: row.taskName,
      percentDone: Number(row.percentDone || 0),
      isDone: Boolean(row.isDone),
      doneMarkedOn: row.doneMarkedOn || '',
      remaining: Number(row.remaining || 0),
    })),
    memberBreakdown,
    controlsPivot: await loadPdplControlsPivot(projectId, actor),
    sectionCounts: {
      gantt: ganttRows.length,
      controls: controlRows.length,
      policies: policyRows.length,
      documents: documentRows.length,
    },
  };
}

export async function uploadPdplDocumentFiles({ projectId, documentId, files = [], actor }) {
  if (!Array.isArray(files) || !files.length) return [];
  await assertPdplProjectAccess(projectId, actor);
  await ensurePdplDocumentsBucketAccessible();

  const { data: documentRow, error: documentError } = await adminClient
    .from('auditing_pdpl_documents')
    .select('id, project_id')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (documentError) throw documentError;
  if (!documentRow) {
    throw new Error('PDPL document row not found.');
  }

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const file of files) {
      validatePdplUpload(file);
      const attachmentId = crypto.randomUUID();
      const safeName = sanitizeStorageFileName(file.name);
      const storagePath = `projects/${projectId}/documents/${documentId}/${Date.now()}_${attachmentId}_${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage
        .from(AUDITING_PDPL_DOCUMENTS_BUCKET)
        .upload(storagePath, bytes, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || `Failed to upload ${file.name}`);
      }

      uploadedPaths.push(storagePath);
      attachmentRows.push({
        id: attachmentId,
        document_id: documentId,
        storage_bucket: AUDITING_PDPL_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size || null,
        uploaded_by: actor.authUserId,
      });
    }

    const insertResult = await adminClient.from('auditing_pdpl_document_attachments').insert(attachmentRows);
    if (insertResult.error) {
      throw insertResult.error;
    }

    return attachmentRows.map((row) => ({
      id: row.id,
      bucket: row.storage_bucket,
      storagePath: row.storage_path,
      fileName: row.file_name,
      mimeType: row.mime_type || '',
      fileSizeBytes: row.file_size_bytes || 0,
      viewUrl: adminClient.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data?.publicUrl || '',
    }));
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await adminClient.storage.from(AUDITING_PDPL_DOCUMENTS_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function deletePdplDocumentAttachment(projectId, documentId, attachmentId, actor) {
  await assertPdplProjectAccess(projectId, actor);

  const { data: attachment, error } = await adminClient
    .from('auditing_pdpl_document_attachments')
    .select('*')
    .eq('id', attachmentId)
    .eq('document_id', documentId)
    .maybeSingle();

  if (error) throw error;
  if (!attachment) {
    throw new Error('Attachment not found.');
  }

  if (attachment.storage_path) {
    await adminClient.storage.from(attachment.storage_bucket).remove([attachment.storage_path]);
  }

  const deleteResult = await adminClient
    .from('auditing_pdpl_document_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('document_id', documentId);
  if (deleteResult.error) throw deleteResult.error;
}

export async function createPdplImportLog(projectId, payload, actor) {
  await assertPdplProjectAccess(projectId, actor);

  const sourceFileName = String(payload.sourceFileName || payload.source_file_name || '').trim();
  if (!sourceFileName) {
    throw new Error('Source file name is required.');
  }

  const sheetMapping = payload.sheetMapping && typeof payload.sheetMapping === 'object' ? payload.sheetMapping : {};
  const importSummary = payload.importSummary && typeof payload.importSummary === 'object' ? payload.importSummary : {};

  const { error } = await adminClient.from('auditing_pdpl_import_logs').insert({
    project_id: projectId,
    source_file_name: sourceFileName,
    sheet_mapping: sheetMapping,
    import_summary: importSummary,
    uploaded_by: actor.authUserId,
  });

  if (error) throw error;
}
