export type AttendanceStatus = 'present' | 'absent' | 'halfday' | 'weekend' | 'holiday' | 'on_leave';

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  lateIn: string;
  earlyOut: string;
  workHours: string;
  shiftHours: string;
  notes: string;
}

export interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
}

export interface AttendanceResponse {
  month: string;
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  todayAction: 'check_in' | 'check_out' | 'completed';
  todayRecord: AttendanceRecord | null;
}

export interface RegularizationDay {
  date: string;
  kind: 'gap' | 'leave';
  label: string;
  countLabel?: string;
  hasHalfDayLeave?: boolean;
}

export interface RegularizationStatusItem {
  id: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestType: string;
  timeRange: string;
  reason: string;
  appliedOn: string;
  currentStatusLabel?: string;
  sentToHr?: string;
  reportingManager?: string;
  approvalOutcome?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  canReview?: boolean;
}

export interface RegularizationResponse {
  month: string;
  eligibleDays: RegularizationDay[];
  pending: RegularizationStatusItem[];
  history: RegularizationStatusItem[];
  hrApprovers: {
    id: string;
    name: string;
    email: string;
  }[];
  reportingManager: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const today = new Date();

  const cells: {
    day: number | null;
    dateStr: string;
    isCurrentMonth: boolean;
    isWeekend: boolean;
    isToday: boolean;
  }[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ day: null, dateStr: '', isCurrentMonth: false, isWeekend: false, isToday: false });
  }

  for (let d = 1; d <= totalDays; d += 1) {
    const dt = new Date(year, month, d);
    const dow = dt.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isWeekend: dow === 0 || dow === 6,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
    });
  }

  while (cells.length < 42) {
    cells.push({ day: null, dateStr: '', isCurrentMonth: false, isWeekend: false, isToday: false });
  }

  return cells;
}

export function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function findFirstRegularizationDateForMonth(
  year: number,
  month: number,
  days: RegularizationDay[] = []
) {
  const match = days.find((item) => {
    const itemYear = Number(item.date.slice(0, 4));
    const itemMonth = Number(item.date.slice(5, 7)) - 1;
    return itemYear === year && itemMonth === month;
  });

  return match?.date ?? `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
