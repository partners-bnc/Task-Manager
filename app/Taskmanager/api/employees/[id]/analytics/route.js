import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { requireAdminOrSupport } from '@/utils/api-helpers';
import { buildEmployeeRatingStats, buildEmployeeTaskRatingMap } from '@/utils/task-ratings';

const EMPLOYEE_ANALYTICS_ACTIVITY_SELECT = `
  id,
  task_id,
  subtask_id,
  entity_type,
  action,
  assigned_by_actor_type,
  created_at,
  subtask:task_subtasks!task_assignment_activity_subtask_id_fkey (
    id,
    title
  ),
  from_employee:hrm_employees!task_assignment_activity_from_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  to_employee:hrm_employees!task_assignment_activity_to_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  assigned_by_employee:hrm_employees!task_assignment_activity_assigned_by_employee_id_fkey (
    id,
    name,
    email,
    role,
    profile_picture_url
  ),
  assigned_by_admin:hrm_profiles!task_assignment_activity_assigned_by_admin_user_id_fkey (
    id,
    full_name,
    email
  )
`;

function getActorName(activity) {
  if (activity?.assigned_by_actor_type === 'employee') {
    return activity?.assigned_by_employee?.name || activity?.assigned_by_employee?.email || 'Unknown';
  }

  return activity?.assigned_by_admin?.full_name || activity?.assigned_by_admin?.email || 'Unknown';
}

function mapActivity(activity) {
  return {
    id: activity.id,
    taskId: activity.task_id,
    subtaskId: activity.subtask_id,
    entityType: activity.entity_type,
    action: activity.action,
    createdAt: activity.created_at,
    subtaskTitle: activity?.subtask?.title || null,
    fromEmployee: activity?.from_employee || null,
    toEmployee: activity?.to_employee || null,
    actor: activity?.assigned_by_actor_type === 'employee'
      ? activity?.assigned_by_employee || null
      : {
        id: activity?.assigned_by_admin?.id || null,
        name: activity?.assigned_by_admin?.full_name || activity?.assigned_by_admin?.email || 'Unknown',
        email: activity?.assigned_by_admin?.email || '',
        role: 'admin',
        profile_picture_url: null,
      },
  };
}

function getLatestTaskActivityByTaskId(activities = []) {
  const latestTaskLevel = new Map();
  const latestAnyLevel = new Map();

  for (const activity of activities) {
    if (!activity?.task_id || latestAnyLevel.has(activity.task_id)) {
      continue;
    }
    latestAnyLevel.set(activity.task_id, activity);
  }

  for (const activity of activities) {
    if (!activity?.task_id || activity.entity_type !== 'task' || latestTaskLevel.has(activity.task_id)) {
      continue;
    }
    latestTaskLevel.set(activity.task_id, activity);
  }

  const latestByTaskId = new Map();
  for (const [taskId, activity] of latestAnyLevel.entries()) {
    latestByTaskId.set(taskId, latestTaskLevel.get(taskId) || activity);
  }

  return latestByTaskId;
}

function getDerivedProgress(task) {
  const dbProgress = Number(task?.progress_percentage);
  if (Number.isFinite(dbProgress)) {
    return Math.min(100, Math.max(0, Math.round(dbProgress)));
  }

  const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter((subtask) => subtask?.is_completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

function buildTaskPayload(assignments = [], activities = [], ratingMap = new Map()) {
  const latestActivityByTaskId = getLatestTaskActivityByTaskId(activities);

  return assignments
    .map((assignment) => {
      const task = assignment?.task;
      if (!task?.id) return null;

      const latestActivity = latestActivityByTaskId.get(task.id) || null;
      const taskSubtasks = Array.isArray(task.task_subtasks) ? task.task_subtasks : [];
      const completedSubtasks = taskSubtasks.filter((subtask) => subtask?.is_completed).length;

      const employeeRating = ratingMap.get(task.id) || null;

      return {
        id: task.id,
        task_name: task.task_name || 'Untitled task',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date || null,
        created_at: task.created_at || null,
        updated_at: task.updated_at || null,
        progress_percentage: getDerivedProgress(task),
        employee_rating: employeeRating?.rating ?? null,
        employee_rating_updated_at: employeeRating?.updated_at || employeeRating?.created_at || null,
        assigned_at: latestActivity?.created_at || assignment?.assigned_at || null,
        assigned_by: latestActivity ? getActorName(latestActivity) : 'Assigned',
        assignment_action: latestActivity?.action || 'assigned',
        assignment_source: latestActivity?.entity_type || 'task',
        assignees: Array.isArray(task.task_assignments)
          ? task.task_assignments
            .map((taskAssignment) => taskAssignment?.employee)
            .filter(Boolean)
          : [],
        subtasks_total: taskSubtasks.length,
        subtasks_completed: completedSubtasks,
      };
    })
    .filter(Boolean);
}

function buildStats(tasks = [], ratingRows = []) {
  const now = Date.now();
  const totalAssigned = tasks.length;
  const pending = tasks.filter((task) => task.status === 'pending').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const overdue = tasks.filter((task) => {
    if (!task?.due_date || task.status === 'completed') return false;
    const dueAt = new Date(task.due_date).getTime();
    return Number.isFinite(dueAt) && dueAt < now;
  }).length;
  const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  const ratingStats = buildEmployeeRatingStats(ratingRows);

  const nextDueTask = [...tasks]
    .filter((task) => task?.due_date && task.status !== 'completed')
    .sort((left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime())[0] || null;

  return {
    totalAssigned,
    pending,
    inProgress,
    completed,
    overdue,
    completionRate,
    averageRating: ratingStats.averageRating,
    totalRatedTasks: ratingStats.totalRatedTasks,
    latestRatedTasks: ratingStats.latestRatedTasks.slice(0, 5),
    nextDueTask: nextDueTask
      ? {
        id: nextDueTask.id,
        task_name: nextDueTask.task_name,
        due_date: nextDueTask.due_date,
      }
      : null,
  };
}

function buildTicketStats(tickets = []) {
  const openTickets = tickets.filter((ticket) => ticket.status !== 'closed');
  const closedTickets = tickets.filter((ticket) => ticket.status === 'closed');
  const resolutionHours = closedTickets
    .map((ticket) => {
      const start = ticket?.created_at ? new Date(ticket.created_at).getTime() : NaN;
      const end = ticket?.closed_at || ticket?.resolved_at ? new Date(ticket.closed_at || ticket.resolved_at).getTime() : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return (end - start) / (1000 * 60 * 60);
    })
    .filter((value) => typeof value === 'number');

  return {
    total: tickets.length,
    open: openTickets.length,
    late: openTickets.filter((ticket) => ticket.is_late && !ticket.is_sla_breached).length,
    breached: openTickets.filter((ticket) => ticket.is_sla_breached).length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
    avgResolutionHours: resolutionHours.length > 0
      ? Math.round((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length) * 10) / 10
      : 0,
  };
}

export async function GET(request, { params }) {
  try {
    const auth = await requireAdminOrSupport(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const [employeeResult, assignmentResult, activityResult, ratingResult] = await Promise.all([
      adminClient
        .from('hrm_employees')
        .select('id, auth_user_id, employee_id, name, username, email, role, profile_picture_url, created_at, updated_at')
        .eq('id', id)
        .maybeSingle(),
      adminClient
        .from('task_assignments')
        .select(`
          assigned_at,
          task:tasks (
            id,
            task_name,
            description,
            priority,
            status,
            due_date,
            created_at,
            updated_at,
            progress_percentage,
            task_assignments (
              employee:hrm_employees!task_assignments_employee_id_fkey (
                id,
                name,
                email,
                role,
                profile_picture_url
              )
            ),
            task_subtasks (
              id,
              title,
              is_completed,
              assigned_employee_id,
              created_at,
              updated_at
            )
          )
        `)
        .eq('employee_id', id),
      adminClient
        .from('task_assignment_activity')
        .select(EMPLOYEE_ANALYTICS_ACTIVITY_SELECT)
        .eq('to_employee_id', id)
        .order('created_at', { ascending: false }),
      adminClient
        .from('task_employee_ratings')
        .select(`
          id,
          task_id,
          employee_id,
          rating,
          created_at,
          updated_at,
          task:tasks (
            id,
            task_name,
            status,
            due_date
          )
        `)
        .eq('employee_id', id)
        .order('updated_at', { ascending: false }),
    ]);

    if (employeeResult.error) {
      return NextResponse.json({ error: employeeResult.error.message }, { status: 500 });
    }

    if (!employeeResult.data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (assignmentResult.error) {
      return NextResponse.json({ error: assignmentResult.error.message }, { status: 500 });
    }

    if (activityResult.error) {
      return NextResponse.json({ error: activityResult.error.message }, { status: 500 });
    }
    if (ratingResult.error) {
      return NextResponse.json({ error: ratingResult.error.message }, { status: 500 });
    }

    const rawActivities = activityResult.data || [];
    const ratingRows = ratingResult.data || [];
    const ratingMap = buildEmployeeTaskRatingMap(ratingRows, id);
    const tasks = buildTaskPayload(assignmentResult.data || [], rawActivities, ratingMap);
    const stats = buildStats(tasks, ratingRows);
    const assignmentActivity = rawActivities.map(mapActivity);
    const authUserId = employeeResult.data?.auth_user_id || null;

    let ticketStats = {
      total: 0,
      open: 0,
      late: 0,
      breached: 0,
      resolved: 0,
      avgResolutionHours: 0,
    };

    if (authUserId) {
      const [requesterTickets, ownerTickets, escalatedTickets] = await Promise.all([
        adminClient.from('hrm_tickets').select('id, status, is_late, is_sla_breached, created_at, resolved_at, closed_at').eq('module_key', 'task_manager').eq('requester_auth_user_id', authUserId),
        adminClient.from('hrm_tickets').select('id, status, is_late, is_sla_breached, created_at, resolved_at, closed_at').eq('module_key', 'task_manager').eq('owner_auth_user_id', authUserId),
        adminClient.from('hrm_tickets').select('id, status, is_late, is_sla_breached, created_at, resolved_at, closed_at').eq('module_key', 'task_manager').eq('current_escalated_auth_user_id', authUserId),
      ]);

      const ticketError = requesterTickets.error || ownerTickets.error || escalatedTickets.error;
      if (ticketError) {
        return NextResponse.json({ error: ticketError.message || 'Failed to fetch employee ticket analytics' }, { status: 500 });
      }

      const uniqueTickets = Array.from(
        new Map(
          [...(requesterTickets.data || []), ...(ownerTickets.data || []), ...(escalatedTickets.data || [])].map((ticket) => [ticket.id, ticket])
        ).values()
      );
      ticketStats = buildTicketStats(uniqueTickets);
    }

    return NextResponse.json({
      success: true,
      employee: employeeResult.data,
      tasks,
      stats,
      ticketStats,
      assignmentActivity,
    });
  } catch (error) {
    console.error('Error fetching employee analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch employee analytics' }, { status: 500 });
  }
}
