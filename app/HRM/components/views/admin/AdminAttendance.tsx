'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';
import { useHrmFeedback } from '../../ui/HrmFeedback';

type AttendanceMode = 'daily' | 'individual' | 'monthly';

let xlsxLoaderPromise: Promise<any> | null = null;

type DailyRow = {
  employeeRecordId?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  reportingTo: string;
  date: string;
  status: string;
  statusLabel: string;
  checkIn: string;
  checkOut: string;
  swipeCount?: number;
  sessionCount?: number;
  swipePattern?: string;
  lateIn: string;
  earlyOut: string;
  workHours: string;
  shiftHours?: string;
  notes: string;
  source?: string;
};

type SwipeHistoryRow = {
  id: string;
  swipeTime: string;
  swipeType: string;
  doorAddress: string;
};

type SwipeModalState = {
  open: boolean;
  employeeRecordId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
};

type EmployeeOption = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  city?: string;
};

type MonthlyCalendarDay = {
  date: string;
  dayNumber: number;
  weekdayShort: string;
};

type MonthlyStatusCell = {
  date: string;
  code: string;
  status: string;
  label: string;
  notes: string;
};

type MonthlyEditorState = {
  open: boolean;
  employeeId: string;
  employeeName: string;
  date: string;
  status: string;
  code: string;
  label: string;
  notes: string;
  saving: boolean;
};

type MonthlyAttendanceRow = {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    city?: string;
    reportingTo: string;
  };
  dailyStatuses: MonthlyStatusCell[];
  summary: {
    present: number;
    halfDay: number;
    absent: number;
    off: number;
    holiday: number;
    leave: number;
    totalDays: number;
  };
};

type AttendanceResponse = {
  mode: AttendanceMode;
  rows: DailyRow[];
  date?: string;
  month?: string;
  calendarDays?: MonthlyCalendarDay[];
  statusOptions?: Array<{ value: string; label: string }>;
  monthlyRows?: MonthlyAttendanceRow[];
  employeeOptions: EmployeeOption[];
  departmentOptions: string[];
  selectedEmployeeId?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    reportingTo: string;
  } | null;
};

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
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.async = true;
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('Failed to load Excel export library.'));
    document.head.appendChild(script);
  });

  return xlsxLoaderPromise;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (String(value || '').trim()) {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
}

function formatMonthLabel(value = '') {
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return value || 'Selected month';
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function getStatusCellTone(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'present') return 'bg-sky-100 text-sky-900';
  if (normalized === 'absent') return 'bg-rose-100 text-rose-900';
  if (normalized === 'halfday') return 'bg-violet-100 text-violet-900';
  if (normalized === 'on_leave') return 'bg-emerald-100 text-emerald-900';
  if (normalized === 'holiday') return 'bg-orange-100 text-orange-900';
  if (normalized === 'weekend') return 'bg-slate-100 text-slate-700';
  return 'bg-white text-slate-500';
}

function getEmployeeMetaLine(employee: MonthlyAttendanceRow['employee']) {
  const secondPart = String(employee?.city || '').trim() || String(employee?.department || '').trim() || 'Location not set';
  return `${employee?.designation || 'Designation not set'} · ${secondPart}`;
}

function safeFilePart(value = '') {
  return String(value || 'export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');
}

function getMonthlyExcelCellStyle(cell: MonthlyStatusCell) {
  const normalizedStatus = String(cell?.status || '').toLowerCase();
  const fill =
    normalizedStatus === 'present'
      ? 'DBEAFE'
      : normalizedStatus === 'absent'
      ? 'FFE4E6'
      : normalizedStatus === 'halfday'
      ? 'EDE9FE'
      : normalizedStatus === 'on_leave'
      ? 'D1FAE5'
      : normalizedStatus === 'holiday'
      ? 'FFEDD5'
      : normalizedStatus === 'weekend'
      ? 'E2E8F0'
      : 'FFFFFF';
  const fontColor =
    normalizedStatus === 'present'
      ? '0C4A6E'
      : normalizedStatus === 'absent'
      ? '881337'
      : normalizedStatus === 'halfday'
      ? '4C1D95'
      : normalizedStatus === 'on_leave'
      ? '065F46'
      : normalizedStatus === 'holiday'
      ? '9A3412'
      : normalizedStatus === 'weekend'
      ? '334155'
      : '64748B';

  return {
    fill: { fgColor: { rgb: fill } },
    font: { color: { rgb: fontColor }, bold: true, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  };
}

const MONTHLY_ATTENDANCE_ACTIONS: Array<{ value: string; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'halfday', label: 'Half Day' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'weekend', label: 'Off / Weekend' },
];

const MONTHLY_LEAVE_ACTION_GROUPS: Array<{ title: string; options: Array<{ value: string; label: string }> }> = [
  {
    title: 'LOP',
    options: [
      { value: 'lop_full_day', label: 'Full Day' },
      { value: 'lop_first_half', label: 'First Half' },
      { value: 'lop_second_half', label: 'Second Half' },
      { value: 'lop_first_half_present', label: 'LOP:P - First Half Leave' },
      { value: 'lop_second_half_present', label: 'P:LOP - Second Half Leave' },
    ],
  },
  {
    title: 'Casual Leave',
    options: [
      { value: 'casual_leave_full_day', label: 'CL - Full Day' },
      { value: 'casual_leave_first_half', label: 'CL - First Half' },
      { value: 'casual_leave_second_half', label: 'CL - Second Half' },
      { value: 'casual_leave_first_half_present', label: 'CL:P - First Half Leave' },
      { value: 'casual_leave_second_half_present', label: 'P:CL - Second Half Leave' },
    ],
  },
  {
    title: 'Sick Leave',
    options: [
      { value: 'sick_leave_full_day', label: 'SL - Full Day' },
      { value: 'sick_leave_first_half', label: 'SL - First Half' },
      { value: 'sick_leave_second_half', label: 'SL - Second Half' },
      { value: 'sick_leave_first_half_present', label: 'SL:P - First Half Leave' },
      { value: 'sick_leave_second_half_present', label: 'P:SL - Second Half Leave' },
    ],
  },
  {
    title: 'Special Leave',
    options: [
      { value: 'special_leave_full_day', label: 'SP - Full Day' },
      { value: 'special_leave_first_half', label: 'SP - First Half' },
      { value: 'special_leave_second_half', label: 'SP - Second Half' },
      { value: 'special_leave_first_half_present', label: 'SP:P - First Half Leave' },
      { value: 'special_leave_second_half_present', label: 'P:SP - Second Half Leave' },
      { value: 'special_leave_first_half_absent', label: 'SP:A - First Half Leave' },
      { value: 'special_leave_second_half_absent', label: 'A:SP - Second Half Leave' },
    ],
  },
  {
    title: 'Comp Off',
    options: [{ value: 'comp_off_full_day', label: 'COFF - Full Day' }],
  },
  {
    title: 'Client Holiday',
    options: [{ value: 'client_holiday_full_day', label: 'CH - Full Day' }],
  },
];

export default function AdminAttendance() {
  const { showFeedback } = useHrmFeedback();
  const [mode, setMode] = useState<AttendanceMode>('daily');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [response, setResponse] = useState<AttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [swipeModalState, setSwipeModalState] = useState<SwipeModalState | null>(null);
  const [swipeRows, setSwipeRows] = useState<SwipeHistoryRow[]>([]);
  const [swipeLoading, setSwipeLoading] = useState(false);
  const [swipeError, setSwipeError] = useState('');
  const [monthlyEditor, setMonthlyEditor] = useState<MonthlyEditorState | null>(null);
  const [monthlyRefreshKey, setMonthlyRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setIsLoading(true);
      setError('');

      try {
        const query = buildQuery(
          mode === 'daily'
            ? {
                mode,
                date: selectedDate,
                search,
                status: statusFilter,
                department: departmentFilter,
              }
            : mode === 'individual'
            ? {
                mode,
                employeeId: selectedEmployeeId,
                month: selectedMonth,
                status: statusFilter,
              }
            : {
                mode,
                employeeId: selectedEmployeeId,
                month: selectedMonth,
                status: statusFilter,
              }
        );

        const request = await fetch(`/HRM/api/admin/attendance?${query}`, { method: 'GET' });
        const result = await request.json();

        if (!request.ok) {
          throw new Error(result.error || 'Failed to load attendance');
        }

        if (active) {
          setResponse(result);
        }
      } catch (requestError: any) {
        if (active) {
          setResponse(null);
          setError(requestError?.message || 'Failed to load attendance');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      active = false;
    };
  }, [departmentFilter, mode, search, selectedDate, selectedEmployeeId, selectedMonth, statusFilter, monthlyRefreshKey]);

  useEffect(() => {
    if (mode !== 'monthly') {
      setMonthlyEditor(null);
    }
  }, [mode]);

  const sectionCards = [
    { id: 'daily' as const, label: 'Daily Attendance', description: 'Check all employee attendance on one day.' },
    { id: 'individual' as const, label: 'Individual Attendance', description: 'Track one employee across dates.' },
    { id: 'monthly' as const, label: 'Monthly Attendance', description: 'Review full employee attendance month-wise in one matrix.' },
  ];

  const activeIndex = sectionCards.findIndex((section) => section.id === mode);
  const dailyRows = mode === 'daily' ? response?.rows || [] : [];
  const individualRows = mode === 'individual' ? response?.rows || [] : [];
  const monthlyRows = useMemo(() => {
    if (mode !== 'monthly') {
      return [] as MonthlyAttendanceRow[];
    }

    const rawRows = ((response?.rows as unknown as MonthlyAttendanceRow[]) || []);
    return rawRows
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        employee: {
          id: row?.employee?.id || '',
          employeeId: row?.employee?.employeeId || '--',
          name: row?.employee?.name || 'Employee',
          department: row?.employee?.department || 'Department not set',
          designation: row?.employee?.designation || 'Designation not set',
          city: row?.employee?.city || '',
          reportingTo: row?.employee?.reportingTo || '--',
        },
        dailyStatuses: Array.isArray(row?.dailyStatuses) ? row.dailyStatuses : [],
        summary: {
          present: Number(row?.summary?.present || 0),
          halfDay: Number(row?.summary?.halfDay || 0),
          absent: Number(row?.summary?.absent || 0),
          off: Number(row?.summary?.off || 0),
          holiday: Number(row?.summary?.holiday || 0),
          leave: Number(row?.summary?.leave || 0),
          totalDays: Number(row?.summary?.totalDays || 0),
        },
      }));
  }, [mode, response?.rows]);
  const calendarDays = response?.calendarDays || [];

  const filteredEmployeeOptions = useMemo(() => {
    return response?.employeeOptions || [];
  }, [response?.employeeOptions]);

  async function exportExcelFile(rows: Array<Record<string, any>>, fileName: string, sheetName: string) {
    if (!rows.length) {
      return;
    }

    const XLSX = await ensureXlsxLoaded();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }

  const handleExportDailyExcel = async () => {
    const rows = dailyRows.map((row) => ({
      employee_id: row.employeeId || '--',
      employee_name: row.employeeName || 'Employee',
      department: row.department || 'Department not set',
      designation: row.designation || 'Designation not set',
      reporting_to: row.reportingTo || '--',
      status: row.statusLabel || '--',
      check_in: row.checkIn || '--',
      check_out: row.checkOut || '--',
      swipe_type: row.swipePattern || '--',
      swipe_count: row.swipeCount ?? 0,
      session_count: row.sessionCount ?? 0,
      work_hours: row.workHours || '--',
      notes_or_source: row.notes || row.source || '--',
    }));

    await exportExcelFile(
      rows,
      `daily_attendance_${safeFilePart(response?.date || selectedDate)}.xlsx`,
      'Daily Attendance'
    );
  };

  const handleExportIndividualExcel = async () => {
    const rows = individualRows.map((row) => ({
      date: row.date || '--',
      status: row.statusLabel || '--',
      check_in: row.checkIn || '--',
      check_out: row.checkOut || '--',
      work_hours: row.workHours || '--',
      shift_hours: row.shiftHours || '9h 00m',
      late_in: row.lateIn || '--',
      early_out: row.earlyOut || '--',
      notes: row.notes || '--',
    }));

    const employeeName =
      filteredEmployeeOptions.find((employee) => employee.id === selectedEmployeeId)?.name ||
      response?.employee?.name ||
      'employee';

    await exportExcelFile(
      rows,
      `individual_attendance_${safeFilePart(selectedMonth)}_${safeFilePart(employeeName)}.xlsx`,
      'Individual Attendance'
    );
  };

  const handleExportMonthlyExcel = async () => {
    if (!monthlyRows.length) {
      return;
    }

    const XLSX = await ensureXlsxLoaded();
    const headerRow = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      ...calendarDays.map((day) => day.dayNumber),
      'P',
      'HD',
      'A',
      'OFF',
      'H',
      'Lv',
      'T',
    ];
    const dataRows = monthlyRows.map((row) => [
      row.employee?.employeeId || '--',
      row.employee?.name || 'Employee',
      row.employee?.department || 'Department not set',
      row.employee?.designation || 'Designation not set',
      ...row.dailyStatuses.map((day) => day.code),
      row.summary.present,
      row.summary.halfDay,
      row.summary.absent,
      row.summary.off,
      row.summary.holiday,
      row.summary.leave,
      row.summary.totalDays,
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      ...calendarDays.map(() => ({ wch: 7 })),
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
    ];

    const headerStyle = {
      fill: { fgColor: { rgb: 'F1F5F9' } },
      font: { bold: true, color: { rgb: '0F172A' }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    };
    const summaryStyle = {
      fill: { fgColor: { rgb: 'F8FAFC' } },
      font: { bold: true, color: { rgb: '0F172A' }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    };
    const metaStyle = {
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
      font: { color: { rgb: '0F172A' }, sz: 10 },
    };
    const dayStartColumn = 4;
    const dayEndColumn = dayStartColumn + calendarDays.length - 1;
    const summaryStartColumn = dayEndColumn + 1;

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = worksheet[address];
        if (!cell) continue;

        if (rowIndex === 0) {
          cell.s = headerStyle;
        } else if (colIndex < dayStartColumn) {
          cell.s = metaStyle;
        } else if (colIndex >= dayStartColumn && colIndex <= dayEndColumn) {
          const dayCell = monthlyRows[rowIndex - 1]?.dailyStatuses?.[colIndex - dayStartColumn];
          cell.s = dayCell ? getMonthlyExcelCellStyle(dayCell) : summaryStyle;
        } else if (colIndex >= summaryStartColumn) {
          cell.s = summaryStyle;
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance');
    const employeeName =
      filteredEmployeeOptions.find((employee) => employee.id === selectedEmployeeId)?.name || 'all_employees';
    XLSX.writeFile(
      workbook,
      `monthly_attendance_${safeFilePart(selectedMonth)}_${safeFilePart(selectedEmployeeId ? employeeName : 'all')}.xlsx`
    );
  };

  const closeSwipeModal = () => {
    setSwipeModalState(null);
    setSwipeRows([]);
    setSwipeError('');
    setSwipeLoading(false);
  };

  const closeMonthlyEditor = () => {
    setMonthlyEditor(null);
  };

  const handleRefreshMonthlyAttendance = () => {
    setMonthlyRefreshKey((current) => current + 1);
  };

  const handleOpenMonthlyEditor = (
    event: React.MouseEvent<HTMLButtonElement>,
    row: MonthlyAttendanceRow,
    day: MonthlyStatusCell
  ) => {
    if (day.date > getTodayDate()) {
      return;
    }

    setMonthlyEditor({
      open: true,
      employeeId: row.employee.id,
      employeeName: row.employee.name,
      date: day.date,
      status: day.status,
      code: day.code,
      label: day.label,
      notes: day.notes,
      saving: false,
    });
  };

  const handleMonthlyStatusChange = async (nextStatus: string) => {
    if (!monthlyEditor?.employeeId || !monthlyEditor?.date) {
      return;
    }

    try {
      setMonthlyEditor((current) => (current ? { ...current, saving: true } : current));

      const request = await fetch('/HRM/api/admin/attendance/override', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: monthlyEditor.employeeId,
          date: monthlyEditor.date,
          status: nextStatus,
          currentCode: monthlyEditor.code,
        }),
      });
      const result = await request.json();

      if (!request.ok) {
        throw new Error(result.error || 'Failed to update attendance');
      }

      setResponse((current) => {
        if (!current) {
          return current;
        }

        const nextRows = ((current.rows as unknown as MonthlyAttendanceRow[]) || []).map((row) => {
          if (row.employee.id !== monthlyEditor.employeeId) {
            return row;
          }

          return {
            ...row,
            dailyStatuses: row.dailyStatuses.map((day) =>
              day.date === monthlyEditor.date
                ? {
                    ...day,
                    ...result.updatedCell,
                  }
                : day
            ),
            summary: {
              present: Number(result.summary?.present || 0),
              halfDay: Number(result.summary?.halfDay || 0),
              absent: Number(result.summary?.absent || 0),
              off: Number(result.summary?.off || 0),
              holiday: Number(result.summary?.holiday || 0),
              leave: Number(result.summary?.leave || 0),
              totalDays: Number(result.summary?.totalDays || 0),
            },
          };
        });

        return {
          ...current,
          rows: nextRows as unknown as DailyRow[],
        };
      });

      showFeedback({
        type: 'success',
        title: 'Attendance Updated',
        message: `${monthlyEditor.employeeName} attendance was updated for ${monthlyEditor.date}.`,
      });
      closeMonthlyEditor();
    } catch (error: any) {
      showFeedback({
        type: 'error',
        title: 'Attendance Not Updated',
        message: error?.message || 'Failed to update attendance.',
      });
      setMonthlyEditor((current) => (current ? { ...current, saving: false } : current));
    }
  };

  const openSwipeModal = async (row: DailyRow) => {
    if (!row.employeeRecordId) {
      return;
    }

    setSwipeModalState({
      open: true,
      employeeRecordId: row.employeeRecordId,
      employeeName: row.employeeName,
      employeeCode: row.employeeId,
      date: row.date,
    });
    setSwipeRows([]);
    setSwipeError('');
    setSwipeLoading(true);

    try {
      const query = buildQuery({
        employeeId: row.employeeRecordId,
        date: row.date,
      });
      const request = await fetch(`/HRM/api/admin/attendance/swipes?${query}`, { method: 'GET' });
      const result = await request.json();

      if (!request.ok) {
        throw new Error(result.error || 'Failed to load swipe history');
      }

      setSwipeRows(Array.isArray(result.swipes) ? result.swipes : []);
    } catch (requestError: any) {
      setSwipeError(requestError?.message || 'Failed to load swipe history');
    } finally {
      setSwipeLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">calendar_clock</span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-on-background">Attendance</h1>
        </div>
        <p className="pl-14 text-sm leading-6 text-on-surface-variant">
          Review daily attendance across the team or drill into one employee&apos;s attendance history.
        </p>
      </section>

      <section className="overflow-x-auto">
        <div className="relative inline-grid min-w-full grid-cols-3 items-center overflow-hidden rounded-[1.35rem] bg-[#F1F4F5] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:min-w-[640px]">
          <div
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-[1rem] bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] shadow-[0_8px_18px_rgba(167,139,250,0.20)] transition-transform duration-300 ease-out"
            style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
          />
          {sectionCards.map((section) => {
            const isActive = mode === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setMode(section.id)}
                className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {section.id === 'daily' ? 'today' : section.id === 'individual' ? 'person_search' : 'calendar_month'}
                </span>
                <span className="whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {mode === 'daily' ? (
          <>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee name or ID"
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="halfday">Half Day</option>
              <option value="on_leave">On Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Departments</option>
              {(response?.departmentOptions || []).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </>
        ) : mode === 'individual' ? (
          <>
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">Select Employee</option>
              {filteredEmployeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="halfday">Half Day</option>
              <option value="on_leave">On Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              {response?.employee
                ? `${response.employee.department || 'Department not set'} • ${response.employee.designation || 'Designation not set'}`
                : 'Choose an employee to load attendance history'}
            </div>
          </>
        ) : (
          <>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Employees</option>
              {filteredEmployeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              {(response?.statusOptions || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      <section className={mode === 'monthly' ? 'space-y-4' : 'rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm'}>
        {isLoading ? (
          <LoadingPanel
            title={mode === 'daily' ? 'Loading daily attendance' : mode === 'individual' ? 'Loading attendance history' : 'Loading monthly attendance'}
            message="Attendance rows are being prepared."
          />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : mode === 'daily' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Daily Attendance</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Attendance view for {response?.date || selectedDate}.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportDailyExcel}
                  disabled={dailyRows.length === 0}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    dailyRows.length === 0
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                      : 'border border-outline-variant/20 bg-white text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  Export Excel
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {dailyRows.length} employees
                </span>
              </div>
            </div>

            {dailyRows.length === 0 ? (
              <HrmEmptyState
                icon="event_busy"
                title="No attendance rows found"
                message="Try another date or widen the filters to view employee attendance records."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1600px] w-full text-left">
                  <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                    <tr>
                      {['Employee ID', 'Employee Name', 'Department', 'Designation', 'Reporting To', 'Status', 'Check-in', 'Check-out', 'Swipe Type', 'Work Hours', 'Notes / Source', 'Swipes'].map((column) => (
                        <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {dailyRows.map((row) => (
                      <tr key={`${row.employeeId}-${row.date}`}>
                        <td className="px-4 py-4 text-sm font-semibold text-on-surface">{row.employeeId}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.employeeName}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.department}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.designation}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.reportingTo}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.statusLabel}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap text-on-surface">{row.checkIn}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap text-on-surface">{row.checkOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <span className="inline-flex rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface">
                            {row.swipePattern || '--'}
                          </span>
                          {typeof row.swipeCount === 'number' && row.swipeCount > 0 ? (
                            <div className="mt-1 text-xs text-on-surface-variant">
                              {row.swipeCount} swipe{row.swipeCount === 1 ? '' : 's'}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.workHours}</td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">
                          {row.notes || row.source || '--'}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <button
                            type="button"
                            onClick={() => openSwipeModal(row)}
                            disabled={!row.employeeRecordId}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              row.employeeRecordId
                                ? 'border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100'
                                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            View Swipes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
            )}
          </>
        ) : mode === 'individual' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Individual Attendance</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {response?.employee
                    ? `${response.employee.name} (${response.employee.employeeId || 'No ID'})`
                    : 'Select an employee to track daily attendance across the chosen month.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportIndividualExcel}
                  disabled={individualRows.length === 0 || !selectedEmployeeId}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    individualRows.length === 0 || !selectedEmployeeId
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                      : 'border border-outline-variant/20 bg-white text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  Export Excel
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {individualRows.length} days
                </span>
              </div>
            </div>

            {!selectedEmployeeId ? (
              <HrmEmptyState
                icon="person_search"
                title="Choose an employee"
                message="Select one employee from the filter row above to inspect their attendance history."
              />
            ) : individualRows.length === 0 ? (
              <HrmEmptyState
                icon="event_busy"
                title="No attendance records found"
                message="No attendance rows matched this employee and filter combination."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left">
                  <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                    <tr>
                      {['Date', 'Status', 'Check-in', 'Check-out', 'Work Hours', 'Shift Hours', 'Notes'].map((column) => (
                        <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {individualRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-4 text-sm font-semibold text-on-surface">{row.date}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.statusLabel}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap text-on-surface">{row.checkIn}</td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap text-on-surface">{row.checkOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.workHours}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.shiftHours || '9h 00m'}</td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">{row.notes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-0 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Monthly Attendance</h2>
              </div>
            </div>

            {monthlyRows.length === 0 ? (
              <HrmEmptyState
                icon="calendar_month"
                title="No monthly attendance found"
                message="Try another month or widen the employee and status filters."
              />
            ) : (
              <div className="space-y-7">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-on-surface-variant">
                      Month-wise attendance matrix for {formatMonthLabel(response?.month || selectedMonth)}.
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleRefreshMonthlyAttendance}
                        disabled={isLoading}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          isLoading
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                            : 'border border-outline-variant/20 bg-white text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        Refresh
                      </button>
                      <div className="rounded-full border border-outline-variant/10 bg-surface-container-low px-3 py-1 text-[11px] text-on-surface-variant whitespace-nowrap">
                        Click past or today cells to edit
                      </div>
                      <button
                        type="button"
                        onClick={handleExportMonthlyExcel}
                        disabled={monthlyRows.length === 0}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          monthlyRows.length === 0
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                            : 'border border-outline-variant/20 bg-white text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        Export Excel
                      </button>
                      <span className="rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm whitespace-nowrap">
                        {monthlyRows.length} employees
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-[11px] text-on-surface-variant">
                      {[
                        ['P', 'present'],
                        ['A', 'absent'],
                        ['HD', 'halfday'],
                        ['CL', 'casual leave'],
                        ['SL', 'sick leave'],
                        ['SP', 'special leave'],
                        ['LOP', 'loss of pay'],
                        ['CH', 'client holiday'],
                        ['COFF', 'comp off'],
                        ['H', 'holiday'],
                        ['OFF', 'weekend'],
                        ['LOP:P', 'half-day leave + work'],
                      ].map(([code, status]) => (
                        <div
                          key={code}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] whitespace-nowrap"
                        >
                          <span
                            className={`inline-flex min-w-[28px] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                              code.includes(':')
                                ? getStatusCellTone('halfday')
                                : getStatusCellTone(
                                    ['CL', 'SL', 'SP', 'LOP', 'CH', 'COFF'].includes(code) ? 'on_leave' : status
                                  )
                            }`}
                          >
                            {code}
                          </span>
                          <span>{status === 'weekend' ? 'Off' : status.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="max-h-[68vh] overflow-auto rounded-2xl border border-outline-variant/10 overscroll-contain scroll-smooth [scroll-behavior:smooth] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-center">
                  <thead>
                    <tr className="bg-surface-container-low/40">
                      <th className="sticky left-0 top-0 z-30 w-[180px] min-w-[180px] max-w-[180px] border-b border-r border-outline-variant/10 bg-white px-3 py-2.5 text-left text-sm font-bold text-on-surface shadow-[8px_0_18px_rgba(255,255,255,0.95)]">
                        Employee
                      </th>
                      {calendarDays.map((day) => (
                        <th
                          key={day.date}
                          className="sticky top-0 z-20 min-w-[32px] border-b border-r border-outline-variant/10 bg-surface-container-lowest px-0.5 py-2 text-[10px] font-bold text-on-surface"
                        >
                          <div>{day.dayNumber}</div>
                          <div className="mt-0.5 text-[9px] font-medium text-on-surface-variant">{day.weekdayShort}</div>
                        </th>
                      ))}
                      {[
                        ['P', 'present'],
                        ['HD', 'halfDay'],
                        ['A', 'absent'],
                        ['OFF', 'off'],
                        ['H', 'holiday'],
                        ['LV', 'leave'],
                        ['T', 'totalDays'],
                      ].map(([label]) => (
                        <th
                          key={label}
                          className="sticky top-0 z-20 min-w-[34px] border-b border-r border-outline-variant/10 bg-surface-container-lowest px-1 py-2 text-[10px] font-bold text-on-surface"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row) => (
                      <tr
                        key={row.employee.id || `${row.employee.employeeId}-${row.employee.name}`}
                        className="odd:bg-white even:bg-surface-container-lowest/40"
                      >
                        <td className="sticky left-0 z-10 w-[180px] min-w-[180px] max-w-[180px] border-b border-r border-outline-variant/10 bg-white px-3 py-2.5 text-left shadow-[8px_0_18px_rgba(255,255,255,0.95)]">
                          <div className="truncate text-[13px] font-semibold text-on-surface">
                            {row.employee.name}{' '}
                            <span className="font-medium text-on-surface-variant">[{row.employee.employeeId}]</span>
                          </div>
                          <div className="mt-1 truncate text-[10px] text-on-surface-variant">{getEmployeeMetaLine(row.employee)}</div>
                          <div className="hidden sr-only">
                            {row.employee.employeeId} · {row.employee.designation}
                          </div>
                          <div className="hidden sr-only">{row.employee.department}</div>
                        </td>
                        {row.dailyStatuses.map((day) => (
                          <td
                            key={`${row.employee.id || row.employee.employeeId}-${day.date}`}
                            title={`${day.label}${day.notes ? ` • ${day.notes}` : ''}`}
                            className={`relative border-b border-r border-outline-variant/10 p-0 ${getStatusCellTone(day.status)}`}
                          >
                            <button
                              type="button"
                              onClick={(event) => handleOpenMonthlyEditor(event, row, day)}
                              disabled={day.date > getTodayDate()}
                              className={`absolute inset-0 flex min-h-[34px] w-full items-center justify-center px-0.5 py-2 text-[10px] font-semibold transition ${
                                day.date > getTodayDate()
                                  ? 'cursor-not-allowed opacity-65'
                                  : 'cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-[2px] hover:scale-[1.015] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.08)] active:translate-y-0 active:scale-[0.995] active:shadow-[inset_0_3px_10px_rgba(15,23,42,0.14),0_1px_2px_rgba(15,23,42,0.06)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400/30'
                              }`}
                            >
                              {day.code}
                            </button>
                          </td>
                        ))}
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.present}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.halfDay}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.absent}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.off}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.holiday}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.leave}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.totalDays}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {monthlyEditor?.open ? (
        <>
          <button
            type="button"
            aria-label="Close attendance editor"
            onClick={closeMonthlyEditor}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/18 backdrop-blur-[2px]"
          />
          <div
            className="fixed left-[53%] top-1/2 z-50 w-[min(860px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.35rem] border border-outline-variant/10 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
          >
            <div className="border-b border-outline-variant/10 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-on-surface">{monthlyEditor.employeeName}</p>
                    <p className="text-xs text-on-surface-variant">{monthlyEditor.date}</p>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface">
                      Current: {monthlyEditor.code} - {monthlyEditor.label}
                    </span>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      Update Status
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMonthlyEditor}
                  disabled={monthlyEditor.saving}
                  aria-label="Close editor"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/15 text-lg leading-none text-on-surface-variant transition hover:bg-surface-container-low disabled:opacity-70"
                >
                  ×
                </button>
              </div>
            </div>
            <div
              className="grid max-h-[76vh] grid-cols-1 overflow-y-auto pb-4 md:grid-cols-[200px_minmax(0,1fr)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200/90 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(203,213,225,0.9) transparent' }}
            >
              <div className="border-b border-outline-variant/10 px-4 py-3 md:border-b-0 md:border-r">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Attendance</p>
                <div className="space-y-2">
                  {MONTHLY_ATTENDANCE_ACTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleMonthlyStatusChange(option.value)}
                      disabled={monthlyEditor.saving}
                      className={`flex w-full items-center justify-between rounded-xl border border-outline-variant/10 px-3 py-2 text-left text-[13px] font-medium text-on-surface transition hover:bg-surface-container-low ${
                        monthlyEditor.saving ? 'cursor-wait opacity-70' : ''
                      }`}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Leave And LOP</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {MONTHLY_LEAVE_ACTION_GROUPS.map((group) => (
                    <div key={group.title} className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-2.5">
                      <p className="mb-2 text-[12px] font-semibold text-on-surface">{group.title}</p>
                      <div className="space-y-2">
                        {group.options.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleMonthlyStatusChange(option.value)}
                            disabled={monthlyEditor.saving}
                            className={`flex w-full items-center justify-between rounded-xl border border-outline-variant/10 bg-white px-3 py-2 text-left text-[13px] leading-5 text-on-surface transition hover:bg-surface-container-low ${
                              monthlyEditor.saving ? 'cursor-wait opacity-70' : ''
                            }`}
                          >
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {swipeModalState?.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-outline-variant/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 px-6 py-5">
              <div>
                <h3 className="text-xl font-headline font-bold text-on-background">Attendance Swipes</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {swipeModalState.employeeName} ({swipeModalState.employeeCode}) on {swipeModalState.date}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSwipeModal}
                className="rounded-full border border-outline-variant/15 px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-6 py-5">
              {swipeLoading ? (
                <LoadingPanel title="Loading swipe history" message="Pulling saved in and out address details for this employee." />
              ) : swipeError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{swipeError}</div>
              ) : swipeRows.length === 0 ? (
                <HrmEmptyState
                  icon="pin_drop"
                  title="No swipes found"
                  message="No swipe entries were saved for this employee on the selected date."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left">
                    <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                      <tr>
                        {['Swipe Time', 'In / Out', 'Door / Address'].map((column) => (
                          <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {swipeRows.map((swipe) => (
                        <tr key={swipe.id}>
                          <td className="px-4 py-4 text-sm font-semibold text-on-surface">{swipe.swipeTime}</td>
                          <td className="px-4 py-4 text-sm text-on-surface">{swipe.swipeType}</td>
                          <td className="px-4 py-4 text-sm text-on-surface">{swipe.doorAddress || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
