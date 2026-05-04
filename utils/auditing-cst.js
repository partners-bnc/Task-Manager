import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  AUDITING_PDPL_ALLOWED_MIME_TYPES,
  AUDITING_PDPL_FILE_SIZE_LIMIT,
  listPdplAuditingMembers,
  requirePdplActor,
  sanitizeStorageFileName,
  validatePdplUpload,
} from '@/utils/auditing-pdpl';

export const AUDITING_CST_DOCUMENTS_BUCKET = 'auditing-cst-documents';
export const CST_PROJECT_STATUSES = ['active', 'completed', 'archived'];
export const CST_SECTIONS = ['gantt'];

export function isMissingCstSchemaError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('auditing_cst_') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function isBucketNotFoundError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket') && message.includes('not found');
}

export async function ensureCstDocumentsBucketAccessible() {
  const { error } = await adminClient.storage.from(AUDITING_CST_DOCUMENTS_BUCKET).list('', { limit: 1 });
  if (error) {
    if (isBucketNotFoundError(error)) {
      throw new Error('CST documents bucket is missing. Apply the CST audit migration first.');
    }
    throw new Error(error.message || 'CST documents bucket is not accessible.');
  }
}

function normalizeMultiValue(input) {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  if (typeof input === 'string') {
    return Array.from(new Set(input.split(',').map((item) => item.trim()).filter(Boolean)));
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

export { listPdplAuditingMembers, requirePdplActor };

export async function listVisibleCstProjects(actor) {
  if (actor.canManageAll) {
    const { data, error } = await adminClient
      .from('auditing_cst_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  const { data, error } = await adminClient
    .from('auditing_cst_project_members')
    .select(`
      project:auditing_cst_projects!inner (*)
    `)
    .eq('employee_id', actor.employeeId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => row.project).filter(Boolean);
}

export async function assertCstProjectAccess(projectId, actor) {
  const { data: project, error } = await adminClient
    .from('auditing_cst_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!project) {
    throw new Error('CST project not found.');
  }

  if (actor.canManageAll) {
    return project;
  }

  const { data: membership, error: membershipError } = await adminClient
    .from('auditing_cst_project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('employee_id', actor.employeeId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) {
    throw new Error('You do not have access to this CST project.');
  }

  return project;
}

export async function listCstProjectMembers(projectId) {
  const { data, error } = await adminClient
    .from('auditing_cst_project_members')
    .select(`
      id,
      employee_id,
      role_in_project,
      assigned_at,
      employee:hrm_employees!auditing_cst_project_members_employee_id_fkey (
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

export async function loadCstSectionRows(projectId, section) {
  if (section !== 'gantt') {
    throw new Error('Unsupported CST section.');
  }

  const { data: rows, error } = await adminClient
    .from('auditing_cst_gantt_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const taskIds = (rows || []).map((row) => row.id);
  let memberRows = [];
  let attachmentRows = [];

  if (taskIds.length > 0) {
    const [memberResult, attachmentResult] = await Promise.all([
      adminClient
        .from('auditing_cst_gantt_task_members')
        .select(`
          task_id,
          employee_id,
          employee:hrm_employees!auditing_cst_gantt_task_members_employee_id_fkey (
            id,
            name,
            employee_id,
            profile_picture_url
          )
        `)
        .in('task_id', taskIds),
      adminClient
        .from('auditing_cst_gantt_attachments')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true }),
    ]);

    if (memberResult.error) throw memberResult.error;
    if (attachmentResult.error) throw attachmentResult.error;
    memberRows = memberResult.data || [];
    attachmentRows = attachmentResult.data || [];
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

  const attachmentsByTaskId = attachmentRows.reduce((map, row) => {
    if (!map[row.task_id]) map[row.task_id] = [];
    map[row.task_id].push({
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
    label: row.label_code || '',
    taskName: row.task_name || '',
    assignedTo: row.assigned_to || '',
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
    attachments: attachmentsByTaskId[row.id] || [],
  }));
}

export async function loadCstProject(projectId, actor) {
  const project = await assertCstProjectAccess(projectId, actor);
  const [members, ganttRows] = await Promise.all([
    listCstProjectMembers(projectId),
    loadCstSectionRows(projectId, 'gantt'),
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
    },
  };
}

export async function buildCstProjectCardData(projects) {
  const projectIds = (projects || []).map((project) => project.id);
  if (!projectIds.length) return [];

  const [membersRows, ganttRows] = await Promise.all([
    adminClient
      .from('auditing_cst_project_members')
      .select(`
        project_id,
        employee:hrm_employees!auditing_cst_project_members_employee_id_fkey (
          id,
          name,
          employee_id,
          profile_picture_url
        )
      `)
      .in('project_id', projectIds),
    adminClient
      .from('auditing_cst_gantt_tasks')
      .select('project_id, percent_done')
      .in('project_id', projectIds),
  ]);

  if (membersRows.error) throw membersRows.error;
  if (ganttRows.error) throw ganttRows.error;

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

  const ganttByProject = (ganttRows.data || []).reduce((map, row) => {
    if (!map[row.project_id]) map[row.project_id] = { total: 0, percent: 0 };
    map[row.project_id].total += 1;
    map[row.project_id].percent += normalizePercentDoneValue(row.percent_done, 0);
    return map;
  }, {});

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
      members: memberMap[project.id] || [],
    };
  });
}

export function normalizeCstProjectPayload(payload = {}) {
  const projectName = String(payload.projectName || payload.project_name || '').trim();
  const clientName = String(payload.clientName || payload.client_name || '').trim();
  const projectLeader = String(payload.projectLeader || payload.project_leader || '').trim();
  const projectStartDate = normalizeDate(payload.projectStartDate || payload.project_start_date);
  const projectEndDate = normalizeDate(payload.projectEndDate || payload.project_end_date);
  const projectLength = payload.projectLength === '' || payload.projectLength === null || payload.projectLength === undefined
    ? null
    : Math.max(0, Math.round(normalizeNumeric(payload.projectLength || payload.project_length, 0)));
  const status = normalizeStatus(payload.status, CST_PROJECT_STATUSES, 'active');
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

export async function createCstProject(payload, actor) {
  const normalized = normalizeCstProjectPayload(payload);
  const projectId = crypto.randomUUID();

  const { error } = await adminClient.from('auditing_cst_projects').insert({
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
  });
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

    const memberResult = await adminClient.from('auditing_cst_project_members').insert(memberRows);
    if (memberResult.error) {
      await adminClient.from('auditing_cst_projects').delete().eq('id', projectId);
      throw memberResult.error;
    }
  }

  return projectId;
}

export async function updateCstProject(projectId, payload, actor) {
  await assertCstProjectAccess(projectId, actor);
  const normalized = normalizeCstProjectPayload(payload);

  const { error } = await adminClient
    .from('auditing_cst_projects')
    .update({
      project_name: normalized.projectName,
      client_name: normalized.clientName,
      project_leader: normalized.projectLeader,
      project_start_date: normalized.projectStartDate,
      project_end_date: normalized.projectEndDate,
      project_length: normalized.projectLength,
      status: normalized.status,
      updated_by: actor.authUserId,
    })
    .eq('id', projectId);

  if (error) throw error;

  const desiredMembers = Array.from(new Set(normalized.memberIds.concat(actor.employeeId ? [actor.employeeId] : []))).filter(Boolean);
  const existingMembers = await listCstProjectMembers(projectId);
  const existingIds = existingMembers.map((member) => member.employeeId);

  const toAdd = desiredMembers.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !desiredMembers.includes(id));

  if (toAdd.length > 0) {
    const insertRows = toAdd.map((employeeId) => ({
      project_id: projectId,
      employee_id: employeeId,
      assigned_by: actor.authUserId,
    }));
    const insertResult = await adminClient.from('auditing_cst_project_members').insert(insertRows);
    if (insertResult.error) throw insertResult.error;
  }

  if (toRemove.length > 0) {
    const removeResult = await adminClient
      .from('auditing_cst_project_members')
      .delete()
      .eq('project_id', projectId)
      .in('employee_id', toRemove);
    if (removeResult.error) throw removeResult.error;
  }
}

export async function deleteCstProject(projectId, actor) {
  await assertCstProjectAccess(projectId, actor);

  const ganttRows = await loadCstSectionRows(projectId, 'gantt');
  const storagePaths = ganttRows.flatMap((row) => (row.attachments || []).map((attachment) => attachment.storagePath)).filter(Boolean);
  if (storagePaths.length > 0) {
    await adminClient.storage.from(AUDITING_CST_DOCUMENTS_BUCKET).remove(storagePaths);
  }

  const { error } = await adminClient.from('auditing_cst_projects').delete().eq('id', projectId);
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
    assigned_to: String(payload.assignedTo || payload.assigned_to || '').trim() || null,
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

function validateProjectMemberAssignments(memberIds, projectMembers) {
  const allowedIds = new Set((projectMembers || []).map((member) => member.employeeId));
  const invalidId = (memberIds || []).find((id) => !allowedIds.has(id));
  if (invalidId) {
    throw new Error('One or more assigned task members do not belong to this project.');
  }
}

export async function createCstSectionRow(projectId, section, payload, actor) {
  await assertCstProjectAccess(projectId, actor);
  if (section !== 'gantt') throw new Error('Unsupported CST section.');

  const projectMembers = await listCstProjectMembers(projectId);
  const row = normalizeGanttRowPayload(payload);
  if (!row.task_name) throw new Error('Task name is required.');
  validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);

  const id = crypto.randomUUID();
  const { memberAssignEmployeeIds, ...insertRow } = row;
  const result = await adminClient.from('auditing_cst_gantt_tasks').insert({
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
    const memberResult = await adminClient.from('auditing_cst_gantt_task_members').insert(memberRows);
    if (memberResult.error) throw memberResult.error;
  }

  return id;
}

export async function updateCstSectionRow(projectId, section, rowId, payload, actor) {
  await assertCstProjectAccess(projectId, actor);
  if (section !== 'gantt') throw new Error('Unsupported CST section.');

  const projectMembers = await listCstProjectMembers(projectId);
  const { data: existingRow, error: existingRowError } = await adminClient
    .from('auditing_cst_gantt_tasks')
    .select('is_done, done_marked_on, done_marked_by')
    .eq('id', rowId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (existingRowError) throw existingRowError;

  const row = normalizeGanttRowPayload(payload);
  if (!row.task_name) throw new Error('Task name is required.');
  validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);

  const { memberAssignEmployeeIds, ...updateRow } = row;
  const shouldMarkDoneBy = updateRow.is_done ? existingRow?.done_marked_by || actor.authUserId : null;
  const result = await adminClient
    .from('auditing_cst_gantt_tasks')
    .update({
      ...updateRow,
      done_marked_by: shouldMarkDoneBy,
      updated_by: actor.authUserId,
    })
    .eq('id', rowId)
    .eq('project_id', projectId);
  if (result.error) throw result.error;

  const deleteMembers = await adminClient.from('auditing_cst_gantt_task_members').delete().eq('task_id', rowId);
  if (deleteMembers.error) throw deleteMembers.error;

  if (memberAssignEmployeeIds.length > 0) {
    const memberRows = memberAssignEmployeeIds.map((employeeId) => ({
      task_id: rowId,
      employee_id: employeeId,
    }));
    const memberResult = await adminClient.from('auditing_cst_gantt_task_members').insert(memberRows);
    if (memberResult.error) throw memberResult.error;
  }
}

export async function deleteCstSectionRow(projectId, section, rowId, actor) {
  await assertCstProjectAccess(projectId, actor);
  if (section !== 'gantt') throw new Error('Unsupported CST section.');

  const { data: attachments, error: attachmentError } = await adminClient
    .from('auditing_cst_gantt_attachments')
    .select('storage_path')
    .eq('task_id', rowId);
  if (attachmentError) throw attachmentError;
  const paths = (attachments || []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await adminClient.storage.from(AUDITING_CST_DOCUMENTS_BUCKET).remove(paths);
  }

  const result = await adminClient.from('auditing_cst_gantt_tasks').delete().eq('id', rowId).eq('project_id', projectId);
  if (result.error) throw result.error;
}

export async function replaceCstSectionRows(projectId, section, rows, actor) {
  await assertCstProjectAccess(projectId, actor);
  if (section !== 'gantt') throw new Error('Unsupported CST section.');

  const safeRows = Array.isArray(rows) ? rows : [];
  const projectMembers = await listCstProjectMembers(projectId);
  const normalizedRows = safeRows.map((row, index) => normalizeGanttRowPayload(row, index));
  normalizedRows.forEach((row) => {
    if (!row.task_name) throw new Error('Each Gantt row requires a task name.');
    validateProjectMemberAssignments(row.memberAssignEmployeeIds, projectMembers);
  });

  const existingRows = await loadCstSectionRows(projectId, 'gantt');
  const storagePaths = existingRows.flatMap((row) => (row.attachments || []).map((attachment) => attachment.storagePath)).filter(Boolean);
  if (storagePaths.length > 0) {
    await adminClient.storage.from(AUDITING_CST_DOCUMENTS_BUCKET).remove(storagePaths);
  }

  const deleteResult = await adminClient.from('auditing_cst_gantt_tasks').delete().eq('project_id', projectId);
  if (deleteResult.error) throw deleteResult.error;

  if (!normalizedRows.length) return;

  const insertRows = normalizedRows.map((row) => {
    const id = crypto.randomUUID();
    return { id, task: row };
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

  const insertResult = await adminClient.from('auditing_cst_gantt_tasks').insert(taskInsertRows);
  if (insertResult.error) throw insertResult.error;

  const memberRows = insertRows.flatMap(({ id, task }) =>
    task.memberAssignEmployeeIds.map((employeeId) => ({
      task_id: id,
      employee_id: employeeId,
    }))
  );
  if (memberRows.length > 0) {
    const memberResult = await adminClient.from('auditing_cst_gantt_task_members').insert(memberRows);
    if (memberResult.error) throw memberResult.error;
  }
}

export async function loadCstDashboard(projectId, actor) {
  await assertCstProjectAccess(projectId, actor);
  const ganttRows = await loadCstSectionRows(projectId, 'gantt');

  const totalTasks = ganttRows.length;
  const completedTasks = ganttRows.filter((row) => Boolean(row.isDone)).length;
  const averagePercentDone = totalTasks
    ? Math.round(ganttRows.reduce((sum, row) => sum + Number(row.percentDone || 0), 0) / totalTasks)
    : 0;
  const averageRemainingPercent = totalTasks
    ? Math.round(ganttRows.reduce((sum, row) => sum + Math.max(0, Number(row.remaining || 0)), 0) / totalTasks)
    : 0;

  return {
    totalTasks,
    completedTasks,
    averagePercentDone,
    averageRemainingPercent,
    taskPercentages: ganttRows.map((row) => ({
      id: row.id,
      label: row.label,
      taskName: row.taskName,
      percentDone: Number(row.percentDone || 0),
      remaining: Math.max(0, Number(row.remaining || 0)),
      isDone: Boolean(row.isDone),
      doneMarkedOn: row.doneMarkedOn || '',
    })),
  };
}

export async function uploadCstTaskFiles({ projectId, taskId, files = [], actor }) {
  if (!Array.isArray(files) || !files.length) return [];
  await assertCstProjectAccess(projectId, actor);
  await ensureCstDocumentsBucketAccessible();

  const { data: taskRow, error: taskError } = await adminClient
    .from('auditing_cst_gantt_tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (taskError) throw taskError;
  if (!taskRow) {
    throw new Error('CST Gantt task not found.');
  }

  const uploadedPaths = [];
  const attachmentRows = [];

  try {
    for (const file of files) {
      validatePdplUpload(file);
      const attachmentId = crypto.randomUUID();
      const safeName = sanitizeStorageFileName(file.name);
      const storagePath = `projects/${projectId}/gantt/${taskId}/${Date.now()}_${attachmentId}_${safeName}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage
        .from(AUDITING_CST_DOCUMENTS_BUCKET)
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
        task_id: taskId,
        storage_bucket: AUDITING_CST_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size || null,
        uploaded_by: actor.authUserId,
      });
    }

    const insertResult = await adminClient.from('auditing_cst_gantt_attachments').insert(attachmentRows);
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
      await adminClient.storage.from(AUDITING_CST_DOCUMENTS_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function deleteCstTaskAttachment(projectId, taskId, attachmentId, actor) {
  await assertCstProjectAccess(projectId, actor);

  const { data: attachment, error } = await adminClient
    .from('auditing_cst_gantt_attachments')
    .select('*')
    .eq('id', attachmentId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (error) throw error;
  if (!attachment) {
    throw new Error('Attachment not found.');
  }

  if (attachment.storage_path) {
    await adminClient.storage.from(attachment.storage_bucket).remove([attachment.storage_path]);
  }

  const deleteResult = await adminClient
    .from('auditing_cst_gantt_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('task_id', taskId);
  if (deleteResult.error) throw deleteResult.error;
}

export async function createCstImportLog(projectId, payload, actor) {
  await assertCstProjectAccess(projectId, actor);

  const sourceFileName = String(payload.sourceFileName || payload.source_file_name || '').trim();
  if (!sourceFileName) {
    throw new Error('Source file name is required.');
  }

  const sheetMapping = payload.sheetMapping && typeof payload.sheetMapping === 'object' ? payload.sheetMapping : {};
  const importSummary = payload.importSummary && typeof payload.importSummary === 'object' ? payload.importSummary : {};

  const { error } = await adminClient.from('auditing_cst_import_logs').insert({
    project_id: projectId,
    source_file_name: sourceFileName,
    sheet_mapping: sheetMapping,
    import_summary: importSummary,
    uploaded_by: actor.authUserId,
  });

  if (error) throw error;
}

export { AUDITING_PDPL_ALLOWED_MIME_TYPES, AUDITING_PDPL_FILE_SIZE_LIMIT };
