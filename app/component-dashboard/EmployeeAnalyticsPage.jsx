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
    slate: 'bg-slate-100 text-slate-700',
    purple: 'bg-purple-100 text-purple-700',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone] || 'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeAnalyticsPage({ employeeId }) {
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignmentActivity, setAssignmentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadEmployeeAnalytics() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/employees/${employeeId}/analytics`, { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load employee analytics');
        }

        if (!isMounted) return;
        setEmployee(result.employee || null);
        setTasks(Array.isArray(result.tasks) ? result.tasks : []);
        setStats(result.stats || null);
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
              <Link href="/admin/team" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
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
  const nextDueLabel = stats?.nextDueTask?.due_date ? formatDate(stats.nextDueTask.due_date) : 'No upcoming due date';

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/team" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back to Team Members
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
            Next due: <span className="font-semibold text-slate-800">{nextDueLabel}</span>
          </div>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
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
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Completion Rate</p>
                <p className="mt-2 text-4xl font-bold text-white">{stats?.completionRate ?? 0}%</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={UserRoundCheck} label="Total Assigned" value={stats?.totalAssigned ?? 0} tone="slate" />
          <MetricCard icon={Clock3} label="Pending" value={stats?.pending ?? 0} tone="purple" />
          <MetricCard icon={CalendarDays} label="In Progress" value={stats?.inProgress ?? 0} tone="sky" />
          <MetricCard icon={CircleCheckBig} label="Completed" value={stats?.completed ?? 0} tone="emerald" />
          <MetricCard icon={Star} label="Avg Rating" value={stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'} tone="amber" />
          <MetricCard icon={TriangleAlert} label="Overdue" value={stats?.overdue ?? 0} tone="rose" />
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.7fr_1fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Assigned Tasks</h2>
                  <p className="mt-1 text-sm text-slate-500">Pending work appears first, followed by due-date priority.</p>
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
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                        <th className="pb-3 pr-4 font-semibold">Task</th>
                        <th className="pb-3 pr-4 font-semibold">Status</th>
                        <th className="pb-3 pr-4 font-semibold">Due</th>
                        <th className="pb-3 pr-4 font-semibold">Progress</th>
                        <th className="pb-3 pr-4 font-semibold">Assigned By</th>
                        <th className="pb-3 font-semibold">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedTasks.map((task) => (
                        <tr key={task.id} className="align-top">
                          <td className="py-4 pr-4">
                            <div>
                              <Link href={`/admin/tasks/${task.id}`} className="font-semibold text-slate-900 hover:text-[#7F40EE]">
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
                          <td className="py-4 pr-4 text-slate-700">{formatDate(task.due_date)}</td>
                          <td className="py-4 pr-4">
                            <div className="w-32">
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
                          <td className="py-4 pr-4 text-slate-700">{task.assigned_by || 'Assigned'}</td>
                          <td className="py-4 text-slate-700">{formatDate(task.assigned_at, { includeTime: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Pending Focus</h2>
                  <p className="mt-1 text-sm text-slate-500">Outstanding work and due-date pressure.</p>
                </div>
                <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                  {pendingTasks.length}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {pendingTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No pending or in-progress tasks.
                  </div>
                )}
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/admin/tasks/${task.id}`} className="font-semibold text-slate-900 hover:text-[#7F40EE]">
                          {task.task_name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">Due {formatDate(task.due_date)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                        {String(task.status || 'pending').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Assignment Activity</h2>
                  <p className="mt-1 text-sm text-slate-500">Latest task delegation events for this employee.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {assignmentActivity.length}
                </div>
              </div>
              <div className="mt-5 space-y-3">
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
          </aside>
        </div>
      </div>
    </div>
  );
}
