'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { DetailPanelSkeleton, LoadingPanel, TableRowsSkeleton } from '../../ui/Skeleton';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'directory', label: 'Employee Salary Directory', icon: 'groups' },
  { id: 'history', label: 'Employee Salary History', icon: 'history' },
  { id: 'policy', label: 'Payroll Policy', icon: 'policy' },
  { id: 'calculator', label: 'Employee Salary Calculator', icon: 'calculate' },
  { id: 'ledger', label: 'Payroll Ledger', icon: 'receipt_long' },
];

let xlsxLoaderPromise: Promise<any> | null = null;

function ensureXlsxLoaded() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Excel export is only available in the browser.'));
  }

  if ((window as any).XLSX) {
    return Promise.resolve((window as any).XLSX);
  }

  if (xlsxLoaderPromise) {
    return xlsxLoaderPromise;
  }

  xlsxLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('Failed to load Excel export library.'));
    document.head.appendChild(script);
  });

  return xlsxLoaderPromise;
}

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

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatStatusLabel(status?: string | null) {
  const normalized = String(status || 'draft').replace(/_/g, ' ').trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Draft';
}

function formatToggle(value: unknown) {
  return value ? 'Enabled' : 'Disabled';
}

function formatPolicyMode(mode?: string | null) {
  if (mode === 'fixed') return 'Fixed Amount';
  if (mode === 'percent') return 'Percent';
  return '--';
}

function formatPolicyValue(value: unknown, mode?: string | null) {
  const numeric = Number(value || 0);
  if (mode === 'percent') return `${numeric}%`;
  return formatCurrency(numeric);
}

function formatStatusText(value?: string | null) {
  return String(value || '--').replace(/_/g, ' ');
}

function safeFilePart(value: string) {
  return String(value || 'export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');
}

function statusTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'payment_pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'generated') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function lifecycleTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'separated') return 'bg-rose-50 text-rose-700';
  return 'bg-violet-50 text-violet-700';
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

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function KpiCard({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-[1.6rem] border border-outline-variant/10 bg-white px-5 py-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <p className="mt-3 text-2xl font-headline font-bold text-on-background">{value}</p>
      <p className="mt-2 text-xs text-on-surface-variant">{helper}</p>
    </div>
  );
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-outline-variant/10 py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <div className="mt-1 text-sm font-medium text-on-surface">{value}</div>
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

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-slate-400 ${props.className || ''}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-slate-400 ${props.className || ''}`}
    />
  );
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function ToggleChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`inline-flex w-fit items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
        checked
          ? 'border-violet-300 bg-violet-200 text-violet-950'
          : 'border-outline-variant/15 bg-white text-on-surface'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-slate-900"
      />
      {label}
    </label>
  );
}

function SoftTag({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'sky' | 'violet';
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  }[tone];

  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

export default function PayoutsPayroll() {
  const { showFeedback: showHrmFeedback } = useHrmFeedback();
  const sessionRedirectStartedRef = useRef(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthValue = `${currentYear}-${currentMonth}`;
  const [activeSection, setActiveSection] = useState('dashboard');
  const [directory, setDirectory] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [directoryDetailOpen, setDirectoryDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewYear, setPreviewYear] = useState(String(currentYear));
  const [previewMonth, setPreviewMonth] = useState(currentMonth);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCalculatorEmployeeId, setSelectedCalculatorEmployeeId] = useState<string | null>(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const [historyYear, setHistoryYear] = useState(String(currentYear));
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItemId, setSelectedHistoryItemId] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<any>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDetail, setItemDetail] = useState<any>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [activeLedgerAction, setActiveLedgerAction] = useState<{ itemId: string; type: 'view' | 'payslip' | 'paid' | 'send' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [profileForm, setProfileForm] = useState({
    pfEnabled: false,
    pfValue: '0',
    tdsEnabled: false,
    tdsMode: 'percent',
    tdsValue: '0',
    retentionEnabled: false,
    notes: '',
  });
  const [revisionForm, setRevisionForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    revisionType: 'percent',
    revisionValue: '',
    reason: '',
  });
  const [retentionForm, setRetentionForm] = useState({
    startMonth: currentMonthValue,
    endMonth: '',
    monthlyAmount: '',
    status: 'active',
    notes: '',
  });
  const [releaseForm, setReleaseForm] = useState({
    releaseMonth: currentMonthValue,
    amount: '',
    linkedScheduleId: '',
    notes: '',
  });

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    showHrmFeedback({
      type,
      title: type === 'success' ? 'Updated' : 'Action Required',
      message: text,
    });
  }, [showHrmFeedback]);

  const buildSessionExpiredError = useCallback(() => {
    const error = new Error('Session expired');
    (error as Error & { sessionExpired?: boolean }).sessionExpired = true;
    return error;
  }, []);

  const isSessionExpiredError = useCallback((error: unknown) => {
    return Boolean((error as { sessionExpired?: boolean } | null)?.sessionExpired);
  }, []);

  const handleSessionExpired = useCallback(() => {
    if (sessionRedirectStartedRef.current) {
      return;
    }

    sessionRedirectStartedRef.current = true;
    showHrmFeedback({
      type: 'warning',
      title: 'Session Expired',
      message: 'Your login session expired after inactivity. Please log in again. Redirecting to the login page...',
      confirmLabel: 'Log In Again',
    });

    window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }, 1400);
  }, [showHrmFeedback]);

  const fetchPayrollJson = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      handleSessionExpired();
      throw buildSessionExpiredError();
    }

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  }, [buildSessionExpiredError, handleSessionExpired]);

  const loadDirectory = useCallback(async (selectedId?: string | null) => {
    try {
      setDirectoryLoading(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/profiles', { cache: 'no-store' });

      setDirectory(result.employees || []);
      const nextId = selectedId ?? result.employees?.[0]?.id ?? null;
      if (nextId) {
        setSelectedEmployeeId((current) => current || nextId);
        setSelectedCalculatorEmployeeId((current) => current || nextId);
        setHistoryEmployeeId((current) => current || nextId);
      }
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load payroll directory');
    } finally {
      setDirectoryLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const loadDetail = useCallback(async (employeeId: string) => {
    try {
      setDetailLoading(true);
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/profiles?employeeId=${employeeId}`, { cache: 'no-store' });

      setDetail(result);
      setProfileForm({
        pfEnabled: Boolean(result.profile?.pf_enabled),
        pfValue: String(result.profile?.pf_value ?? 0),
        tdsEnabled: Boolean(result.profile?.tds_enabled),
        tdsMode: result.profile?.tds_mode || 'percent',
        tdsValue: String(result.profile?.tds_value ?? 0),
        retentionEnabled: Boolean(result.profile?.retention_enabled),
        notes: result.profile?.notes || '',
      });
      setReleaseForm((current) => ({
        ...current,
        linkedScheduleId: result.retentionSchedules?.[0]?.id || '',
      }));
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load payroll employee');
    } finally {
      setDetailLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const loadRuns = useCallback(async () => {
    try {
      setRunsLoading(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/runs', { cache: 'no-store' });
      setRuns(result.runs || []);
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load payroll ledger');
    } finally {
      setRunsLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const loadItem = useCallback(async (itemId: string) => {
    try {
      setItemLoading(true);
      setActiveLedgerAction({ itemId, type: 'view' });
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/items/${itemId}`, { cache: 'no-store' });
      setItemDetail(result);
      setSelectedItemId(itemId);
      setActiveSection('ledger');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load payroll item');
    } finally {
      setActiveLedgerAction(null);
      setItemLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const loadHistoryRows = useCallback(async (employeeId: string | null, yearValue: string) => {
    if (!employeeId) {
      setHistoryRows([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const params = new URLSearchParams({
        employeeId,
        year: String(yearValue || ''),
      });
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/history?${params.toString()}`, { cache: 'no-store' });
      setHistoryRows(result.rows || []);
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load employee salary history');
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const loadHistoryDetail = useCallback(async (itemId: string) => {
    try {
      setHistoryDetailLoading(true);
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/history/${itemId}`, { cache: 'no-store' });
      setHistoryDetail(result);
      setSelectedHistoryItemId(itemId);
      setActiveSection('history');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to load employee salary history detail');
    } finally {
      setHistoryDetailLoading(false);
    }
  }, [fetchPayrollJson, isSessionExpiredError, showFeedback]);

  const exportExcelFile = useCallback(async (sheetName: string, rows: Array<Record<string, any>>, fileName: string) => {
    if (!rows.length) {
      showFeedback('error', 'No data is available to export.');
      return;
    }

    try {
      const XLSX = await ensureXlsxLoaded();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, fileName);
      showFeedback('success', 'Excel file exported successfully.');
    } catch (error: any) {
      showFeedback('error', error.message || 'Failed to export Excel file.');
    }
  }, [showFeedback]);

  const handleExportDirectory = useCallback(() => {
    const rows = directory.map((employee: any) => ({
      employee_id: employee.employee_id || '--',
      employee_name: employee.name || '--',
      email: employee.email || '--',
      designation: employee.designation_title || '--',
      join_date: formatDate(employee.date_of_joining),
      lifecycle_status: formatStatusText(employee.resolved_employment_lifecycle_status || 'active'),
      current_stage: formatStatusText(employee.resolved_current_stage || '--'),
      company: employee.company || '--',
      salary: Number(employee.salary || 0),
      pf_enabled: employee.deduction_flags?.pf ? 'Enabled' : 'Disabled',
      tds_enabled: employee.deduction_flags?.tds ? 'Enabled' : 'Disabled',
      retention_enabled: employee.deduction_flags?.retention ? 'Enabled' : 'Disabled',
      estimated_in_hand_salary: Number(employee.estimated_in_hand_salary || 0),
      last_increment_date: employee.latest_revision ? formatDate(employee.latest_revision.effective_from) : '--',
      last_increment_salary: employee.latest_revision ? Number(employee.latest_revision.new_salary || 0) : '',
    }));

    return exportExcelFile('Salary Directory', rows, 'employee_salary_directory.xlsx');
  }, [directory, exportExcelFile]);

  const handleExportHistory = useCallback(() => {
    const historyEmployee = directory.find((employee) => employee.id === historyEmployeeId) || null;
    const employeeName = historyEmployee?.name || 'employee';
    const rows = historyRows.map((row: any) => ({
      employee_name: historyEmployee?.name || row.employee?.name || '--',
      employee_id: historyEmployee?.employee_id || row.employee?.employee_id || '--',
      year: row.payroll_run?.year || historyYear,
      month: formatMonthLabel(row.payroll_run?.year || Number(historyYear), row.payroll_run?.month || 1),
      gross_salary: Number(row.prorated_salary || 0),
      total_deductions: Number(row.total_deductions || 0),
      net_salary: Number(row.net_salary || 0),
      payment_status: formatStatusLabel(row.payment_status),
      payslip_status: row.isPayslipReleased ? 'Released' : row.hasPayslip ? 'Generated' : 'Not Generated',
      paid_at: formatDate(row.paid_at),
    }));

    return exportExcelFile(
      'Salary History',
      rows,
      `${safeFilePart(employeeName)}_${safeFilePart(historyYear)}_salary_history.xlsx`
    );
  }, [directory, exportExcelFile, historyEmployeeId, historyRows, historyYear]);

  const handleExportPreview = useCallback(() => {
    const rows = (previewData?.rows || []).map((row: any) => ({
      employee_id: row.employeeCode || '--',
      employee_name: row.employeeName || '--',
      company: row.company || '--',
      active_days: Number(row.activeDays || 0),
      lop_days: Number(row.lopDays || 0),
      salary_snapshot: Number(row.salarySnapshot || 0),
      prorated_salary: Number(row.proratedSalary || 0),
      lop_deduction: Number(row.lopDeduction || 0),
      employee_pf: Number(row.pfEmployeeDeduction || 0),
      employer_pf: Number(row.pfEmployerDeduction || 0),
      total_pf: Number(row.totalPfDeduction || 0),
      employee_tds: Number(row.tdsEmployeeDeduction || 0),
      total_tds: Number(row.totalTdsDeduction || 0),
      retention: Number(row.retentionDeduction || 0),
      retention_release: Number(row.retentionReleaseAmount || 0),
      net_salary: Number(row.netSalary || 0),
    }));

    return exportExcelFile(
      'Salary Preview',
      rows,
      `salary_preview_${safeFilePart(previewYear)}_${safeFilePart(previewMonth)}.xlsx`
    );
  }, [exportExcelFile, previewData, previewMonth, previewYear]);

  const handleExportLedger = useCallback(() => {
    const rows = runs.flatMap((run: any) =>
      (run.items || []).map((item: any) => ({
        month: formatMonthLabel(run.year, run.month),
        employee_id: item.employee?.employee_id || '--',
        employee_name: item.employee?.name || '--',
        company: item.employee?.company || '--',
        gross_salary: Number(item.prorated_salary || 0),
        total_deductions: Number(item.total_deductions || 0),
        net_salary: Number(item.net_salary || 0),
        payment_status: formatStatusLabel(item.payment_status),
        payslip_status: item.isPayslipReleased ? 'Released' : item.hasPayslip ? 'Generated' : 'Not Generated',
        paid_at: formatDate(item.paid_at),
      }))
    );

    return exportExcelFile('Payroll Ledger', rows, 'payroll_ledger.xlsx');
  }, [exportExcelFile, runs]);

  useEffect(() => {
    loadDirectory();
    loadRuns();
  }, [loadDirectory, loadRuns]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadDetail(selectedEmployeeId);
    }
  }, [loadDetail, selectedEmployeeId]);

  useEffect(() => {
    if (historyEmployeeId) {
      loadHistoryRows(historyEmployeeId, historyYear);
    } else {
      setHistoryRows([]);
    }
  }, [historyEmployeeId, historyYear, loadHistoryRows]);

  const summary = useMemo(() => {
    return {
      employees: directory.length,
      enabledPf: directory.filter((employee) => employee.deduction_flags?.pf).length,
      enabledTds: directory.filter((employee) => employee.deduction_flags?.tds).length,
      enabledRetention: directory.filter((employee) => employee.deduction_flags?.retention).length,
      totalCurrentPayout: directory.reduce((sum, employee) => sum + Number(employee.estimated_in_hand_salary || 0), 0),
    };
  }, [directory]);

  const selectedPreviewRow = useMemo(() => {
    return previewData?.rows?.find((row: any) => row.employeeId === selectedCalculatorEmployeeId) || null;
  }, [previewData, selectedCalculatorEmployeeId]);

  const currentPreviewMonthKey = useMemo(
    () => `${previewYear}-${String(previewMonth || '').padStart(2, '0')}`,
    [previewMonth, previewYear]
  );

  const isClosedPayrollMonthSelected = useMemo(
    () => currentPreviewMonthKey < currentMonthValue,
    [currentMonthValue, currentPreviewMonthKey]
  );

  const existingGeneratedRun = useMemo(
    () => runs.find((run) => `${run.year}-${String(run.month).padStart(2, '0')}` === currentPreviewMonthKey) || null,
    [currentPreviewMonthKey, runs]
  );

  const canGeneratePayroll = Boolean(
    previewData?.signature &&
    previewData?.monthKey === currentPreviewMonthKey &&
    isClosedPayrollMonthSelected &&
    !existingGeneratedRun
  );

  const dashboardStats = useMemo(() => {
    const allItems = runs.flatMap((run) => run.items || []);
    return {
      paidEmployees: allItems.filter((item) => item.payment_status === 'paid').length,
      paymentPending: allItems.filter((item) => item.payment_status === 'payment_pending').length,
      generatedItems: allItems.filter((item) => item.payment_status === 'generated').length,
    };
  }, [runs]);

  const latestRun = useMemo(() => runs[0] || null, [runs]);
  const historyYearOptions = useMemo(() => {
    const baseYear = currentYear;
    return Array.from({ length: 6 }, (_, index) => String(baseYear - index));
  }, [currentYear]);
  const selectedHistoryEmployee = useMemo(
    () => directory.find((employee) => employee.id === historyEmployeeId) || null,
    [directory, historyEmployeeId]
  );
  const isHistoryDetailOpen = activeSection === 'history' && Boolean(selectedHistoryItemId && historyDetail);

  const ledgerRows = useMemo(
    () =>
      runs.flatMap((run) =>
        (run.items || []).map((item: any) => ({
          ...item,
          ledgerMonthLabel: formatMonthLabel(run.year, run.month),
          ledgerRunStatus: run.status,
          ledgerYear: run.year,
          ledgerMonth: run.month,
        }))
      ),
    [runs]
  );

  const activeSectionIndex = useMemo(
    () => Math.max(SECTIONS.findIndex((section) => section.id === activeSection), 0),
    [activeSection]
  );

  function closeLedgerDetail() {
    setSelectedItemId(null);
    setItemDetail(null);
    setItemLoading(false);
  }

  function closeHistoryDetail() {
    setSelectedHistoryItemId(null);
    setHistoryDetail(null);
    setHistoryDetailLoading(false);
  }

  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      setSubmitting(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...profileForm,
          pfValue: Number(profileForm.pfValue || 0),
          tdsMode: profileForm.tdsMode,
          tdsValue: Number(profileForm.tdsValue || 0),
        }),
      });

      setDetail(result);
      await loadDirectory(selectedEmployeeId);
      showFeedback('success', 'Payroll profile updated successfully.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to save payroll profile');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevisionCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      setSubmitting(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...revisionForm,
          revisionValue: Number(revisionForm.revisionValue || 0),
        }),
      });

      await loadDetail(selectedEmployeeId);
      await loadDirectory(selectedEmployeeId);
      setRevisionForm((current) => ({ ...current, revisionValue: '', reason: '' }));
      showFeedback('success', 'Salary revision saved successfully.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to create revision');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetentionCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      setSubmitting(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...retentionForm,
          monthlyAmount: Number(retentionForm.monthlyAmount || 0),
        }),
      });

      await loadDetail(selectedEmployeeId);
      await loadDirectory(selectedEmployeeId);
      setRetentionForm((current) => ({ ...current, monthlyAmount: '', notes: '' }));
      showFeedback('success', 'Retention schedule created successfully.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to save retention schedule');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReleaseCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEmployeeId) return;

    try {
      setSubmitting(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/retention/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...releaseForm,
          amount: Number(releaseForm.amount || 0),
        }),
      });

      await loadDetail(selectedEmployeeId);
      setReleaseForm((current) => ({ ...current, amount: '', notes: '' }));
      showFeedback('success', 'Retention release created successfully.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to save retention release');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview() {
    if (!isClosedPayrollMonthSelected) {
      showFeedback('error', 'Payroll can be calculated only after the selected month is fully completed. Please choose a past completed month.');
      return;
    }

    try {
      setPreviewLoading(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/runs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(previewYear),
          month: Number(previewMonth),
        }),
      });
      setPreviewData(result);
      setSelectedCalculatorEmployeeId(null);
      showFeedback('success', 'Employee salary calculator has been refreshed.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to preview payroll');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleGenerate() {
    if (!isClosedPayrollMonthSelected) {
      showFeedback('error', 'Payroll can be calculated only after the selected month is fully completed. Please choose a past completed month.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await fetchPayrollJson('/HRM/api/admin/payroll/runs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(previewYear),
          month: Number(previewMonth),
          previewSignature: previewData?.signature || '',
        }),
      });

      setPreviewData(result.preview);
      setSelectedCalculatorEmployeeId(null);
      await loadRuns();
      setActiveSection('ledger');
      showFeedback('success', 'Payroll generated successfully and saved in the ledger.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to generate payroll');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGeneratePayslip(itemId: string) {
    try {
      setSubmitting(true);
      setActiveLedgerAction({ itemId, type: 'payslip' });
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/items/${itemId}/payslip`, {
        method: 'POST',
      });

      setItemDetail(result);
      setSelectedItemId(itemId);
      await loadRuns();
      showFeedback('success', result.alreadyExists ? 'Payslip already exists for this payroll item.' : 'Payslip generated successfully.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to generate payslip');
    } finally {
      setActiveLedgerAction(null);
      setSubmitting(false);
    }
  }

  async function handleMarkPaid(itemId: string) {
    try {
      setSubmitting(true);
      setActiveLedgerAction({ itemId, type: 'paid' });
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' }),
      });

      setItemDetail(result);
      setSelectedItemId(itemId);
      await loadRuns();
      showFeedback('success', 'Payroll item marked as paid. Salary is now visible in the employee panel.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to mark payroll paid');
    } finally {
      setActiveLedgerAction(null);
      setSubmitting(false);
    }
  }

  async function handleSendPayslip(itemId: string) {
    try {
      setSubmitting(true);
      setActiveLedgerAction({ itemId, type: 'send' });
      const result = await fetchPayrollJson(`/HRM/api/admin/payroll/items/${itemId}/payslip/send`, {
        method: 'POST',
      });

      setItemDetail(result);
      setSelectedItemId(itemId);
      await loadRuns();
      showFeedback('success', 'Payslip released to the employee salary panel.');
    } catch (error: any) {
      if (isSessionExpiredError(error)) return;
      showFeedback('error', error.message || 'Failed to send payslip');
    } finally {
      setActiveLedgerAction(null);
      setSubmitting(false);
    }
  }

  const isLedgerDetailOpen = activeSection === 'ledger' && Boolean(selectedItemId && itemDetail);
  const adminPayslipPdfUrl = selectedItemId ? `/HRM/api/admin/payroll/items/${selectedItemId}/payslip/pdf` : '';
  const adminPayslipDownloadUrl = adminPayslipPdfUrl ? `${adminPayslipPdfUrl}?download=1` : '';
  const historyPayslipPdfUrl = selectedHistoryItemId ? `/HRM/api/admin/payroll/items/${selectedHistoryItemId}/payslip/pdf` : '';
  const historyPayslipDownloadUrl = historyPayslipPdfUrl ? `${historyPayslipPdfUrl}?download=1` : '';

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 px-7 py-7 pb-10">
      <section className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">HR Payroll Desk</p>
          <h1 className="mt-2 text-4xl font-headline font-extrabold tracking-tight text-on-background">
            Payouts & Payroll
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
            Review payroll settings, calculate monthly salary, generate payslips, and track monthly payment release in one place.
          </p>
        </div>

        <section className="pb-1">
          <div className="relative grid w-full grid-cols-6 gap-1 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(244,246,250,0.98)_100%)] p-1 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur">
            <div
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem-1.25rem)/6)] rounded-full bg-[linear-gradient(135deg,rgba(245,238,255,1)_0%,rgba(224,210,255,1)_55%,rgba(208,186,255,1)_100%)] shadow-[0_10px_22px_rgba(167,139,250,0.24)] ring-1 ring-white/70 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(${activeSectionIndex} * (100% + 0.25rem)))` }}
            />
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[12px] font-semibold transition-colors ${
                    isActive ? 'text-violet-950' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{section.icon}</span>
                  <span className="truncate leading-none">{section.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {activeSection === 'dashboard' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Employees"
              value={summary.employees}
              helper="Total employees available in payroll"
            />
            <KpiCard
              label="PF Enabled"
              value={summary.enabledPf}
              helper="Employees currently using PF deduction"
            />
            <KpiCard
              label="Retention"
              value={summary.enabledRetention}
              helper="Employees with active retention setup"
            />
            <KpiCard
              label="Est. In Hand"
              value={formatCurrency(summary.totalCurrentPayout)}
              helper="Current estimated in-hand total"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <div className="border-b border-outline-variant/10 pb-5">
                <h2 className="text-xl font-bold text-on-surface">Payroll Overview</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  A simple summary of the current payroll desk without extra analytics panels.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.35rem] border border-outline-variant/10 bg-white px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Paid Items</p>
                  <p className="mt-3 text-3xl font-headline font-bold text-on-background">{dashboardStats.paidEmployees}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">Released in employee salary view</p>
                </div>
                <div className="rounded-[1.35rem] border border-outline-variant/10 bg-white px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Pending</p>
                  <p className="mt-3 text-3xl font-headline font-bold text-on-background">{dashboardStats.paymentPending}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">Waiting for payment release</p>
                </div>
                <div className="rounded-[1.35rem] border border-outline-variant/10 bg-white px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Generated</p>
                  <p className="mt-3 text-3xl font-headline font-bold text-on-background">{dashboardStats.generatedItems}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">Ready for the next action</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-outline-variant/10 bg-white px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Latest Payroll Run</p>
                {latestRun ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold text-on-surface">{formatMonthLabel(latestRun.year, latestRun.month)}</p>
                        <p className="mt-1 text-sm text-on-surface-variant">{(latestRun.items || []).length} employees included</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(latestRun.status)}`}>
                        {formatStatusLabel(latestRun.status)}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Gross</p>
                        <p className="mt-1 text-sm font-bold text-on-surface">{formatCurrency(latestRun.total_gross)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Deductions</p>
                        <p className="mt-1 text-sm font-bold text-on-surface">{formatCurrency(latestRun.total_deductions)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Net</p>
                        <p className="mt-1 text-sm font-bold text-emerald-700">{formatCurrency(latestRun.total_net)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant">No payroll run is available yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <div className="border-b border-outline-variant/10 pb-5">
                <h3 className="text-lg font-bold text-on-surface">Quick Module Access</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Open the exact payroll area you want to work on next.
                </p>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ['Employee Salary Directory', 'Review employee payroll profile and deduction setup', 'directory'],
                  ['Employee Salary History', 'Review one employee’s month-wise salary and payout history', 'history'],
                  ['Payroll Policy', 'Read the calculation rules and visibility policy', 'policy'],
                  ['Employee Salary Calculator', 'Preview monthly salary before generating payroll', 'calculator'],
                  ['Payroll Ledger', 'Track payroll generation, payments, and payslips', 'ledger'],
                ].map(([title, helper, section]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-outline-variant/10 bg-white px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <div>
                      <p className="text-sm font-bold text-on-surface">{title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{helper}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === 'directory' ? (
        <section className="space-y-6">
          {!directoryDetailOpen ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Employee Salary Directory</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Full payroll master list with employee photo, deduction status, salary, and last revision.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportDirectory}
                disabled={directoryLoading || directory.length === 0}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  directoryLoading || directory.length === 0
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Export Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
                <thead className="border-b border-slate-200/80 bg-[#f8fbff]">
                  <tr>
                    {['Employee ID', 'Profile', 'Join Date', 'Status', 'Company', 'Salary', 'PF', 'TDS', 'Retention', 'Est. In Hand', 'Last Increment'].map((label) => (
                      <th
                        key={label}
                        className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {directoryLoading ? (
                    <tr>
                      <td className="px-0 py-0" colSpan={11}>
                        <TableRowsSkeleton rows={6} columns={11} />
                      </td>
                    </tr>
                  ) : directory.length === 0 ? (
                    <tr>
                      <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={11}>
                        No employees are available for payroll.
                      </td>
                    </tr>
                  ) : (
                    directory.map((employee) => (
                      <tr
                        key={employee.id}
                        onClick={() => {
                          setSelectedEmployeeId(employee.id);
                          setDirectoryDetailOpen(true);
                        }}
                        className="cursor-pointer transition-colors hover:bg-[#f8fbff]"
                      >
                        <td className="px-5 py-4 text-sm font-semibold tracking-[0.02em] text-[#7f98bd]">{employee.employee_id}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {employee.profile_picture_url ? (
                              <Image
                                src={employee.profile_picture_url}
                                alt={employee.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                                {getInitials(employee.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-slate-900">{employee.name}</p>
                              <p className="truncate text-sm text-[#8a9abc]">{employee.email || employee.designation_title || 'Employee'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{formatDate(employee.date_of_joining)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${lifecycleTone(employee.resolved_employment_lifecycle_status)}`}>
                              {String(employee.resolved_employment_lifecycle_status || 'active').replace('_', ' ')}
                            </span>
                            {(employee.resolved_current_stage || 'none') !== 'none' ? (
                              <SoftTag tone="violet">
                                {String(employee.resolved_current_stage).replace('_', ' ')}
                              </SoftTag>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{employee.company || '--'}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(employee.salary)}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{employee.deduction_flags?.pf ? <SoftTag tone="sky">Enabled</SoftTag> : '--'}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{employee.deduction_flags?.tds ? <SoftTag tone="sky">Enabled</SoftTag> : '--'}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{employee.deduction_flags?.retention ? <SoftTag tone="sky">Enabled</SoftTag> : '--'}</td>
                        <td className="px-5 py-4 text-sm font-bold text-emerald-700">{formatCurrency(employee.estimated_in_hand_salary)}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {employee.latest_revision
                            ? `${formatDate(employee.latest_revision.effective_from)} · ${formatCurrency(employee.latest_revision.new_salary)}`
                            : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {directoryDetailOpen && detail?.employee ? (
            <section className="rounded-[2rem] bg-slate-100 px-6 py-6">
              <div className="flex flex-col gap-5 border-b border-outline-variant/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  {detail.employee.profile_picture_url ? (
                    <Image
                      src={detail.employee.profile_picture_url}
                      alt={detail.employee.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-700">
                      {getInitials(detail.employee.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Payroll Profile</p>
                    <h3 className="mt-1 text-2xl font-headline font-bold text-on-background">{detail.employee.name}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {detail.employee.employee_id} · {detail.employee.designation_title || 'Employee'} · {detail.employee.company || '--'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectoryDetailOpen(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,#faf5ff_0%,#efe7ff_100%)] px-4 py-2.5 text-sm font-semibold text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.14)]"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <form onSubmit={handleProfileSave} className="space-y-4 border-t border-outline-variant/10 pt-5">
                    <h4 className="text-lg font-bold text-on-surface">Payroll Settings</h4>
                    <FormRow label="Employee PF Enabled">
                      <ToggleChip
                        checked={profileForm.pfEnabled}
                        onChange={(checked) => setProfileForm((current) => ({ ...current, pfEnabled: checked }))}
                        label="PF deduction active"
                      />
                    </FormRow>
                    <FormRow label="Employee PF Fixed Amount">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={profileForm.pfValue}
                        onChange={(event) => setProfileForm((current) => ({ ...current, pfValue: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="TDS Enabled">
                      <ToggleChip
                        checked={profileForm.tdsEnabled}
                        onChange={(checked) => setProfileForm((current) => ({ ...current, tdsEnabled: checked }))}
                        label="TDS deduction active"
                      />
                    </FormRow>
                    <FormRow label="TDS Rule">
                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                        <SelectInput
                          value={profileForm.tdsMode}
                          onChange={(event) => setProfileForm((current) => ({ ...current, tdsMode: event.target.value }))}
                        >
                          <option value="percent">Percent</option>
                          <option value="fixed">Fixed</option>
                        </SelectInput>
                        <TextInput
                          type="number"
                          step="0.01"
                          value={profileForm.tdsValue}
                          onChange={(event) => setProfileForm((current) => ({ ...current, tdsValue: event.target.value }))}
                        />
                      </div>
                    </FormRow>
                    <p className="text-xs text-on-surface-variant">
                      PF is a fixed amount applied to employee and employer sides. TDS can now be configured as a percent or fixed deduction and is applied once from the employee side.
                    </p>
                    <FormRow label="Retention Enabled">
                      <ToggleChip
                        checked={profileForm.retentionEnabled}
                        onChange={(checked) => setProfileForm((current) => ({ ...current, retentionEnabled: checked }))}
                        label="Retention deduction active"
                      />
                    </FormRow>
                    <FormRow label="Notes">
                      <TextInput
                        value={profileForm.notes}
                        onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </FormRow>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] px-5 py-2.5 text-sm font-bold text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]"
                      >
                        {submitting ? 'Saving...' : 'Save Payroll Settings'}
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleRevisionCreate} className="space-y-4 border-t border-outline-variant/10 pt-5">
                    <h4 className="text-lg font-bold text-on-surface">Salary Revision</h4>
                    <FormRow label="Effective Date">
                      <TextInput
                        type="date"
                        value={revisionForm.effectiveFrom}
                        onChange={(event) => setRevisionForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Revision Type">
                      <SelectInput
                        value={revisionForm.revisionType}
                        onChange={(event) => setRevisionForm((current) => ({ ...current, revisionType: event.target.value }))}
                      >
                        <option value="percent">Percent</option>
                        <option value="amount">Amount</option>
                      </SelectInput>
                    </FormRow>
                    <FormRow label="Revision Value">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={revisionForm.revisionValue}
                        onChange={(event) => setRevisionForm((current) => ({ ...current, revisionValue: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Reason">
                      <TextInput
                        value={revisionForm.reason}
                        onChange={(event) => setRevisionForm((current) => ({ ...current, reason: event.target.value }))}
                      />
                    </FormRow>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] px-5 py-2.5 text-sm font-bold text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]"
                      >
                        Add Revision
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleRetentionCreate} className="space-y-4 border-t border-outline-variant/10 pt-5">
                    <h4 className="text-lg font-bold text-on-surface">Retention Schedule</h4>
                    <FormRow label="Start Month">
                      <TextInput
                        type="month"
                        value={retentionForm.startMonth}
                        onChange={(event) => setRetentionForm((current) => ({ ...current, startMonth: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="End Month">
                      <TextInput
                        type="month"
                        value={retentionForm.endMonth}
                        onChange={(event) => setRetentionForm((current) => ({ ...current, endMonth: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Monthly Amount">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={retentionForm.monthlyAmount}
                        onChange={(event) => setRetentionForm((current) => ({ ...current, monthlyAmount: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Status">
                      <SelectInput
                        value={retentionForm.status}
                        onChange={(event) => setRetentionForm((current) => ({ ...current, status: event.target.value }))}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="released">Released</option>
                      </SelectInput>
                    </FormRow>
                    <FormRow label="Notes">
                      <TextInput
                        value={retentionForm.notes}
                        onChange={(event) => setRetentionForm((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </FormRow>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] px-5 py-2.5 text-sm font-bold text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]"
                      >
                        Save Retention Schedule
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleReleaseCreate} className="space-y-4 border-t border-outline-variant/10 pt-5">
                    <h4 className="text-lg font-bold text-on-surface">Retention Release</h4>
                    <FormRow label="Release Month">
                      <TextInput
                        type="month"
                        value={releaseForm.releaseMonth}
                        onChange={(event) => setReleaseForm((current) => ({ ...current, releaseMonth: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Amount">
                      <TextInput
                        type="number"
                        step="0.01"
                        value={releaseForm.amount}
                        onChange={(event) => setReleaseForm((current) => ({ ...current, amount: event.target.value }))}
                      />
                    </FormRow>
                    <FormRow label="Linked Schedule">
                      <SelectInput
                        value={releaseForm.linkedScheduleId}
                        onChange={(event) => setReleaseForm((current) => ({ ...current, linkedScheduleId: event.target.value }))}
                      >
                        <option value="">No linked schedule</option>
                        {(detail.retentionSchedules || []).map((schedule: any) => (
                          <option key={schedule.id} value={schedule.id}>
                            {formatDate(schedule.start_month)} · {formatCurrency(schedule.monthly_amount)}
                          </option>
                        ))}
                      </SelectInput>
                    </FormRow>
                    <FormRow label="Notes">
                      <TextInput
                        value={releaseForm.notes}
                        onChange={(event) => setReleaseForm((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </FormRow>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] px-5 py-2.5 text-sm font-bold text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]"
                      >
                        Save Retention Release
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[1.4rem] border-2 border-violet-300 bg-white px-5 py-5">
                    <h4 className="text-lg font-bold text-on-surface">Recent Salary Revisions</h4>
                    <div className="mt-4">
                      {(detail.revisions || []).length ? (
                        (detail.revisions || []).slice(0, 6).map((revision: any) => (
                          <LabelValue
                            key={revision.id}
                            label={formatDate(revision.effective_from)}
                            value={
                              <div className="flex items-center justify-between gap-4">
                                <span>{revision.reason || 'Salary revision'}</span>
                                <span className="font-bold text-emerald-700">{formatCurrency(revision.new_salary)}</span>
                              </div>
                            }
                          />
                        ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">No salary revision history yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border-2 border-violet-300 bg-white px-5 py-5">
                    <h4 className="text-lg font-bold text-on-surface">Retention Schedules</h4>
                    <div className="mt-4">
                      {(detail.retentionSchedules || []).length ? (
                        (detail.retentionSchedules || []).map((schedule: any) => (
                          <LabelValue
                            key={schedule.id}
                            label={`${formatDate(schedule.start_month)}${schedule.end_month ? ` to ${formatDate(schedule.end_month)}` : ''}`}
                            value={
                              <div className="flex items-center justify-between gap-4">
                                <span>{schedule.status}</span>
                                <span className="font-bold text-on-surface">{formatCurrency(schedule.monthly_amount)}</span>
                              </div>
                            }
                          />
                        ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">No retention schedules yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border-2 border-violet-300 bg-white px-5 py-5">
                    <h4 className="text-lg font-bold text-on-surface">Retention Releases</h4>
                    <div className="mt-4">
                      {(detail.retentionReleases || []).length ? (
                        (detail.retentionReleases || []).map((release: any) => (
                          <LabelValue
                            key={release.id}
                            label={formatDate(release.release_month)}
                            value={
                              <div className="flex items-center justify-between gap-4">
                                <span>{release.notes || 'Manual release'}</span>
                                <span className="font-bold text-emerald-700">{formatCurrency(release.amount)}</span>
                              </div>
                            }
                          />
                        ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">No retention releases yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {activeSection === 'history' ? (
        <section className="space-y-6">
          {!isHistoryDetailOpen ? (
            <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Employee Salary History</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Select one employee and year to review month-wise salary, payout, and payslip history.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Employee</p>
                    <SelectInput
                      value={historyEmployeeId || ''}
                      onChange={(event) => {
                        setHistoryEmployeeId(event.target.value || null);
                        setSelectedHistoryItemId(null);
                        setHistoryDetail(null);
                      }}
                      className="min-w-[260px]"
                    >
                      <option value="">Select employee</option>
                      {directory.map((employee: any) => (
                        <option key={employee.id} value={employee.id}>
                          {(employee.employee_id || '--')} - {employee.name || 'Employee'}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Year</p>
                    <SelectInput
                      value={historyYear}
                      onChange={(event) => {
                        setHistoryYear(event.target.value);
                        setSelectedHistoryItemId(null);
                        setHistoryDetail(null);
                      }}
                      className="min-w-[140px]"
                    >
                      {historyYearOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportHistory}
                    disabled={historyLoading || historyRows.length === 0}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold shadow-sm transition ${
                      historyLoading || historyRows.length === 0
                        ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Export Excel
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-outline-variant/10 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="border-b border-slate-200/80 bg-[#f8fbff]">
                      <tr>
                        {['Month', 'Gross', 'Deductions', 'Net', 'Payment Status', 'Payslip Status', 'Paid At', 'Action'].map((label) => (
                          <th key={label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {historyLoading ? (
                        <tr>
                          <td colSpan={8} className="px-0 py-0">
                            <TableRowsSkeleton rows={5} columns={8} />
                          </td>
                        </tr>
                      ) : !historyEmployeeId ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-sm text-on-surface-variant">
                            Select an employee to review salary history.
                          </td>
                        </tr>
                      ) : historyRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-8">
                            <HrmEmptyState
                              compact
                              icon="history"
                              title="No salary history found"
                              message={`No payroll records are available for ${selectedHistoryEmployee?.name || 'this employee'} in ${historyYear}.`}
                            />
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row: any) => (
                          <tr key={row.id} className="transition-colors hover:bg-[#f8fbff]">
                            <td className="px-3 py-4 text-sm font-semibold text-slate-900">{formatMonthLabel(row.payroll_run.year, row.payroll_run.month)}</td>
                            <td className="px-3 py-4 text-sm text-slate-700">{formatCurrency(row.prorated_salary)}</td>
                            <td className="px-3 py-4 text-sm text-slate-700">{formatCurrency(row.total_deductions)}</td>
                            <td className="px-3 py-4 text-sm font-bold text-emerald-700">{formatCurrency(row.net_salary)}</td>
                            <td className="px-3 py-4">
                              <span className={`inline-flex min-w-[92px] justify-center rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${statusTone(row.payment_status)}`}>
                                {formatStatusLabel(row.payment_status)}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-700">
                              {row.isPayslipReleased
                                ? 'Released'
                                : row.hasPayslip
                                  ? 'Generated'
                                  : 'Not Generated'}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-700">{formatDate(row.paid_at)}</td>
                            <td className="px-3 py-4">
                              <button
                                type="button"
                                onClick={() => loadHistoryDetail(row.id)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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
            </div>
          ) : (
            <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={closeHistoryDetail}
                      aria-label="Back to employee salary history"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-low text-on-surface transition hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-on-surface">Employee Salary History Detail</h3>
                      <p className="truncate text-sm text-on-surface-variant">
                        {historyDetail.item?.employee?.name || 'Employee'} {' - '}
                        {formatMonthLabel(
                          historyDetail.item?.payroll_run?.year || Number(historyYear),
                          historyDetail.item?.payroll_run?.month || 1
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {historyDetail.hasPayslip ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openPdfInNewTab(historyPayslipPdfUrl)}
                          className="inline-flex items-center justify-center rounded-full border border-outline-variant/15 bg-white px-4 py-2 text-sm font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-low"
                        >
                          View Payslip
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerPdfDownload(historyPayslipDownloadUrl)}
                          className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100"
                        >
                          Download Payslip
                        </button>
                      </>
                    ) : null}
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Net {formatCurrency(historyDetail.item?.net_salary || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {historyDetailLoading ? (
                <div className="mt-5">
                  <DetailPanelSkeleton />
                </div>
              ) : (
                <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                    <div className="border-b border-outline-variant/10 pb-3">
                      <h4 className="text-base font-bold text-on-surface">Month Summary</h4>
                      <p className="mt-1 text-sm text-on-surface-variant">Core payroll, payment, and payslip status information.</p>
                    </div>
                    <div className="mt-4">
                      <DetailKeyValue label="Employee ID" value={historyDetail.item?.employee?.employee_id || '--'} />
                      <DetailKeyValue label="Employee Name" value={historyDetail.item?.employee?.name || '--'} />
                      <DetailKeyValue label="Month" value={formatMonthLabel(historyDetail.item?.payroll_run?.year || 0, historyDetail.item?.payroll_run?.month || 1)} />
                      <DetailKeyValue label="Gross Salary" value={formatCurrency(historyDetail.item?.prorated_salary)} />
                      <DetailKeyValue label="Total Deductions" value={formatCurrency(historyDetail.item?.total_deductions)} />
                      <DetailKeyValue label="Net Salary" value={formatCurrency(historyDetail.item?.net_salary)} emphasis />
                      <DetailKeyValue label="Payment Status" value={formatStatusLabel(historyDetail.item?.payment_status)} />
                      <DetailKeyValue label="Paid At" value={formatDate(historyDetail.item?.paid_at)} />
                      <DetailKeyValue label="Payslip Status" value={historyDetail.isPayslipReleased ? 'Released' : historyDetail.hasPayslip ? 'Generated' : 'Not Generated'} />
                      <DetailKeyValue label="Payslip Number" value={historyDetail.payslip?.payslip_number || '--'} />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                    <div className="border-b border-outline-variant/10 pb-3">
                      <h4 className="text-base font-bold text-on-surface">Breakdown</h4>
                      <p className="mt-1 text-sm text-on-surface-variant">Month-wise payout, deduction, and release values.</p>
                    </div>
                    <div className="mt-4 grid gap-5 lg:grid-cols-2">
                      <div>
                        <DetailKeyValue label="Salary Snapshot" value={formatCurrency(historyDetail.item?.salary_snapshot)} />
                        <DetailKeyValue label="Prorated Salary" value={formatCurrency(historyDetail.item?.prorated_salary)} />
                        <DetailKeyValue label="LOP Days" value={historyDetail.item?.lop_days || 0} />
                        <DetailKeyValue label="LOP Deduction" value={formatCurrency(historyDetail.item?.lop_deduction)} />
                        <DetailKeyValue label="Employee PF" value={formatCurrency(historyDetail.item?.pf_employee_deduction)} />
                        <DetailKeyValue label="Employer PF" value={formatCurrency(historyDetail.item?.pf_employer_deduction)} />
                      </div>
                      <div>
                        <DetailKeyValue label="Total PF" value={formatCurrency(historyDetail.item?.total_pf_deduction)} />
                        <DetailKeyValue label="Employee TDS" value={formatCurrency(historyDetail.item?.tds_employee_deduction ?? historyDetail.item?.tds_deduction)} />
                        <DetailKeyValue label="Total TDS" value={formatCurrency(historyDetail.item?.total_tds_deduction ?? historyDetail.item?.tds_deduction)} />
                        <DetailKeyValue label="Retention" value={formatCurrency(historyDetail.item?.retention_deduction)} />
                        <DetailKeyValue label="Retention Release" value={formatCurrency(historyDetail.item?.retention_release_amount)} />
                        <DetailKeyValue label="Days In Month" value={historyDetail.item?.days_in_month || 0} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                    <div className="border-b border-outline-variant/10 pb-3">
                      <h4 className="text-base font-bold text-on-surface">Payroll Policy Snapshot</h4>
                      <p className="mt-1 text-sm text-on-surface-variant">Frozen policy values used when this month was calculated.</p>
                    </div>
                    <div className="mt-4">
                      <DetailKeyValue label="PF" value={formatToggle(historyDetail.item?.calculation_snapshot?.policy?.pfEnabled)} />
                      <DetailKeyValue label="PF Value" value={formatCurrency(historyDetail.item?.calculation_snapshot?.policy?.pfValue || 0)} />
                      <DetailKeyValue label="TDS" value={formatToggle(historyDetail.item?.calculation_snapshot?.policy?.tdsEnabled)} />
                      <DetailKeyValue label="TDS Mode" value={formatPolicyMode(historyDetail.item?.calculation_snapshot?.policy?.tdsMode)} />
                      <DetailKeyValue label="TDS Value" value={formatPolicyValue(historyDetail.item?.calculation_snapshot?.policy?.tdsValue, historyDetail.item?.calculation_snapshot?.policy?.tdsMode)} />
                      <DetailKeyValue label="Retention" value={formatToggle(historyDetail.item?.calculation_snapshot?.policy?.retentionEnabled)} />
                      <DetailKeyValue label="Monthly Retention" value={formatCurrency(historyDetail.item?.calculation_snapshot?.policy?.retentionMonthlyAmount || 0)} />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                    <div className="border-b border-outline-variant/10 pb-3">
                      <h4 className="text-base font-bold text-on-surface">Release Details</h4>
                      <p className="mt-1 text-sm text-on-surface-variant">Payslip release metadata and frozen notes.</p>
                    </div>
                    <div className="mt-4">
                      <DetailKeyValue label="Release Status" value={historyDetail.isPayslipReleased ? 'Released To Employee' : historyDetail.hasPayslip ? 'Generated Only' : 'Not Generated'} />
                      <DetailKeyValue label="Released On" value={formatDate(historyDetail.payslip?.released_at)} />
                      <DetailKeyValue label="Generated On" value={formatDate(historyDetail.payslip?.generated_at)} />
                      <DetailKeyValue
                        label="Notes"
                        value={
                          historyDetail.item?.calculation_snapshot?.notes ||
                          historyDetail.item?.calculation_snapshot?.policy?.notes ||
                          historyDetail.item?.calculation_snapshot?.effectiveRevision?.notes ||
                          '--'
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </section>
      ) : null}

      {activeSection === 'policy' ? (
        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
          <div className="border-b border-outline-variant/10 pb-5">
            <h2 className="text-xl font-bold text-on-surface">Payroll Policy</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Practical payroll rules used by this module for calculation, visibility, and release.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-outline-variant/10 bg-white">
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
              ['Payslip Visibility', 'Employee can view salary month after HR marks that payroll item as paid, but the payslip PDF is visible only after HR sends the payslip to the employee panel.'],
              ['Salary Credit Day', 'Salary is credited to the employee on the 8th day of every month.'],
            ].map(([title, body]) => (
              <div key={title} className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-outline-variant/10 px-5 py-5 last:border-b-0">
                <div className="text-sm font-bold text-on-surface">{title}</div>
                <div className="text-sm leading-7 text-on-surface-variant">{body}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === 'calculator' ? (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div className="max-w-xl pt-1">
                <h2 className="text-[1.65rem] font-bold leading-tight text-on-surface">Employee Salary Calculator</h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Preview full month salary math before creating the payroll run.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-4 xl:min-w-[760px] xl:items-end">
                <div className="flex flex-wrap items-end justify-end gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Year</p>
                    <TextInput
                      type="number"
                      value={previewYear}
                      onChange={(event) => setPreviewYear(event.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Month</p>
                    <TextInput
                      type="month"
                      value={`${previewYear}-${previewMonth}`}
                      onChange={(event) => {
                        const [nextYear, nextMonth] = event.target.value.split('-');
                        setPreviewYear(nextYear);
                        setPreviewMonth(nextMonth);
                      }}
                      className="w-[180px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading || !isClosedPayrollMonthSelected}
                    className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                      previewLoading || !isClosedPayrollMonthSelected
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {previewLoading ? 'Calculating...' : 'Run Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={submitting || !canGeneratePayroll}
                    className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                      submitting || !canGeneratePayroll
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {submitting ? 'Generating...' : 'Generate Payroll'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPreview}
                    disabled={!previewData?.rows?.length}
                    className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                      !previewData?.rows?.length
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Export Excel
                  </button>
                </div>
                <div className="text-right text-sm text-on-surface-variant">
                  {!isClosedPayrollMonthSelected
                    ? `Payroll for ${formatMonthLabel(Number(previewYear), Number(previewMonth))} can be calculated only after that month is fully completed.`
                    : existingGeneratedRun
                      ? `Payroll for ${formatMonthLabel(Number(previewYear), Number(previewMonth))} already exists in the payroll ledger. Manage payslips and payment status there.`
                      : canGeneratePayroll
                        ? 'Preview completed. You can now generate payroll for this completed month once.'
                        : 'Run preview first, then generate payroll once for the selected completed month.'}
                </div>
              </div>
            </div>
          </div>

          {previewData ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard label="Employees" value={previewData.summary.totalEmployees} helper="Included in this preview" />
                <KpiCard label="Gross" value={formatCurrency(previewData.summary.totalGross)} helper="Total prorated salary" />
                <KpiCard label="Net" value={formatCurrency(previewData.summary.totalNet)} helper="Expected payout after deductions" />
              </div>

              {!selectedPreviewRow ? (
                <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-200/80 px-6 py-5">
                    <h3 className="text-lg font-bold text-on-surface">
                      {formatMonthLabel(Number(previewYear), Number(previewMonth))}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Select any employee row to open the salary calculation detail page.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1460px]">
                      <thead className="border-b border-slate-200/80 bg-[#f8fbff]">
                        <tr>
                          {['Employee ID', 'Name', 'Company', 'Active Days', 'LOP Days', 'Prorated Salary', 'LOP Deduction', 'Employee PF', 'Employer PF', 'Total PF', 'Employee TDS', 'Total TDS', 'Retention', 'Release', 'Net Salary'].map((label) => (
                            <th key={label} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {previewData.rows.map((row: any) => (
                          <tr
                            key={row.employeeId}
                            onClick={() => setSelectedCalculatorEmployeeId(row.employeeId)}
                            className="cursor-pointer transition-colors hover:bg-[#f8fbff]"
                          >
                            <td className="px-5 py-4 text-sm font-semibold tracking-[0.02em] text-[#7f98bd]">{row.employeeCode}</td>
                            <td className="px-5 py-4">
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-slate-900">{row.employeeName}</p>
                                <p className="truncate text-sm text-[#8a9abc]">{row.currentStage || 'Salary preview'}</p>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{row.company || '--'}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{row.activeDays}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{row.lopDays}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(row.proratedSalary)}</td>
                            <td className="px-5 py-4 text-sm text-rose-700">{formatCurrency(row.lopDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.pfEmployeeDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.pfEmployerDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.totalPfDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.tdsEmployeeDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.totalTdsDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.retentionDeduction)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700">{formatCurrency(row.retentionReleaseAmount)}</td>
                            <td className="px-5 py-4 text-sm font-bold text-emerald-700">{formatCurrency(row.netSalary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
                  <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCalculatorEmployeeId(null)}
                          aria-label="Back to employee salary calculator"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-low text-on-surface transition hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        </button>
                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-bold text-on-surface">Employee Calculation Detail</h3>
                          <p className="truncate text-sm text-on-surface-variant">
                            {selectedPreviewRow.employeeName || 'Employee'} {' - '} {selectedPreviewRow.employeeCode || '--'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Net {formatCurrency(selectedPreviewRow.netSalary)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                      <div className="border-b border-outline-variant/10 pb-3">
                        <h4 className="text-base font-bold text-on-surface">Calculation Inputs</h4>
                        <p className="mt-1 text-sm text-on-surface-variant">Core values used to build this employee salary preview.</p>
                      </div>
                      <div className="mt-4">
                        <DetailKeyValue label="Employee ID" value={selectedPreviewRow.employeeCode || '--'} />
                        <DetailKeyValue label="Employee Name" value={selectedPreviewRow.employeeName || '--'} />
                        <DetailKeyValue label="Company" value={selectedPreviewRow.company || '--'} />
                        <DetailKeyValue label="Active Days" value={selectedPreviewRow.activeDays} />
                        <DetailKeyValue label="LOP Days" value={selectedPreviewRow.lopDays} />
                        <DetailKeyValue label="Salary Snapshot" value={formatCurrency(selectedPreviewRow.salarySnapshot)} />
                        <DetailKeyValue
                          label="Active Period"
                          value={`${formatDate(selectedPreviewRow.activeStart)} to ${formatDate(selectedPreviewRow.activeEnd)}`}
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                      <div className="border-b border-outline-variant/10 pb-3">
                        <h4 className="text-base font-bold text-on-surface">Calculation Result</h4>
                        <p className="mt-1 text-sm text-on-surface-variant">Breakdown of earnings, deductions, and final net salary.</p>
                      </div>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2">
                        <div>
                          <DetailKeyValue label="Prorated Salary" value={formatCurrency(selectedPreviewRow.proratedSalary)} />
                          <DetailKeyValue label="LOP Deduction" value={formatCurrency(selectedPreviewRow.lopDeduction)} />
                          <DetailKeyValue label="Employee PF" value={formatCurrency(selectedPreviewRow.pfEmployeeDeduction)} />
                          <DetailKeyValue label="Employer PF" value={formatCurrency(selectedPreviewRow.pfEmployerDeduction)} />
                          <DetailKeyValue label="Total PF" value={formatCurrency(selectedPreviewRow.totalPfDeduction)} />
                        </div>
                        <div>
                          <DetailKeyValue label="Employee TDS" value={formatCurrency(selectedPreviewRow.tdsEmployeeDeduction)} />
                          <DetailKeyValue label="Total TDS" value={formatCurrency(selectedPreviewRow.totalTdsDeduction)} />
                          <DetailKeyValue label="Retention" value={formatCurrency(selectedPreviewRow.retentionDeduction)} />
                          <DetailKeyValue label="Retention Release" value={formatCurrency(selectedPreviewRow.retentionReleaseAmount)} />
                          <DetailKeyValue label="Net Salary" value={formatCurrency(selectedPreviewRow.netSalary)} emphasis />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : null}
        </section>
      ) : null}

      {activeSection === 'ledger' ? (
        <section className="space-y-6">
          {!isLedgerDetailOpen ? (
          <div className="overflow-hidden rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col gap-4 border-b border-outline-variant/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Payroll Ledger</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Generated payroll runs, payment tracking, and payslip actions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportLedger}
                disabled={runsLoading || ledgerRows.length === 0}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  runsLoading || ledgerRows.length === 0
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Export Excel
              </button>
            </div>

            <div className="space-y-6 p-6">
              {runsLoading ? (
                <LoadingPanel
                  title="Loading payroll ledger"
                  message="Payroll runs, item totals, and payment status are being prepared."
                />
              ) : runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant/25 px-5 py-12 text-center text-sm text-on-surface-variant">
                  No payroll run is available yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/10 bg-white">
                  <table className="w-full min-w-[1420px]">
                    <thead className="border-b border-slate-200/80 bg-[#f8fbff]">
                      <tr>
                        {['Month', 'Employee ID', 'Name', 'Company', 'Gross', 'Deductions', 'Net', 'Status', 'Actions'].map((label) => (
                          <th key={label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {ledgerRows.map((item: any) => {
                        const isViewing = activeLedgerAction?.itemId === item.id && activeLedgerAction?.type === 'view';
                        const isGeneratingPayslip = activeLedgerAction?.itemId === item.id && activeLedgerAction?.type === 'payslip';
                        const isMarkingPaid = activeLedgerAction?.itemId === item.id && activeLedgerAction?.type === 'paid';
                        const isSendingPayslip = activeLedgerAction?.itemId === item.id && activeLedgerAction?.type === 'send';

                        return (
                          <tr key={item.id} className="transition-colors hover:bg-[#f8fbff]">
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.ledgerMonthLabel}</td>
                            <td className="px-4 py-4 text-sm font-semibold tracking-[0.02em] text-[#7f98bd]">{item.employee?.employee_id || '--'}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">{item.employee?.name || 'Employee'}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.employee?.company || '--'}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{formatCurrency(item.prorated_salary)}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{formatCurrency(item.total_deductions)}</td>
                            <td className="px-4 py-4 text-sm font-bold text-emerald-700">{formatCurrency(item.net_salary)}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex min-w-[112px] justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone(item.payment_status)}`}>
                                {formatStatusLabel(item.payment_status)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={isViewing}
                                  onClick={() => loadItem(item.id)}
                                  className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                                    isViewing
                                      ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {isViewing ? 'Opening...' : 'Open'}
                                </button>
                                {!item.hasPayslip ? (
                                  <button
                                    type="button"
                                    disabled={isGeneratingPayslip}
                                    onClick={() => handleGeneratePayslip(item.id)}
                                    className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                                      isGeneratingPayslip
                                        ? 'cursor-not-allowed border-violet-200 bg-violet-100 text-violet-600'
                                        : 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100'
                                    }`}
                                  >
                                    {isGeneratingPayslip ? 'Generating...' : 'Generate Payslip'}
                                  </button>
                                ) : null}
                                {item.hasPayslip && item.payment_status !== 'paid' ? (
                                  <button
                                    type="button"
                                    disabled={isMarkingPaid}
                                    onClick={() => handleMarkPaid(item.id)}
                                    className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
                                      isMarkingPaid
                                        ? 'cursor-not-allowed bg-slate-700 text-white'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    {isMarkingPaid ? 'Marking...' : 'Mark Paid'}
                                  </button>
                                ) : null}
                                {item.hasPayslip && item.payment_status === 'paid' && !item.isPayslipReleased ? (
                                  <button
                                    type="button"
                                    disabled={isSendingPayslip}
                                    onClick={() => handleSendPayslip(item.id)}
                                    className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                                      isSendingPayslip
                                        ? 'cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-700'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {isSendingPayslip ? 'Sending...' : 'Send Payslip'}
                                  </button>
                                ) : null}
                                {item.isPayslipReleased ? (
                                  <span className="inline-flex items-center justify-center rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                                    Payslip Sent
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeLedgerAction ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Payroll action is in progress. Please wait a moment.
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          {isLedgerDetailOpen ? (
            <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={closeLedgerDetail}
                      aria-label="Back to payroll ledger"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-low text-on-surface transition hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-on-surface">Payroll Item Detail</h3>
                      <p className="truncate text-sm text-on-surface-variant">
                        {itemDetail.item?.employee?.name || 'Employee'} · {formatMonthLabel(
                          itemDetail.item?.payroll_run?.year || Number(previewYear),
                          itemDetail.item?.payroll_run?.month || Number(previewMonth)
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {!itemDetail.payslip?.snapshot_json ? (
                      <button
                        type="button"
                        disabled={activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'payslip'}
                        onClick={() => handleGeneratePayslip(selectedItemId)}
                        className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                          activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'payslip'
                            ? 'cursor-not-allowed border-violet-200 bg-violet-100 text-violet-600'
                            : 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100'
                        }`}
                      >
                        {activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'payslip' ? 'Generating...' : 'Generate Payslip'}
                      </button>
                    ) : null}
                    {itemDetail.payslip?.snapshot_json ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openPdfInNewTab(adminPayslipPdfUrl)}
                          className="inline-flex items-center justify-center rounded-full border border-outline-variant/15 bg-white px-4 py-2 text-sm font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-low"
                        >
                          View Payslip
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerPdfDownload(adminPayslipDownloadUrl)}
                          className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100"
                        >
                          Download Payslip
                        </button>
                      </>
                    ) : null}
                    {itemDetail.payslip?.snapshot_json && itemDetail.item?.payment_status !== 'paid' ? (
                      <button
                        type="button"
                        disabled={activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'paid'}
                        onClick={() => handleMarkPaid(selectedItemId)}
                        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                          activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'paid'
                            ? 'cursor-not-allowed bg-slate-300 text-white'
                            : 'bg-slate-900 text-white transition hover:bg-slate-800'
                        }`}
                      >
                        {activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'paid' ? 'Marking...' : 'Mark Paid'}
                      </button>
                    ) : null}
                    {itemDetail.payslip?.snapshot_json && itemDetail.item?.payment_status === 'paid' && !itemDetail.payslip?.released_to_employee ? (
                      <button
                        type="button"
                        disabled={activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'send'}
                        onClick={() => handleSendPayslip(selectedItemId)}
                        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                          activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'send'
                            ? 'cursor-not-allowed bg-emerald-200 text-emerald-800'
                            : 'bg-emerald-600 text-white transition hover:bg-emerald-500'
                        }`}
                      >
                        {activeLedgerAction?.itemId === selectedItemId && activeLedgerAction?.type === 'send' ? 'Sending...' : 'Send Payslip'}
                      </button>
                    ) : null}
                    {itemDetail.payslip?.released_to_employee ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                        Payslip Sent
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_0.65fr]">
                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Breakdown</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">Salary, deductions, and release values in a simple key-value format.</p>
                  </div>
                  {itemLoading ? (
                    <div className="mt-4">
                      <DetailPanelSkeleton />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-5">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Salary</p>
                          <div className="mt-2">
                            <DetailKeyValue label="Salary Snapshot" value={formatCurrency(itemDetail.item.salary_snapshot)} />
                            <DetailKeyValue label="Prorated Salary" value={formatCurrency(itemDetail.item.prorated_salary)} />
                            <DetailKeyValue label="LOP Days" value={itemDetail.item.lop_days} />
                            <DetailKeyValue label="LOP Deduction" value={formatCurrency(itemDetail.item.lop_deduction)} />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Deductions And Release</p>
                          <div className="mt-2">
                            <DetailKeyValue label="Employee PF" value={formatCurrency(itemDetail.item.pf_employee_deduction)} />
                            <DetailKeyValue label="Employer PF" value={formatCurrency(itemDetail.item.pf_employer_deduction)} />
                            <DetailKeyValue label="Total PF" value={formatCurrency(itemDetail.item.total_pf_deduction)} />
                            <DetailKeyValue label="Employee TDS" value={formatCurrency(itemDetail.item.tds_employee_deduction ?? itemDetail.item.tds_deduction)} />
                            <DetailKeyValue label="Total TDS" value={formatCurrency(itemDetail.item.total_tds_deduction ?? itemDetail.item.tds_deduction)} />
                            <DetailKeyValue label="Retention" value={formatCurrency(itemDetail.item.retention_deduction)} />
                            <DetailKeyValue label="Retention Release" value={formatCurrency(itemDetail.item.retention_release_amount)} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-outline-variant/10 pt-1">
                        <span className="text-sm font-medium text-on-surface-variant">Net Salary</span>
                        <span className="text-lg font-bold text-emerald-700">{formatCurrency(itemDetail.item.net_salary)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5">
                  <div className="border-b border-outline-variant/10 pb-3">
                    <h4 className="text-base font-bold text-on-surface">Payslip</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">PDF status and reference details for this payroll item.</p>
                  </div>
                  {itemLoading ? (
                    <div className="mt-4">
                      <LoadingPanel
                        title="Loading payslip"
                        message="The selected payroll item snapshot is being prepared as a PDF."
                        className="px-5 py-10"
                      />
                    </div>
                  ) : itemDetail.payslip?.snapshot_json ? (
                    <div className="mt-4 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                      <div className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        PDF Ready
                      </div>
                      <div className="mt-3">
                        <DetailKeyValue label="Payslip Number" value={itemDetail.payslip?.payslip_number || '--'} />
                        <DetailKeyValue label="Payment Status" value={String(itemDetail.item?.payment_status || '--').replace(/_/g, ' ')} />
                        <DetailKeyValue
                          label="Payslip Month"
                          value={formatMonthLabel(
                            itemDetail.item?.payroll_run?.year || Number(previewYear),
                            itemDetail.item?.payroll_run?.month || Number(previewMonth)
                          )}
                        />
                        <DetailKeyValue label="Generated On" value={itemDetail.payslip?.generated_at ? formatDate(itemDetail.payslip.generated_at) : '--'} />
                        <DetailKeyValue
                          label="Release Status"
                          value={itemDetail.payslip?.released_to_employee ? 'Released To Employee' : 'Waiting For HR Send'}
                        />
                        <DetailKeyValue
                          label="Released On"
                          value={itemDetail.payslip?.released_at ? formatDate(itemDetail.payslip.released_at) : '--'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-outline-variant/25 px-4 py-5 text-sm text-on-surface-variant">
                      Payslip PDF has not been generated yet. Generate it from the ledger action first.
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
