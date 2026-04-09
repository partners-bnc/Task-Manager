'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

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

function getBirthdayCopy(employee) {
  if (!employee) {
    return {
      heading: 'No birthdays lined up yet',
      body: 'Add employee birth dates in the HR master record to start celebrating milestones here.',
    };
  }

  if (employee.daysUntilBirthday === 0) {
    return {
      heading: `Today is ${employee.name}'s birthday`,
      body: 'Share your wishes and make the day feel special for the team.',
    };
  }

  if (employee.daysUntilBirthday === 1) {
    return {
      heading: `${employee.name}'s birthday is tomorrow`,
      body: 'A perfect time to prepare the celebration and the birthday note.',
    };
  }

  return {
    heading: `${employee.name}'s celebration is coming up`,
    body: `Only ${employee.daysUntilBirthday} day${employee.daysUntilBirthday === 1 ? '' : 's'} left, so the HR team can plan ahead.`,
  };
}

function MetricCard({ title, value, subtitle, icon, tone }) {
  return (
    <div className={`rounded-[1.75rem] border border-outline-variant/10 p-5 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">{title}</p>
          <p className="mt-4 text-4xl font-headline font-extrabold text-on-surface">{value}</p>
          <p className="mt-2 text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <span className="material-symbols-outlined block text-2xl leading-none text-on-surface">
            {icon}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard({ admin, setCurrentTab }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/HRM/api/admin/dashboard', { method: 'GET', cache: 'no-store' });
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

  const greetingName = admin?.name || dashboard?.admin?.name || 'HR Admin';
  const helperText = useMemo(() => {
    const department = dashboard?.admin?.department || admin?.department || 'HR';
    const designation = dashboard?.admin?.designation || admin?.designation || 'Administrator';
    return `${designation} • ${department}`;
  }, [admin?.department, admin?.designation, dashboard?.admin?.department, dashboard?.admin?.designation]);

  const metrics = dashboard?.metrics || {
    hrAdminCount: 0,
    employeeCount: 0,
    activeEmployeeCount: 0,
    onLeaveEmployeeCount: 0,
    departmentCount: 0,
    designationCount: 0,
  };
  const featuredBirthday = dashboard?.upcomingBirthdays?.[0] || null;
  const birthdayCopy = getBirthdayCopy(featuredBirthday);

  return (
    <div className="mx-auto max-w-7xl p-10">
      <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">HR Command Center</p>
          <h2 className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
            Welcome, {greetingName}
          </h2>
          <p className="mt-3 text-base font-medium text-on-surface-variant">{helperText}</p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentTab?.('admin-add-employee')}
          className="rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20"
        >
          Add New Employee
        </button>
      </section>

      {loading && (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          Loading HR dashboard...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && dashboard && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Total Employees" value={metrics.employeeCount} subtitle={`${metrics.activeEmployeeCount} active right now`} icon="groups" tone="bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/70" />
            <MetricCard title="Employees On Leave" value={metrics.onLeaveEmployeeCount} subtitle="Pulled from live employee status" icon="event_busy" tone="bg-gradient-to-br from-amber-50 via-white to-orange-100/60" />
            <MetricCard title="HR Admins" value={metrics.hrAdminCount} subtitle={`${metrics.departmentCount} departments supported`} icon="admin_panel_settings" tone="bg-gradient-to-br from-purple-50 via-white to-violet-100/70" />
            <MetricCard title="Designations" value={metrics.designationCount} subtitle="Current organization structure" icon="badge" tone="bg-gradient-to-br from-emerald-50 via-white to-teal-100/70" />
          </section>

          <section className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.7fr)_300px]">
            <div className="self-start rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-on-surface">Recent Employees</h3>
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

              <div className="overflow-hidden rounded-[1.5rem] border border-outline-variant/10 bg-surface">
                {(dashboard.recentEmployees || []).length === 0 ? (
                  <p className="px-5 py-8 text-sm text-on-surface-variant">No employee records are available yet.</p>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {(dashboard.recentEmployees || []).map((employee) => (
                      <div
                        key={employee.id}
                        className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low/35 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          {employee.profile_picture_url ? (
                            <Image
                              src={employee.profile_picture_url}
                              alt={employee.name || 'Employee'}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-full object-cover border border-outline-variant/10"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {getInitials(employee.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-on-surface">{employee.name || 'Employee'}</p>
                            <p className="truncate text-sm text-on-surface-variant">{employee.email || 'No email added'}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:min-w-[380px] md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {employee.designation?.title || 'Designation not set'}
                            </p>
                            <p className="truncate text-xs text-on-surface-variant">
                              {employee.department?.name || 'Department not set'}
                            </p>
                          </div>

                          <div className="inline-flex w-fit rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
                            {employee.employee_id || 'No ID'}
                          </div>

                          <div className="text-left md:text-right">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">Created</p>
                            <p className="mt-1 text-sm font-semibold text-on-surface">
                              {formatDate(employee.created_at?.slice?.(0, 10) || employee.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative self-start overflow-hidden rounded-[2rem] border border-[#E9D8FF] bg-[#F6ECFF] p-5 shadow-[0_22px_70px_rgba(137,92,246,0.16)] xl:max-w-[300px]">
              <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#D8B4FE]/60 blur-3xl" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0ABFC]/45 blur-2xl" />
              <div className="pointer-events-none absolute -left-8 bottom-12 h-28 w-28 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
              <div className="pointer-events-none absolute right-6 top-16 h-2.5 w-2.5 rounded-full bg-[#A855F7]/65" />
              <div className="pointer-events-none absolute right-12 top-24 h-1.5 w-1.5 rounded-full bg-[#EC4899]/70" />
              <div className="pointer-events-none absolute left-8 top-20 h-2 w-2 rounded-full bg-[#8B5CF6]/60" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#B45309]">Upcoming Birthday</p>
                  </div>
                  <span className="material-symbols-outlined text-[28px] text-[#EA580C]">celebration</span>
                </div>

                {(dashboard.upcomingBirthdays || []).length === 0 ? (
                  <div className="mt-6 rounded-[1.5rem] bg-white/45 px-5 py-7 text-sm text-[#7C5A49] backdrop-blur-sm">
                    No employee birthdays are available yet.
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center px-1 pb-1 text-center">
                    {featuredBirthday?.profile_picture_url ? (
                      <Image
                        src={featuredBirthday.profile_picture_url}
                        alt={featuredBirthday.name || 'Birthday employee'}
                        width={168}
                        height={168}
                        className="h-36 w-36 rounded-full object-cover border-4 border-white/90 shadow-[0_18px_36px_rgba(139,92,246,0.22)]"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/90 bg-white text-4xl font-extrabold text-[#7C3AED] shadow-[0_18px_36px_rgba(139,92,246,0.22)]">
                        {getInitials(featuredBirthday?.name)}
                      </div>
                    )}
                    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#C2410C]">
                      {featuredBirthday?.employee_id || 'Employee milestone'}
                    </p>
                    <p className="mt-3 text-xl font-extrabold leading-tight text-[#4A2412]">
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
          </section>
        </div>
      )}
    </div>
  );
}
