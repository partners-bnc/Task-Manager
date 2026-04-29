'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import HrmEmptyState from '../ui/HrmEmptyState';
import { DetailPanelSkeleton, MetricCardSkeleton, TableRowsSkeleton } from '../ui/Skeleton';

function formatCurrency(value: any) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatPolicyMode(value?: string | null) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'fixed') return 'Fixed amount';
  if (normalized === 'percent') return 'Percentage';
  return '--';
}

function formatPolicyValue(value: any, mode?: string | null) {
  if (value === null || value === undefined) return '--';
  if (String(mode || '').toLowerCase() === 'percent') {
    return `${Number(value || 0)}%`;
  }
  return formatCurrency(value);
}

function formatToggle(value?: boolean | null) {
  return value ? 'Enabled' : 'Disabled';
}

function getPayrollNotes(item: any) {
  return (
    item?.calculation_snapshot?.notes ||
    item?.calculation_snapshot?.policy?.notes ||
    item?.calculation_snapshot?.effectiveRevision?.notes ||
    '--'
  );
}

function openPdfInNewTab(url: string) {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function triggerPdfDownload(url: string) {
  if (typeof window === 'undefined') return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener';
  anchor.click();
}

function SummaryCard({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest p-5 editorial-shadow">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-xl font-headline font-bold text-on-background">{value}</p>
      <p className="mt-1 text-sm leading-6 text-on-surface-variant">{helper}</p>
    </div>
  );
}

function DetailKeyValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/10 py-3 last:border-b-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className={`text-sm font-semibold ${emphasis ? 'text-emerald-700' : 'text-on-surface'}`}>{value}</span>
    </div>
  );
}

export default function Salary({ employee }: { employee?: any }) {
  const { showFeedback } = useHrmFeedback();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [salaryView, setSalaryView] = useState<'current' | 'policy'>('current');

  const employeeName = employee?.name || 'Employee';

  const loadMonth = useCallback(async (year: number, month: number) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/HRM/api/employee/payroll/${year}/${month}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load payroll month');
      }
      setSelectedMonth(result.item);
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Payroll Month Not Loaded', message: error.message || 'Failed to load payroll month' });
    } finally {
      setDetailLoading(false);
    }
  }, [showFeedback]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/HRM/api/employee/payroll', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load payroll history');
      }

      setItems(result.items || []);
      setSelectedMonth(null);
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Payroll History Not Loaded', message: error.message || 'Failed to load payroll history' });
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    async function boot() {
      await loadHistory();
    }

    boot();
  }, [loadHistory]);

  const latestRevision = useMemo(() => {
    return selectedMonth?.calculation_snapshot?.effectiveRevision || items[0]?.calculation_snapshot?.effectiveRevision || null;
  }, [items, selectedMonth]);

  const latestSnapshot = selectedMonth?.calculation_snapshot || items[0]?.calculation_snapshot || null;
  const payrollPolicy = latestSnapshot?.policy || null;
  const selectedPayslipPdfUrl = selectedMonth
    ? `/HRM/api/employee/payroll/${selectedMonth.payroll_run.year}/${selectedMonth.payroll_run.month}/payslip`
    : '';
  const selectedPayslipDownloadUrl = selectedPayslipPdfUrl ? `${selectedPayslipPdfUrl}?download=1` : '';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <EmployeePageHeader
        icon="payments"
        title="Salary & Payslips"
        description="Review your paid salary history, deduction breakdowns, and frozen monthly payslips."
      />

      <section className="space-y-4">
        <div className="inline-grid grid-cols-2 gap-2 rounded-full border border-outline-variant/10 bg-surface-container-lowest p-1 shadow-sm">
          {[
            { id: 'current', label: 'Current Salary' },
            { id: 'policy', label: 'Salary Policy' },
          ].map((tab) => {
            const isActive = salaryView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSalaryView(tab.id as 'current' | 'policy')}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <MetricCardSkeleton count={3} />
        ) : salaryView === 'current' ? (
          <section className="grid gap-4 lg:grid-cols-3">
            <SummaryCard
              label="Current Salary"
              value={formatCurrency(employee?.salary)}
              helper={`Current salary master for ${employeeName}. Final paid amount can differ by month due to LOP, deductions, and releases.`}
            />
            <SummaryCard
              label="Latest Increment"
              value={latestRevision ? formatCurrency(latestRevision.new_salary) : 'No revision yet'}
              helper={latestRevision ? `Effective from ${formatDate(latestRevision.effective_from)}` : 'Your latest approved increment will appear here after payroll is processed.'}
            />
            <SummaryCard
              label="Latest Paid Month"
              value={items[0] ? formatMonth(items[0].payroll_run.year, items[0].payroll_run.month) : 'No payroll yet'}
              helper={items[0] ? `Net salary ${formatCurrency(items[0].net_salary)}` : 'This section becomes visible after HR marks a payroll month as paid.'}
            />
          </section>
        ) : (
          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
            <div className="border-b border-outline-variant/10 pb-4">
              <h2 className="text-xl font-headline font-bold text-on-background">Salary Policy</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Payroll policy, payslip release rules, and salary credit timing used for employees.
              </p>
            </div>
            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-outline-variant/10 bg-white">
              <div className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-outline-variant/10 bg-surface-container-low/40 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                <div>Rule</div>
                <div>How It Works</div>
              </div>
              {[
                ['PF', 'PF uses one fixed amount. The same fixed amount is applied on employee side and employer side, and both are included in payroll deductions.'],
                ['TDS', 'TDS is deducted only once from the employee side and HR can configure it either as a percent value or as one fixed amount.'],
                ['Retention', 'Retention deducts a fixed monthly amount from salary while the schedule is active. HR can later release the retained amount through a separate retention release entry.'],
                ['LOP', 'One LOP day is deducted using monthly salary divided by total calendar days in that payroll month.'],
                ['Join / Exit', 'If an employee joins or exits in the middle of a month, salary is prorated using active calendar days inside the payroll month.'],
                ['Payslip Visibility', 'Salary month is visible after HR marks it paid, but the payslip PDF is visible only after HR sends the payslip to the employee panel.'],
                ['Salary Credit Day', 'Salary is credited to the employee on the 8th day of every month.'],
              ].map(([title, body]) => (
                <div key={title} className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-outline-variant/10 px-5 py-5 last:border-b-0">
                  <div className="text-sm font-bold text-on-surface">{title}</div>
                  <div className="text-sm leading-7 text-on-surface-variant">{body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        {!selectedMonth ? (
        <div className="overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant/10 px-6 py-5">
            <h2 className="text-xl font-headline font-bold text-on-background">Paid Salary History</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Only months marked paid by HR are visible here.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed">
              <thead className="border-b border-outline-variant/10 bg-surface-container-low/40">
                <tr>
                  <th className="w-[22%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Month</th>
                  <th className="w-[13%] px-3 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Gross</th>
                  <th className="w-[13%] px-3 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Deductions</th>
                  <th className="w-[13%] px-3 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Net</th>
                  <th className="w-[18%] px-3 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Payslip</th>
                  <th className="w-[21%] px-3 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-0 py-0">
                      <TableRowsSkeleton rows={5} columns={6} />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6">
                      <HrmEmptyState
                        compact
                        icon="payments"
                        title="No paid salary history yet"
                        message="Paid payroll months will appear here once HR completes payroll and marks a month as paid."
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-surface-container-low/30 ${
                        selectedMonth?.id === item.id ? 'bg-emerald-50/70' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-on-surface">{formatMonth(item.payroll_run.year, item.payroll_run.month)}</p>
                        <p className="text-xs text-on-surface-variant">Paid {formatDate(item.paid_at)}</p>
                      </td>
                      <td className="px-3 py-4 text-sm text-on-surface">{formatCurrency(item.prorated_salary)}</td>
                      <td className="px-3 py-4 text-sm text-on-surface">{formatCurrency(item.total_deductions)}</td>
                      <td className="px-3 py-4 text-sm font-bold text-emerald-700">{formatCurrency(item.net_salary)}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">
                        <div className="space-y-1">
                          <p>{item.payslipReleased
                            ? item.payslip?.payslip_number || 'Released'
                            : item.hasGeneratedPayslip
                              ? 'Waiting For HR Release'
                              : 'Not Generated'}</p>
                          <p className="text-xs text-on-surface-variant">
                            {item.payslipReleased ? 'Released by HR' : item.hasGeneratedPayslip ? 'Pending release' : 'Not ready'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-on-surface">
                        <button
                          type="button"
                          onClick={() => loadMonth(item.payroll_run.year, item.payroll_run.month)}
                          className="inline-flex items-center justify-center rounded-full border border-outline-variant/15 bg-white px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
          {detailLoading ? (
            <div>
              <DetailPanelSkeleton />
            </div>
          ) : selectedMonth ? (
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(null)}
                      aria-label="Back to paid salary history"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-low text-on-surface transition hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div>
                    <h2 className="text-xl font-headline font-bold text-on-background">Monthly Breakdown</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {formatMonth(selectedMonth.payroll_run.year, selectedMonth.payroll_run.month)} salary detail in a clean key-value format.
                    </p>
                    </div>
                  </div>
                  {selectedMonth?.payslipReleased && selectedMonth?.payslip?.snapshot_json ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openPdfInNewTab(selectedPayslipPdfUrl)}
                        className="rounded-full border border-outline-variant/15 bg-white px-5 py-2.5 text-sm font-semibold text-on-surface shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-surface-container-low hover:shadow-[0_12px_22px_rgba(15,23,42,0.12)]"
                      >
                        View Payslip
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPdfDownload(selectedPayslipDownloadUrl)}
                        className="rounded-full border border-violet-200 bg-[linear-gradient(180deg,#faf5ff_0%,#efe7ff_100%)] px-5 py-2.5 text-sm font-semibold text-violet-950 shadow-[0_10px_20px_rgba(167,139,250,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(167,139,250,0.22)]"
                      >
                        Download Payslip
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Month Summary</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Core month, payout, and status information.</p>
                  </div>
                  <div className="mt-4">
                    <DetailKeyValue label="Month" value={formatMonth(selectedMonth.payroll_run.year, selectedMonth.payroll_run.month)} />
                    <DetailKeyValue label="Gross Salary" value={formatCurrency(selectedMonth.prorated_salary)} />
                    <DetailKeyValue label="Total Deductions" value={formatCurrency(selectedMonth.total_deductions)} />
                    <DetailKeyValue label="Net Salary" value={formatCurrency(selectedMonth.net_salary)} emphasis />
                    <DetailKeyValue label="Payment Status" value="Paid" />
                    <DetailKeyValue label="Paid At" value={formatDate(selectedMonth.paid_at)} />
                    <DetailKeyValue
                      label="Payslip Status"
                      value={selectedMonth.payslipReleased ? 'Released' : selectedMonth.hasGeneratedPayslip ? 'Waiting For HR Release' : 'Not Generated'}
                    />
                    <DetailKeyValue label="Payslip Number" value={selectedMonth.payslip?.payslip_number || '--'} />
                    <DetailKeyValue label="Generated At" value={formatDate(selectedMonth.payslip?.generated_at)} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Breakdown</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Frozen monthly calculation values used by payroll.</p>
                  </div>
                  <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    <div>
                      <DetailKeyValue label="Salary Snapshot" value={formatCurrency(selectedMonth.salary_snapshot)} />
                      <DetailKeyValue label="Prorated Salary" value={formatCurrency(selectedMonth.prorated_salary)} />
                      <DetailKeyValue label="LOP Deduction" value={formatCurrency(selectedMonth.lop_deduction)} />
                      <DetailKeyValue label="Employee PF" value={formatCurrency(selectedMonth.pf_employee_deduction)} />
                      <DetailKeyValue label="Employer PF" value={formatCurrency(selectedMonth.pf_employer_deduction)} />
                      <DetailKeyValue label="Total PF" value={formatCurrency(selectedMonth.total_pf_deduction)} />
                    </div>
                    <div>
                      <DetailKeyValue label="Employee TDS" value={formatCurrency(selectedMonth.tds_employee_deduction ?? selectedMonth.tds_deduction)} />
                      <DetailKeyValue label="Total TDS" value={formatCurrency(selectedMonth.total_tds_deduction ?? selectedMonth.tds_deduction)} />
                      <DetailKeyValue label="Retention" value={formatCurrency(selectedMonth.retention_deduction)} />
                      <DetailKeyValue label="Retention Release" value={formatCurrency(selectedMonth.retention_release_amount)} />
                      <DetailKeyValue label="Active Days" value={latestSnapshot?.meta?.activeDays ?? selectedMonth.active_days} />
                      <DetailKeyValue label="LOP Days" value={latestSnapshot?.meta?.lopDays ?? selectedMonth.lop_days} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Payroll Policy</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Frozen payroll policy applied for this month.</p>
                  </div>
                  <div className="mt-4">
                    <DetailKeyValue label="PF" value={formatToggle(payrollPolicy?.pfEnabled)} />
                    <DetailKeyValue label="PF Value" value={formatPolicyValue(payrollPolicy?.pfValue, payrollPolicy?.pfMode)} />
                    <DetailKeyValue label="TDS" value={formatToggle(payrollPolicy?.tdsEnabled)} />
                    <DetailKeyValue label="TDS Mode" value={formatPolicyMode(payrollPolicy?.tdsMode)} />
                    <DetailKeyValue label="TDS Value" value={formatPolicyValue(payrollPolicy?.tdsValue, payrollPolicy?.tdsMode)} />
                    <DetailKeyValue label="Retention" value={formatToggle(payrollPolicy?.retentionEnabled)} />
                    <DetailKeyValue label="Monthly Retention" value={formatCurrency(payrollPolicy?.retentionMonthlyAmount || 0)} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Notes</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Saved notes and release state for the selected month.</p>
                  </div>
                  <div className="mt-4">
                    <DetailKeyValue label="Notes" value={getPayrollNotes(selectedMonth)} />
                    <DetailKeyValue
                      label="Payslip Availability"
                      value={selectedMonth.payslipReleased ? 'Visible in employee panel' : selectedMonth.hasGeneratedPayslip ? 'Waiting for HR release' : 'Not available yet'}
                    />
                  </div>
                </div>
              </div>

              {!selectedMonth.payslipReleased && selectedMonth.hasGeneratedPayslip ? (
                <HrmEmptyState
                  icon="schedule_send"
                  title="Payslip not released yet"
                  message="HR has marked this salary month as paid, but the payslip PDF will appear only after HR sends it to your panel."
                />
              ) : null}
            </div>
          ) : (
            <HrmEmptyState
              icon="calendar_month"
              title="Select a paid month"
              message="Use the View action in paid salary history to open the monthly breakdown."
            />
          )}
        </div>
        )}
      </section>
    </div>
  );
}
