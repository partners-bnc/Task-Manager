'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import EmployeePageHeader from '../../ui/EmployeePageHeader';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { TableRowsSkeleton } from '../../ui/Skeleton';

type ModuleKey = 'task_manager' | 'hrm_admin' | 'auditing' | 'crm' | 'vendor';

type ModuleConfig = {
  key: ModuleKey;
  label: string;
};

type EmployeeRow = {
  id: string;
  employee_id?: string;
  name?: string;
  email?: string;
  employment_lifecycle_status?: string | null;
  resolved_employment_lifecycle_status?: string | null;
  current_stage?: string | null;
  resolved_current_stage?: string | null;
  access_disabled_at?: string | null;
  profile_picture_url?: string | null;
  designation?: { title?: string | null } | null;
  department?: { name?: string | null } | null;
  resolved_designation_title?: string | null;
  resolved_department_name?: string | null;
  module_access?: Array<Record<string, unknown>> | Record<string, unknown> | null;
};

const MODULES: ModuleConfig[] = [
  {
    key: 'task_manager',
    label: 'Task Manager',
  },
  {
    key: 'hrm_admin',
    label: 'HRM',
  },
  {
    key: 'auditing',
    label: 'Auditing',
  },
  {
    key: 'crm',
    label: 'CRM',
  },
  {
    key: 'vendor',
    label: 'Vendor',
  },
];

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function getModuleAccessRecord(employee: EmployeeRow) {
  if (!employee?.module_access) return null;
  return Array.isArray(employee.module_access)
    ? employee.module_access[0] || null
    : employee.module_access;
}

function getEmployeeDesignation(employee: EmployeeRow) {
  return employee?.designation?.title || employee?.resolved_designation_title || '--';
}

function getEmployeeDepartment(employee: EmployeeRow) {
  return employee?.department?.name || employee?.resolved_department_name || '--';
}

function getEmployeeRecordId(employee: EmployeeRow) {
  return String(employee?.id || '').trim();
}

function formatLabel(value?: string | null, fallback = 'None') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'none') return fallback;
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getLifecycleTone(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'separated') return 'bg-rose-50 text-rose-700 ring-rose-200/80';
  if (normalized === 'inactive') return 'bg-slate-100 text-slate-700 ring-slate-200/80';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200/80';
}

function buildPatchBody(moduleKey: ModuleKey, nextValue: boolean) {
  if (moduleKey === 'task_manager') {
    return { taskManagerAccess: nextValue };
  }

  if (moduleKey === 'hrm_admin') {
    return { hrmAdminAccess: nextValue };
  }

  if (moduleKey === 'auditing') {
    return { auditingAccess: nextValue };
  }

  if (moduleKey === 'crm') {
    return { crmAccess: nextValue };
  }

  return { vendorAccess: nextValue };
}

export default function ModuleAccessManager() {
  const { showFeedback } = useHrmFeedback();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<{
    employee: EmployeeRow;
    module: ModuleConfig;
    nextValue: boolean;
  } | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/HRM/api/employees?includeMeta=1', { method: 'GET' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load module access list.');
      }

      setEmployees(result.employees || []);
    } catch (error: any) {
      setEmployees([]);
      showFeedback({
        type: 'error',
        title: 'Could not load module access',
        message: error?.message || 'Please refresh and try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (employees || []).filter((employee) => {
      if (!query) return true;

      return [
        employee.employee_id,
        employee.name,
        employee.email,
        getEmployeeDesignation(employee),
        getEmployeeDepartment(employee),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [employees, search]);

  async function handleAccessUpdate() {
    if (!selectedAction) return;

    const employeeRecordId = getEmployeeRecordId(selectedAction.employee);

    if (!employeeRecordId) {
      showFeedback({
        type: 'error',
        title: 'Update failed',
        message: 'Employee id is required',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/HRM/api/employees?id=${encodeURIComponent(employeeRecordId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: employeeRecordId,
          ...buildPatchBody(selectedAction.module.key, selectedAction.nextValue),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update module access.');
      }

      setEmployees((current) =>
        current.map((employee) => (employee.id === result.employee?.id ? result.employee : employee))
      );
      setSelectedAction(null);
      showFeedback({
        type: 'success',
        title: 'Module access updated',
        message: `${selectedAction.module.label} access was ${
          selectedAction.nextValue ? 'granted' : 'removed'
        } for ${selectedAction.employee.name || 'this employee'}.`,
      });
    } catch (error: any) {
      showFeedback({
        type: 'error',
        title: 'Update failed',
        message: error?.message || 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-7 py-7 pb-10">
      <EmployeePageHeader
        icon="admin_panel_settings"
        title="Module Access"
        description="Manage employee access for HRM, Task Manager, Auditing, and CRM in one compact table."
      />

      <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-on-surface">Employee Access Control</h2>
            <p className="text-sm text-on-surface-variant">
              Compact access matrix for every employee. Click any module cell to allow or remove access.
            </p>
          </div>
          <div className="flex w-full gap-3 lg:w-auto">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, ID, designation..."
              className="w-full rounded-2xl border border-outline-variant/15 bg-white px-4 py-2.5 text-sm text-on-surface outline-none lg:w-[340px]"
            />
            <button
              type="button"
              onClick={loadEmployees}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-2.5 text-sm font-bold text-on-surface-variant"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-outline-variant/10">
          <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[1180px] table-fixed">
              <thead className="sticky top-0 z-20 border-b border-outline-variant/10 bg-surface-container-low/50">
                <tr>
                  <th className="w-[320px] px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Employee
                  </th>
                  <th className="w-[220px] px-3 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Designation / Department
                  </th>
                  {MODULES.map((module) => (
                    <th
                      key={module.key}
                      className="px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/70"
                    >
                      {module.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={2 + MODULES.length} className="px-0 py-0">
                      <TableRowsSkeleton rows={6} columns={2 + MODULES.length} />
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={2 + MODULES.length} className="px-4 py-6">
                      <HrmEmptyState
                        compact
                        icon="manage_accounts"
                        title="No employees match this search"
                        message="Try a different name, email, employee ID, or designation to update module access."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const access = getModuleAccessRecord(employee) as Record<string, boolean> | null;
                    const employeeRecordId = getEmployeeRecordId(employee);
                    const lifecycleStatus = employee.resolved_employment_lifecycle_status || employee.employment_lifecycle_status || 'active';
                    const currentStage = employee.resolved_current_stage || employee.current_stage || 'none';

                    return (
                      <tr key={employeeRecordId || employee.employee_id || employee.email || employee.name} className="hover:bg-surface-container-low/20">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {employee.profile_picture_url ? (
                              <Image
                                src={employee.profile_picture_url}
                                alt={employee.name || 'Employee'}
                                width={38}
                                height={38}
                                className="h-[38px] w-[38px] rounded-full border border-outline-variant/10 object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-container text-xs font-bold text-primary">
                                {getInitials(employee.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-on-surface">{employee.name || 'Unknown'}</p>
                              <p className="truncate text-xs text-on-surface-variant">{employee.email || 'No email'}</p>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant/70">
                                {employee.employee_id || '--'}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${getLifecycleTone(lifecycleStatus)}`}>
                                  {formatLabel(lifecycleStatus, 'Active')}
                                </span>
                                {currentStage !== 'none' ? (
                                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200/80">
                                    {formatLabel(currentStage)}
                                  </span>
                                ) : null}
                                {employee.access_disabled_at ? (
                                  <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                                    Access Disabled
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="truncate text-sm font-semibold text-on-surface">{getEmployeeDesignation(employee)}</p>
                          <p className="truncate text-xs text-on-surface-variant">{getEmployeeDepartment(employee)}</p>
                        </td>
                        {MODULES.map((module) => {
                          const enabled = Boolean(access?.[module.key]);

                          return (
                            <td key={module.key} className="px-2 py-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedAction({
                                    employee,
                                    module,
                                    nextValue: !enabled,
                                  })
                                }
                                className={`inline-flex min-w-[110px] items-center justify-center rounded-full px-4 py-2 text-[11.5px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 ${
                                  enabled
                                    ? 'bg-[#2559a5] text-white shadow-[0_4px_12px_rgba(37,89,165,0.18)] hover:bg-[#1d4682] hover:shadow-[0_6px_16px_rgba(37,89,165,0.3)] border-none'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200/60 hover:bg-slate-200/50 hover:text-slate-655'
                                }`}
                                disabled={!employeeRecordId}
                              >
                                {enabled ? 'Access On' : 'Access Off'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAction ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/20 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-[linear-gradient(165deg,#ffffff_0%,#edf4fc_52%,#d7e7f9_100%)] p-6 shadow-[0_30px_70px_rgba(49,112,197,0.22)]">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  selectedAction.nextValue
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
                    : 'bg-rose-50 text-rose-700 ring-rose-200/80'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div>
                <p className="text-lg font-extrabold text-on-surface">Update Module Access</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {selectedAction.nextValue
                    ? `Do you want to give ${selectedAction.module.label} access to ${selectedAction.employee.name || 'this employee'}?`
                    : `Do you want to remove ${selectedAction.module.label} access from ${selectedAction.employee.name || 'this employee'}?`}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-outline-variant/10 bg-white/80 p-4">
              <p className="text-sm font-bold text-on-surface">{selectedAction.employee.name || 'Unknown employee'}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{selectedAction.employee.email || 'No email'}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {selectedAction.employee.employee_id || '--'} | {getEmployeeDesignation(selectedAction.employee)} | {getEmployeeDepartment(selectedAction.employee)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Status: {formatLabel(selectedAction.employee.resolved_employment_lifecycle_status || selectedAction.employee.employment_lifecycle_status, 'Active')}
                {selectedAction.employee.access_disabled_at ? ' | Access Disabled' : ''}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                disabled={saving}
                className="rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-bold text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Do Not Change
              </button>
              <button
                type="button"
                onClick={handleAccessUpdate}
                disabled={saving}
                className="rounded-full bg-[linear-gradient(180deg,#d7e7f9_0%,#7eb0ec_100%)] px-5 py-2.5 text-sm font-extrabold text-violet-950 shadow-[0_12px_22px_rgba(49,112,197,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? 'Saving...'
                  : selectedAction.nextValue
                    ? 'Give Access'
                    : 'Take Access'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
