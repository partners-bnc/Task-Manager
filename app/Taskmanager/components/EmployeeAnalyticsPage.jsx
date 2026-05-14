'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, CircleCheckBig, Clock3, Loader2, Star, TriangleAlert, UserRoundCheck } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_STYLES = {
  low: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-rose-50 text-rose-700',
};

const DUE_TIMING_STYLES = {
  completedWithinTime: 'bg-emerald-100 text-emerald-700',
  completedOnDueTime: 'bg-sky-100 text-sky-700',
  completedLate: 'bg-rose-100 text-rose-700',
  exceededDueDate: 'bg-rose-100 text-rose-700',
  withinDueDate: 'bg-amber-100 text-amber-700',
  noDueDate: 'bg-slate-100 text-slate-600',
  completedTimeUnknown: 'bg-slate-100 text-slate-700',
};

function isDateOnlyValue(value) {
  return typeof value === 'string' && !value.includes('T');
}

function getTaskDueTiming(task) {
  const dueValue = task?.due_date;
  const dueAt = dueValue ? new Date(dueValue) : null;
  const isCompleted = task?.status === 'completed';

  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return isCompleted
      ? { label: 'Completed (no due date)', className: DUE_TIMING_STYLES.completedWithinTime }
      : { label: 'No due date set', className: DUE_TIMING_STYLES.noDueDate };
  }

  const hasExplicitDueTime = !isDateOnlyValue(dueValue);
  const dueDeadline = new Date(dueAt);

  if (!hasExplicitDueTime) {
    dueDeadline.setHours(23, 59, 59, 999);
  }

  if (isCompleted) {
    const completedAt = task?.updated_at ? new Date(task.updated_at) : null;
    if (!completedAt || Number.isNaN(completedAt.getTime())) {
      return { label: 'Completed (time unknown)', className: DUE_TIMING_STYLES.completedTimeUnknown };
    }

    if (!hasExplicitDueTime) {
      const dueDayStart = new Date(dueAt);
      dueDayStart.setHours(0, 0, 0, 0);

      const dueDayEnd = new Date(dueAt);
      dueDayEnd.setHours(23, 59, 59, 999);

      if (completedAt.getTime() < dueDayStart.getTime()) {
        return { label: 'Completed in time', className: DUE_TIMING_STYLES.completedWithinTime };
      }

      if (completedAt.getTime() > dueDayEnd.getTime()) {
        return { label: 'Completed late', className: DUE_TIMING_STYLES.completedLate };
      }

      return { label: 'Completed on due date', className: DUE_TIMING_STYLES.completedOnDueTime };
    }

    if (completedAt.getTime() < dueDeadline.getTime()) {
      return { label: 'Completed in time', className: DUE_TIMING_STYLES.completedWithinTime };
    }

    if (completedAt.getTime() > dueDeadline.getTime()) {
      return { label: 'Completed late', className: DUE_TIMING_STYLES.completedLate };
    }

    return { label: 'Completed on due date', className: DUE_TIMING_STYLES.completedOnDueTime };
  }

  if (Date.now() > dueDeadline.getTime()) {
    return { label: 'Exceeded due date', className: DUE_TIMING_STYLES.exceededDueDate };
  }

  return { label: 'Within due date', className: DUE_TIMING_STYLES.withinDueDate };
}

function formatDate(value, { includeTime = false } = {}) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('en-GB', includeTime
    ? {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    : {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
}

function getDisplayName(person, fallback = 'Unknown') {
  return person?.name || person?.full_name || person?.email || fallback;
}

function getActivityText(item) {
  const actorName = getDisplayName(item.actor, 'Unknown');
  const targetLabel = item.entityType === 'subtask'
    ? (item.subtaskTitle || 'a subtask')
    : 'the task';
  const fromName = getDisplayName(item.fromEmployee, 'someone');
  const toName = getDisplayName(item.toEmployee, 'this employee');

  if (item.action === 'reassigned') {
    return `${actorName} reassigned ${targetLabel} from ${fromName} to ${toName}`;
  }

  if (item.action === 'unassigned') {
    return `${actorName} unassigned ${targetLabel} from ${fromName}`;
  }

  return `${actorName} assigned ${targetLabel} to ${toName}`;
}

function getAvatarInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function MetricCard({ icon: Icon, label, value, tone = 'slate' }) {
  const toneClass = {
    slate: 'text-slate-700',
    purple: 'text-purple-700',
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
  }[tone] || 'text-slate-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex min-h-[84px] items-center gap-4">
        <div className={`flex shrink-0 items-center ${toneClass}`}>
          <Icon size={30} strokeWidth={2} />
        </div>
        <div className="h-11 w-px shrink-0 bg-slate-200"></div>
        <div className="flex min-h-[76px] flex-1 flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <div className="mt-auto flex justify-center">
            <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeAnalyticsPage({ employeeId }) {
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [ticketStats, setTicketStats] = useState(null);
  const [assignmentActivity, setAssignmentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadEmployeeAnalytics() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/HRM/api/employees/${employeeId}/analytics`, { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load employee analytics');
        }

        if (!isMounted) return;
        setEmployee(result.employee || null);
        setTasks(Array.isArray(result.tasks) ? result.tasks : []);
        setStats(result.stats || null);
        setTicketStats(result.ticketStats || null);
        setAssignmentActivity(Array.isArray(result.assignmentActivity) ? result.assignmentActivity : []);
      } catch (requestError) {
        if (!isMounted) return;
        setError(requestError.message || 'Failed to load employee analytics');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEmployeeAnalytics();

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((left, right) => {
      const statusOrder = {
        pending: 0,
        in_progress: 1,
        completed: 2,
      };

      const leftStatus = statusOrder[left?.status] ?? 3;
      const rightStatus = statusOrder[right?.status] ?? 3;
      if (leftStatus !== rightStatus) {
        return leftStatus - rightStatus;
      }

      const leftDue = left?.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right?.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return String(left?.task_name || '').localeCompare(String(right?.task_name || ''));
    });
  }, [tasks]);

  const pendingTasks = useMemo(
    () => sortedTasks.filter((task) => task?.status === 'pending' || task?.status === 'in_progress'),
    [sortedTasks]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-20 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            <span>Loading employee analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <div className="flex items-start gap-3 text-red-700">
            <TriangleAlert size={20} className="mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold">Failed to load employee analytics</h1>
              <p className="mt-1 text-sm">{error}</p>
              <Link href="/Taskmanager/admin/team" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
                <ArrowLeft size={14} />
                Back to Team Members
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = employee?.profile_picture_url || null;
  const employeeName = employee?.name || 'Employee';
  const nextDueLabel = stats?.nextDueTask?.due_date ? formatDate(stats.nextDueTask.due_date, { includeTime: true }) : 'No upcoming due date';

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-[1560px] space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/Taskmanager/admin/team" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back to Team Members
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
            Next due: <span className="font-semibold text-slate-800">{nextDueLabel}</span>
          </div>
        </div>

        <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#334155_100%)] px-8 py-10 text-white">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/10 text-3xl font-bold">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt={employeeName} width={96} height={96} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <span>{getAvatarInitial(employeeName)}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Employee Analytics</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">{employeeName}</h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-200">
                    <span className="rounded-full bg-white/10 px-3 py-1">{employee?.role || 'Employee'}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">{employee?.email || 'No email'}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">Employee ID: {employee?.employee_id || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Completion Rate</p>
                  <p className="mt-2 text-4xl font-bold text-white">{stats?.completionRate ?? 0}%</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Avg Rating</p>
                  <p className="mt-2 text-4xl font-bold text-white">
                    {stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                    <span className="ml-2 text-2xl align-middle">⭐</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard icon={UserRoundCheck} label="Total Assigned" value={stats?.totalAssigned ?? 0} tone="slate" />
          <MetricCard icon={Clock3} label="Pending" value={stats?.pending ?? 0} tone="purple" />
          <MetricCard icon={CalendarDays} label="In Progress" value={stats?.inProgress ?? 0} tone="sky" />
          <MetricCard icon={CircleCheckBig} label="Completed" value={stats?.completed ?? 0} tone="emerald" />
          <MetricCard icon={Star} label="Rated Tasks" value={stats?.totalRatedTasks ?? 0} tone="amber" />
          <MetricCard icon={TriangleAlert} label="Overdue" value={stats?.overdue ?? 0} tone="rose" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={UserRoundCheck} label="Ticket Total" value={ticketStats?.total ?? 0} tone="slate" />
          <MetricCard icon={Clock3} label="Ticket Open" value={ticketStats?.open ?? 0} tone="purple" />
          <MetricCard icon={TriangleAlert} label="Ticket Late" value={ticketStats?.late ?? 0} tone="amber" />
          <MetricCard icon={TriangleAlert} label="Ticket Breached" value={ticketStats?.breached ?? 0} tone="rose" />
          <MetricCard icon={CircleCheckBig} label="Avg Resolve Hrs" value={ticketStats?.avgResolutionHours ?? 0} tone="emerald" />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Pending Focus</h2>
                <p className="mt-1 text-sm text-slate-500">Outstanding work and due-date pressure.</p>
              </div>
              <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                {pendingTasks.length}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {pendingTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No pending or in-progress tasks.
                </div>
              )}
              {pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/Taskmanager/admin/tasks/${task.id}`} className="font-semibold text-slate-900 hover:text-[#7F40EE]">
                        {task.task_name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">Due {formatDate(task.due_date, { includeTime: true })}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                      {String(task.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Latest Rated Tasks</h2>
                <p className="mt-1 text-sm text-slate-500">Most recent performance ratings received by this employee.</p>
              </div>
              <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                {stats?.totalRatedTasks ?? 0}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(stats?.latestRatedTasks || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No employee ratings recorded yet.
                </div>
              )}
              {(stats?.latestRatedTasks || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/Taskmanager/admin/tasks/${item.taskId}`} className="font-semibold text-slate-900 hover:text-[#7F40EE]">
                        {item.taskName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">Rated {formatDate(item.ratedAt, { includeTime: true })}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {item.rating.toFixed(1)} / 5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Assignment Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Latest task delegation events for this employee.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {assignmentActivity.length}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {assignmentActivity.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No assignment activity recorded yet.
                </div>
              )}
              {assignmentActivity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold leading-6 text-slate-800">{getActivityText(item)}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt, { includeTime: true })}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">
                      {item.entityType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="min-w-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Assigned Tasks</h2>
                  <p className="mt-1 text-sm text-slate-500">Pending work appears first, followed by due-date priority and employee performance details.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {sortedTasks.length} tasks
                </div>
              </div>

              {sortedTasks.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  No assigned tasks found for this employee.
                </div>
              ) : (
                <div className="mt-6 w-full overflow-x-auto">
                  <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                        <th style={{ width: '22%' }} className="pb-3 pr-4 font-semibold">Task</th>
                        <th style={{ width: '9%' }} className="pb-3 pr-4 font-semibold">Status</th>
                        <th style={{ width: '10%' }} className="pb-3 pr-4 font-semibold">Due</th>
                        <th style={{ width: '20%' }} className="pb-3 pr-4 font-semibold">Due Timeline</th>
                        <th style={{ width: '10%' }} className="pb-3 pr-4 font-semibold">Progress</th>
                        <th style={{ width: '8%' }} className="pb-3 pr-4 font-semibold">Rating</th>
                        <th style={{ width: '11%' }} className="pb-3 pr-4 font-semibold">Assigned By</th>
                        <th style={{ width: '10%' }} className="pb-3 font-semibold">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedTasks.map((task) => {
                        const dueTiming = getTaskDueTiming(task);

                        return (
                          <tr key={task.id} className="align-top">
                            <td className="py-4 pr-4">
                              <div>
                                <Link href={`/Taskmanager/admin/tasks/${task.id}`} className="wrap-break-word font-semibold text-slate-900 hover:text-[#7F40EE]">
                                  {task.task_name}
                                </Link>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                                    {task.priority} priority
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                    {task.subtasks_completed}/{task.subtasks_total} subtasks
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                                {String(task.status || 'pending').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-slate-700">{formatDate(task.due_date, { includeTime: true })}</td>
                            <td className="py-4 pr-4">
                              <span className={`inline-block max-w-full whitespace-normal rounded-full px-2.5 py-1 text-[11px] font-semibold leading-4 ${dueTiming.className}`}>
                                {dueTiming.label}
                              </span>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="w-24">
                                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                  <span>{task.progress_percentage}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-[#7F40EE]"
                                    style={{ width: `${task.progress_percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              {typeof task.employee_rating === 'number' ? (
                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                  {task.employee_rating.toFixed(1)} / 5
                                </span>
                              ) : (
                                <span className="text-slate-400">Not rated</span>
                              )}
                            </td>
                            <td className="wrap-break-word py-4 pr-4 text-slate-700">{task.assigned_by || 'Assigned'}</td>
                            <td className="py-4 text-slate-700">{formatDate(task.assigned_at, { includeTime: true })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
