'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function formatDate(value) {
  if (!value) {
    return '--';
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatBirthday(value) {
  if (!value) {
    return '--';
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatLeaveWindow(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'Today';
  }

  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === end) {
    return start;
  }
  return `${start} to ${end}`;
}

function formatBirthdayNames(employees = []) {
  const names = employees
    .map((employee) => String(employee?.name || '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (names.length === 0) {
    return 'Your team';
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`;
  }

  return `${names[0]}, ${names[1]} & ${names[2]}`;
}

function getBirthdayCopy(employees = []) {
  const leadEmployee = employees[0];
  const groupedNames = formatBirthdayNames(employees);

  if (!leadEmployee) {
    return {
      heading: 'No birthdays lined up yet',
      body: 'Add employee birth dates in the HR master record to show upcoming birthdays here.',
    };
  }

  if (employees.length > 1) {
    if (leadEmployee.daysUntilBirthday === 0) {
      return {
        heading: `Happy Birthday ${groupedNames}!`,
        body: 'Wishing them joy, laughter, and a truly beautiful celebration together.',
      };
    }

    if (leadEmployee.daysUntilBirthday === 1) {
      return {
        heading: `${groupedNames} celebrate tomorrow`,
        body: 'A lovely celebration is almost here. Wishing them smiles and happy moments ahead.',
      };
    }

    return {
      heading: `Happy Birthday ${groupedNames}`,
      body: 'Sending warm wishes for a joyful celebration and a wonderful year ahead.',
    };
  }

  if (leadEmployee.daysUntilBirthday === 0) {
    return {
      heading: `Today is ${leadEmployee.name}'s birthday`,
      body: 'Wishing them happiness, celebration, and a day full of special moments.',
    };
  }

  if (leadEmployee.daysUntilBirthday === 1) {
    return {
      heading: `${leadEmployee.name}'s birthday is tomorrow`,
      body: 'A special day is almost here. Sending warm wishes for a joyful celebration.',
    };
  }

  return {
    heading: `${leadEmployee.name}'s birthday is coming up`,
    body: 'A special celebration is on the way. Sending warm wishes for a beautiful birthday ahead.',
  };
}

function MetricCard({ title, value, subtitle, icon, tone }) {
  return (
    <div className={`rounded-[1.5rem] border border-white/70 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined block text-[25px] leading-none text-on-surface">
          {icon}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">{title}</p>
      </div>
      <div className="mt-6 text-center">
        <p className="text-3xl font-headline font-extrabold text-on-surface">{value}</p>
        <p className="mt-3 text-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard({ admin, setCurrentTab, setSelectedEmployeeId }) {
  const { showFeedback } = useHrmFeedback();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloadingBirthdayCard, setIsDownloadingBirthdayCard] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/HRM/api/admin/dashboard', { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load HR admin dashboard');
        }

        if (active) {
          setDashboard(result);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Failed to load HR admin dashboard');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const greetingName = String(admin?.name || dashboard?.admin?.name || 'HR Admin').replace(/\bHr\b/g, 'HR');
  const liveDateTimeLabel = currentDateTime.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const helperText = useMemo(() => {
    const department = dashboard?.admin?.department || admin?.department || 'HR';
    const designation = dashboard?.admin?.designation || admin?.designation || 'Administrator';
    return `${designation} • ${department}`;
  }, [admin?.department, admin?.designation, dashboard?.admin?.department, dashboard?.admin?.designation]);

  const metrics = dashboard?.metrics || {
    employeeCount: 0,
    activeEmployeeCount: 0,
    onLeaveEmployeeCount: 0,
    pendingTaskCount: 0,
    todayLateAttendanceCount: 0,
  };
  const featuredBirthdayGroup = useMemo(() => {
    const upcomingBirthdays = dashboard?.upcomingBirthdays || [];
    if (!upcomingBirthdays.length) {
      return [];
    }

    const nearestOffset = upcomingBirthdays[0].daysUntilBirthday;
    return upcomingBirthdays.filter((employee) => employee.daysUntilBirthday === nearestOffset);
  }, [dashboard?.upcomingBirthdays]);
  const featuredBirthday = featuredBirthdayGroup[0] || null;
  const birthdayCopy = getBirthdayCopy(featuredBirthdayGroup);
  const birthdayLabel = featuredBirthday?.daysUntilBirthday === 0 ? 'Today Birthday' : 'Upcoming Birthday';
  const visibleBirthdayEmployees = featuredBirthdayGroup.slice(0, 4);
  const avatarLayoutClassName =
    visibleBirthdayEmployees.length <= 2
      ? 'flex w-full items-center justify-center gap-2'
      : 'grid w-full grid-cols-2 gap-x-2 gap-y-3';

  const handleBirthdayCardDownload = async () => {
    if (isDownloadingBirthdayCard || !featuredBirthday) {
      return;
    }

    try {
      setIsDownloadingBirthdayCard(true);
      const normalizedDate = formatBirthday(featuredBirthday.date_of_birth).replace(/\s+/g, '-').toLowerCase();
      const response = await fetch('/HRM/api/admin/birthday-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: birthdayLabel,
          heading: birthdayCopy.heading,
          message: birthdayCopy.body,
          dateLabel: formatBirthday(featuredBirthday.date_of_birth),
          moreCount: Math.max(0, featuredBirthdayGroup.length - visibleBirthdayEmployees.length),
          employees: visibleBirthdayEmployees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            profilePictureUrl: employee.profile_picture_url || '',
          })),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Unable to generate birthday card image.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `birthday-card-${normalizedDate}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      showFeedback({
        type: 'error',
        title: 'Download Failed',
        message: downloadError?.message || 'Unable to download the birthday card right now.',
      });
    } finally {
      setIsDownloadingBirthdayCard(false);
    }
  };
  const lifecycleReminders = dashboard?.lifecycleReminders || [];

  return (
    <div className="mx-auto max-w-7xl p-7">
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none lg:text-4xl" aria-hidden="true">👋</span>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface lg:text-[2.5rem]">
              Welcome, {greetingName}
            </h2>
          </div>
          <p className="mt-2 pl-12 text-sm font-medium text-on-surface-variant lg:pl-14">
            {liveDateTimeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentTab?.('admin-add-employee')}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20"
        >
          Add New Employee
        </button>
      </section>

      {loading && (
        <LoadingPanel
          title="Loading HR dashboard"
          message="We are pulling the latest HR metrics, recent employees, and birthday highlights."
        />
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && dashboard && (
        <div className="space-y-7">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Employees" value={metrics.employeeCount} subtitle={`${metrics.activeEmployeeCount} active right now`} icon="groups" tone="bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/70" />
            <MetricCard title="Employees On Leave" value={metrics.onLeaveEmployeeCount} subtitle="Pulled from live employee status" icon="event_busy" tone="bg-gradient-to-br from-amber-50 via-white to-orange-100/60" />
            <MetricCard title="Pending Tasks For HR Admin" value={metrics.pendingTaskCount} subtitle="Leave, regularization, expense review, and tickets" icon="assignment_late" tone="bg-gradient-to-br from-purple-50 via-white to-violet-100/70" />
            <MetricCard title="Today Late Attendance" value={metrics.todayLateAttendanceCount} subtitle="Employees marked late today" icon="alarm_on" tone="bg-gradient-to-br from-emerald-50 via-white to-teal-100/70" />
          </section>

          <section className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_300px]">
            <div className="space-y-4 self-start">
              <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">Recent Employees</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">Latest employee records created in the HRM system.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab?.('admin-employee-list')}
                    className="rounded-full border border-outline-variant/20 bg-surface px-4 py-2 text-xs font-bold text-on-surface-variant"
                  >
                    View Directory
                  </button>
                </div>
                <div className="overflow-hidden rounded-[1.25rem] border border-outline-variant/10">
                  {(dashboard.recentEmployees || []).length === 0 ? (
                    <div className="p-4">
                      <HrmEmptyState
                        compact
                        icon="badge"
                        title="No employee records yet"
                        message="Newly added employees will start appearing here as soon as the HR directory is populated."
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/10">
                      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_120px_110px] gap-4 border-b border-outline-variant/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">
                        <p>Employee</p>
                        <p>Designation</p>
                        <p>ID</p>
                        <p>Created</p>
                      </div>
                      {(dashboard.recentEmployees || []).map((employee) => (
                        <div
                          key={employee.id}
                          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_120px_110px] gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low/20"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {employee.profile_picture_url ? (
                              <Image
                                src={employee.profile_picture_url}
                                alt={employee.name || 'Employee'}
                                width={38}
                                height={38}
                                className="h-[38px] w-[38px] rounded-full object-cover border border-outline-variant/10"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {getInitials(employee.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-on-surface">{employee.name || 'Employee'}</p>
                              <p className="truncate text-xs text-on-surface-variant">{employee.email || 'No email added'}</p>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {employee.designation?.title || 'Designation not set'}
                            </p>
                            <p className="truncate text-xs text-on-surface-variant">
                              {employee.department?.name || 'Department not set'}
                            </p>
                          </div>

                          <div className="text-xs font-semibold text-on-surface-variant">
                            {employee.employee_id || 'No ID'}
                          </div>

                          <div className="text-xs font-semibold text-on-surface">
                            {formatDate(employee.created_at?.slice?.(0, 10) || employee.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-outline-variant/10 bg-surface-container-low p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-headline text-base font-bold text-on-surface">Employees On Leave Today</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Today&apos;s approved leave employees with quick identity view.
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                    {metrics.onLeaveEmployeeCount} on leave
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {(dashboard.employeesOnLeaveToday || []).length === 0 ? (
                    <HrmEmptyState
                      compact
                      icon="event_available"
                      title="No leave record for today"
                      message="Employees who are approved for leave today will appear here."
                    />
                  ) : (
                    (dashboard.employeesOnLeaveToday || []).map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId?.(employee.employeeId);
                          setCurrentTab?.('admin-employee-profile');
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-lowest px-3 py-2.5 text-left transition hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {employee.profilePictureUrl ? (
                            <Image
                              src={employee.profilePictureUrl}
                              alt={employee.name || 'Employee on leave'}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full border border-outline-variant/10 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                              {getInitials(employee.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">{employee.name || 'Employee'}</p>
                            <p className="truncate text-xs text-on-surface-variant">
                              {employee.employeeCode || 'No employee ID'} {employee.designation ? `· ${employee.designation}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-on-surface">{formatLeaveWindow(employee.startDate, employee.endDate)}</p>
                          <p className="mt-0.5 text-[11px] text-on-surface-variant">
                            {String(employee.session || 'full_day').replace(/_/g, ' ')}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {lifecycleReminders.length ? (
                <div className="rounded-[1.35rem] border border-outline-variant/10 bg-surface-container-low p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-headline text-base font-bold text-on-surface">Lifecycle reminders</h3>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Pending HR action after probation or notice completion.
                      </p>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      {lifecycleReminders.length} pending
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {lifecycleReminders.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId?.(item.id);
                          setCurrentTab?.('admin-employee-profile');
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-lowest px-3 py-2.5 text-left transition hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {item.profile_picture_url ? (
                            <Image
                              src={item.profile_picture_url}
                              alt={item.name || 'Employee'}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full border border-outline-variant/10 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {getInitials(item.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">{item.name || 'Employee'}</p>
                            <p className="truncate text-xs text-on-surface-variant">
                              {item.stage === 'probation' ? 'Remove probation' : 'Review notice'} · {item.employee_id || 'No employee ID'}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-on-surface">{formatDate(item.dueDate)}</p>
                          <p className="mt-0.5 text-[11px] text-on-surface-variant">{item.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative self-start xl:max-w-[300px]">
              {(dashboard.upcomingBirthdays || []).length > 0 ? (
                <button
                  type="button"
                  onClick={handleBirthdayCardDownload}
                  disabled={isDownloadingBirthdayCard}
                  className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/85 text-[#9A3412] shadow-md backdrop-blur-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  title="Download birthday card"
                  aria-label="Download birthday card"
                >
                  <Download className="h-4 w-4" />
                </button>
              ) : null}

              <div className="relative overflow-hidden rounded-[2rem] border border-[#E9D8FF] bg-[#F6ECFF] p-5 shadow-[0_22px_70px_rgba(137,92,246,0.16)]">
                <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#D8B4FE]/60 blur-3xl" />
                <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0ABFC]/45 blur-2xl" />
                <div className="pointer-events-none absolute -left-8 bottom-12 h-28 w-28 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
                <div className="pointer-events-none absolute right-6 top-16 h-2.5 w-2.5 rounded-full bg-[#A855F7]/65" />
                <div className="pointer-events-none absolute right-12 top-24 h-1.5 w-1.5 rounded-full bg-[#EC4899]/70" />
                <div className="pointer-events-none absolute left-8 top-20 h-2 w-2 rounded-full bg-[#8B5CF6]/60" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#B45309]">{birthdayLabel}</p>
                    </div>
                    <span className="material-symbols-outlined text-[28px] text-[#EA580C]">celebration</span>
                  </div>

                  {(dashboard.upcomingBirthdays || []).length === 0 ? (
                    <div className="mt-6">
                      <HrmEmptyState
                        compact
                        icon="cake"
                        title="No birthdays available yet"
                        message="Add employee birth dates in the HR records to start showing upcoming birthday reminders here."
                        className="border-white/70 bg-white/45"
                      />
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center px-1 pb-1 text-center">
                      <div className={avatarLayoutClassName}>
                        {visibleBirthdayEmployees.map((employee) => (
                          <div key={employee.id} className="flex flex-col items-center text-center">
                            {employee?.profile_picture_url ? (
                              <Image
                                src={employee.profile_picture_url}
                                alt={employee.name || 'Birthday employee'}
                                width={88}
                                height={88}
                                className="h-[88px] w-[88px] rounded-full object-cover border-4 border-white/90 shadow-[0_18px_36px_rgba(139,92,246,0.22)]"
                                unoptimized
                              />
                            ) : (
                              <div
                                className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-4 border-white/90 bg-white text-2xl font-extrabold text-[#7C3AED] shadow-[0_18px_36px_rgba(139,92,246,0.22)]"
                              >
                                {getInitials(employee?.name)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {featuredBirthdayGroup.length > 4 ? (
                        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C2410C]">
                          +{featuredBirthdayGroup.length - 4} more on the same date
                        </p>
                      ) : null}
                      <p className="mt-5 text-xl font-extrabold leading-tight text-[#4A2412]">
                        {birthdayCopy.heading}
                      </p>
                      <p className="mt-3 max-w-[15rem] text-sm leading-6 text-[#7C5A49]">
                        {birthdayCopy.body}
                      </p>
                      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#9A3412] shadow-sm">
                        <span className="material-symbols-outlined text-[18px] text-[#EA580C]">cake</span>
                        {formatBirthday(featuredBirthday?.date_of_birth)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
