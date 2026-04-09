'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { formatEmploymentValue, getEmployeeTypeLabel } from '@/utils/hrm-employment';

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function formatStatus(status = '') {
  return formatEmploymentValue(status);
}

function statusTone(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'inactive') return 'bg-slate-100 text-slate-700';
  if (normalized === 'terminated') return 'bg-rose-50 text-rose-700';
  return 'bg-surface-container-low text-on-surface-variant';
}

function stageTone(stage = '') {
  const normalized = String(stage || '').toLowerCase();
  if (normalized === 'probation') return 'bg-violet-50 text-violet-700';
  if (normalized === 'on_leave') return 'bg-amber-50 text-amber-700';
  if (normalized === 'notice_period') return 'bg-sky-50 text-sky-700';
  return 'bg-surface-container-low text-on-surface-variant';
}

function pickFirstText(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return '';
}

function getRelationRecord(value: any) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function formatReportingTarget(employee: any) {
  const name = employee?.directory_reporting_manager || employee?.reporting_manager_name || '--';

  if (employee?.reporting_manager_kind === 'super_admin' && name !== '--') {
    return `${name} (Super Admin)`;
  }

  return name;
}

export default function EmployeeList({
  setCurrentTab,
  setSelectedEmployeeId,
}: {
  setCurrentTab?: (tab: string) => void;
  setSelectedEmployeeId?: (employeeId: string) => void;
}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function loadEmployees() {
    try {
      setLoading(true);
      const response = await fetch('/HRM/api/employees?includeMeta=1', { method: 'GET', cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load employee directory');
      }

      setEmployees(result.employees || []);
      setDesignations(result.designations || []);
      setDepartments(result.departments || []);
      setError('');
    } catch (requestError) {
      setEmployees([]);
      setDesignations([]);
      setDepartments([]);
      setError(requestError.message || 'Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const designationMap = useMemo(
    () => new Map((designations || []).map((designation) => [designation.id, designation.title || ''])),
    [designations]
  );

  const departmentMap = useMemo(
    () => new Map((departments || []).map((department) => [department.id, department.name || ''])),
    [departments]
  );

  const enrichedEmployees = useMemo(() => {
    return employees.map((employee) => ({
      ...employee,
      resolvedMobile: pickFirstText(
        employee.directory_phone,
        employee.resolved_phone_number,
        employee.mobile_phone,
        employee.phone,
        employee.mobile,
        employee.alternate_phone
      ) || '--',
      resolvedDesignation: pickFirstText(
        employee.directory_designation,
        employee.resolved_designation_title,
        getRelationRecord(employee.designation)?.title,
        designationMap.get(employee.designation_id),
        employee.designation_title
      ) || '--',
      resolvedDepartment: pickFirstText(
        employee.directory_department,
        employee.resolved_department_name,
        getRelationRecord(employee.department)?.name,
        departmentMap.get(employee.department_id),
        employee.department_name
      ) || 'Department not set',
      resolvedType: employee.resolved_employee_type || employee.employee_type || 'full_time_employee',
      resolvedLifecycleStatus:
        employee.resolved_employment_lifecycle_status || employee.employment_lifecycle_status || 'active',
      resolvedStage: employee.resolved_current_stage || employee.current_stage || 'none',
    }));
  }, [departmentMap, designationMap, employees]);

  const designationOptions = useMemo(() => {
    return [...new Set((designations || []).map((designation) => designation.title).filter(Boolean))].sort();
  }, [designations]);

  const reportingManagerOptions = useMemo(() => {
    return [...new Set(enrichedEmployees.map((employee) => employee.reporting_manager_name).filter(Boolean))].sort();
  }, [enrichedEmployees]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return enrichedEmployees.filter((employee) => {
      const searchMatch = !normalizedSearch || [
        employee.employee_id,
        employee.name,
        employee.email,
        employee.resolvedMobile,
        employee.resolvedDesignation,
        employee.resolvedDepartment,
        employee.reporting_manager_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const designationMatch = !designationFilter || employee.resolvedDesignation === designationFilter;
      const managerMatch = !managerFilter || employee.reporting_manager_name === managerFilter;
      const statusMatch = !statusFilter || String(employee.resolvedLifecycleStatus || '').toLowerCase() === statusFilter.toLowerCase();

      return searchMatch && designationMatch && managerMatch && statusMatch;
    });
  }, [designationFilter, enrichedEmployees, managerFilter, search, statusFilter]);

  return (
    <div className="p-10 pb-12 w-full space-y-8">
      <section className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">database</span>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Employee Directory</h1>
              <p className="text-on-surface-variant text-lg">{filteredEmployees.length} of {employees.length} total employees</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadEmployees}
            className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-3 text-sm font-bold text-on-surface-variant"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab?.('admin-add-employee')}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20"
          >
            Add New Employee
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr_1fr_0.85fr] gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, phone number, designation..."
          className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-4 text-sm text-on-surface outline-none"
        />
        <select
          value={designationFilter}
          onChange={(event) => setDesignationFilter(event.target.value)}
          className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-4 text-sm text-on-surface outline-none"
        >
          <option value="">All Designations</option>
          {designationOptions.map((designation) => (
            <option key={designation} value={designation}>{designation}</option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(event) => setManagerFilter(event.target.value)}
          className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-4 text-sm text-on-surface outline-none"
        >
          <option value="">All Reporting To</option>
          {reportingManagerOptions.map((manager) => (
            <option key={manager} value={manager}>{manager}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-4 text-sm text-on-surface outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-[2rem] overflow-hidden border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full">
            <thead className="bg-surface-container-low/50 border-b border-outline-variant/10">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">ID</th>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">Name</th>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">Phone Number</th>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">Designation</th>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">Reporting To</th>
                <th className="px-6 py-5 text-left text-[11px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/60">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-on-surface-variant">Loading employee directory...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-on-surface-variant">No employees match the current filters.</td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="cursor-pointer hover:bg-surface-container-low/20 transition-colors"
                    onClick={() => {
                      setSelectedEmployeeId?.(employee.id);
                      setCurrentTab?.('admin-employee-profile');
                    }}
                  >
                    <td className="px-6 py-5 text-lg font-bold text-primary/60">{employee.employee_id || '--'}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
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
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-primary">
                            {getInitials(employee.name)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-on-surface text-lg">{employee.name || 'Unknown'}</p>
                          <p className="text-sm text-on-surface-variant">{employee.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-base text-on-surface">{employee.resolvedMobile}</td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-on-surface">{employee.resolvedDesignation}</p>
                      <p className="text-sm text-on-surface-variant">{employee.resolvedDepartment}</p>
                      <p className="text-xs text-on-surface-variant/80">{getEmployeeTypeLabel(employee.resolvedType)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base text-on-surface">{formatReportingTarget(employee)}</p>
                      <p className="text-sm text-on-surface-variant">
                        {employee.reporting_manager_kind === 'super_admin'
                          ? 'Executive reporting'
                          : employee.reporting_manager_employee_id || '--'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${statusTone(employee.resolvedLifecycleStatus)}`}>
                          {formatStatus(employee.resolvedLifecycleStatus)}
                        </span>
                        {employee.resolvedStage !== 'none' ? (
                          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${stageTone(employee.resolvedStage)}`}>
                            {formatStatus(employee.resolvedStage)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
