const TIME_ZONE = 'Asia/Kolkata';
const TIME_ZONE_OFFSET = '+05:30';

export const ATTENDANCE_POLICY = {
  shiftStart: '09:00',
  shiftEnd: '17:30',
  autoCheckout: '22:00',
  shiftMinutes: 8 * 60 + 30, // 510 minutes (8h 30m)
  presentMinutes: 8 * 60, // 480 minutes (8h minimum for Present status)
};

function classifyAttendanceStatus({ checkInMinutes, checkOutMinutes, workHoursMinutes, hasOpenSession = false }) {
  if (checkInMinutes === null) {
    return 'absent';
  }

  if (hasOpenSession || checkOutMinutes === null) {
    return 'halfday';
  }

  return workHoursMinutes >= ATTENDANCE_POLICY.presentMinutes ? 'present' : 'halfday';
}

function getFormatter(options) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    ...options,
  });
}

export function getPartsInTimeZone(dateLike = new Date()) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const parts = getFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: values.weekday,
  };
}

export function getCurrentDateInTimeZone() {
  const { year, month, day } = getPartsInTimeZone(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getCurrentMinutesInTimeZone() {
  const { hour, minute } = getPartsInTimeZone(new Date());
  return hour * 60 + minute;
}

export function timeStringToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }

  const [hourText, minuteText] = timeString.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

export function createTimestampForAttendanceDate(dateString, timeString) {
  if (!dateString || !timeString) {
    return null;
  }

  const normalizedTime = String(timeString).trim();
  if (!normalizedTime) {
    return null;
  }

  const timeParts = normalizedTime.split(':');
  if (timeParts.length === 2) {
    return `${dateString}T${normalizedTime}:00${TIME_ZONE_OFFSET}`;
  }

  if (timeParts.length === 3) {
    return `${dateString}T${normalizedTime}${TIME_ZONE_OFFSET}`;
  }

  return null;
}

export function getLocalDateFromTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const { year, month, day } = getPartsInTimeZone(timestamp);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getLocalMinutesFromTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const { hour, minute } = getPartsInTimeZone(timestamp);
  return hour * 60 + minute;
}

export function formatMinutesAsDuration(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '-';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatTimestampForDisplay(timestamp) {
  if (!timestamp) {
    return '-';
  }

  const date = new Date(timestamp);
  return getFormatter({
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .toUpperCase();
}

export function isWeekendDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6;
}

export function getDayNameFromDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function isSecondSaturday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 6 && day >= 8 && day <= 14;
}

export function normalizeWorkingDays(workingDays = []) {
  const normalizeDayName = (dayName) => {
    const normalized = String(dayName || '').trim().toLowerCase();
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  return Array.isArray(workingDays)
    ? workingDays.map((item) => normalizeDayName(item)).filter(Boolean)
    : [];
}

export function isEmployeeScheduledOff(dateString, employeeSchedule = {}) {
  const dayName = getDayNameFromDate(dateString);
  const workingDays = normalizeWorkingDays(employeeSchedule.workingDays);
  const secondSaturdayOff = Boolean(employeeSchedule.secondSaturdayOff);

  if (dayName === 'Saturday' && secondSaturdayOff && isSecondSaturday(dateString)) {
    return true;
  }

  if (workingDays.length === 0) {
    return isWeekendDate(dateString);
  }

  return !workingDays.includes(dayName);
}

export function getOffDayLabel(dateString, employeeSchedule = {}) {
  const dayName = getDayNameFromDate(dateString);
  const workingDays = normalizeWorkingDays(employeeSchedule.workingDays);

  if (
    dayName === 'Saturday' &&
    Boolean(employeeSchedule.secondSaturdayOff) &&
    isSecondSaturday(dateString)
  ) {
    return 'Second Saturday Off';
  }

  if (dayName === 'Sunday' && !workingDays.includes('Sunday')) {
    return 'Sunday Off';
  }

  return 'Weekly Off';
}

export function getDateRangeForMonth(monthString) {
  const [yearText, monthText] = monthString.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    throw new Error('Invalid month');
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start, end, year, month: month - 1, lastDay };
}

export function listDatesInRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function calculateAttendanceMetrics({ checkInAt, checkOutAt }) {
  const checkInMinutes = getLocalMinutesFromTimestamp(checkInAt);
  const checkOutMinutes = getLocalMinutesFromTimestamp(checkOutAt);
  const lateInMinutes = checkInMinutes === null
    ? 0
    : Math.max(0, checkInMinutes - timeStringToMinutes(ATTENDANCE_POLICY.shiftStart));
  const earlyOutMinutes = checkOutMinutes === null
    ? 0
    : Math.max(0, timeStringToMinutes(ATTENDANCE_POLICY.shiftEnd) - checkOutMinutes);

  let workHoursMinutes = 0;
  if (checkInAt && checkOutAt) {
    const diffMilliseconds = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
    workHoursMinutes = Math.max(0, Math.floor(diffMilliseconds / 60000));
  }

  const attendanceStatus = classifyAttendanceStatus({
    checkInMinutes,
    checkOutMinutes,
    workHoursMinutes,
  });

  return {
    attendanceStatus,
    lateInMinutes,
    earlyOutMinutes,
    workHoursMinutes,
  };
}

export function isDateBeforeJoin(dateString, joinDate) {
  if (!dateString || !joinDate) {
    return false;
  }
  return String(dateString) < String(joinDate);
}

export function mapDbStatusToUiStatus(status, isWeekend = false) {
  if (status === 'weekend' || status === 'off') {
    return 'weekend';
  }

  if (status === 'holiday') {
    return 'holiday';
  }

  if (status === 'on_leave') {
    return 'on_leave';
  }

  if (status === 'half_day' || status === 'halfday') {
    return 'halfday';
  }

  if (status === 'late') {
    return 'halfday';
  }

  if (status === 'present' || status === 'absent') {
    return status;
  }

  return isWeekend ? 'weekend' : 'absent';
}

export function buildHolidayUiRecord(dateString, holiday) {
  const holidayName = holiday?.name || holiday?.holiday_name || 'Holiday';
  const holidayType = holiday?.type || holiday?.holiday_type || 'General';

  return {
    date: dateString,
    status: 'holiday',
    checkIn: '-',
    checkOut: '-',
    lateIn: '-',
    earlyOut: '-',
    workHours: '-',
    shiftHours: '-',
    notes: `${holidayName}${holidayType ? ` • ${holidayType}` : ''}`,
  };
}

export function buildAttendanceUiRecord(dateString, row, employeeSchedule = {}) {
  const { joinDate } = employeeSchedule;
  const isBeforeJoin = isDateBeforeJoin(dateString, joinDate);
  const isOffDay = isEmployeeScheduledOff(dateString, employeeSchedule);
  const offDayLabel = getOffDayLabel(dateString, employeeSchedule);

  if (isBeforeJoin) {
    return {
      date: dateString,
      status: 'missing',
      checkIn: '-',
      checkOut: '-',
      lateIn: '-',
      earlyOut: '-',
      workHours: '-',
      shiftHours: '-',
      notes: '',
    };
  }

  if (!row) {
    return {
      date: dateString,
      status: isOffDay ? 'weekend' : 'absent',
      checkIn: '-',
      checkOut: '-',
      lateIn: '-',
      earlyOut: '-',
      workHours: isOffDay ? '-' : '0h 00m',
      shiftHours: isOffDay ? '-' : '8h 30m',
      notes: isOffDay ? offDayLabel : 'Absent',
    };
  }

  const statusValue = row.attendance_status || row.status;
  const checkInValue = row.check_in_at || row.check_in || null;
  const checkOutValue = row.check_out_at || row.check_out || null;
  const lateInMinutes = row.late_in_minutes ?? 0;
  const earlyOutMinutes = row.early_out_minutes ?? 0;
  const workHoursMinutes = row.work_hours_minutes ?? 0;
  const source = row.checkout_source || row.source || '';
  const status = mapDbStatusToUiStatus(statusValue, isOffDay);
  const notes = [];

  if (row.notes) {
    notes.push(row.notes);
  }

  if (row.is_auto_checkout || source === 'system_auto') {
    notes.push('Auto checkout marked by system at 10:00 PM.');
  }

  if (row.is_regularized || source === 'regularization') {
    notes.push('Attendance updated after approval.');
  }

  if (statusValue === 'on_leave') {
    notes.push('Approved leave is applied for this date.');
  }

  return {
    date: dateString,
    status,
    checkIn: formatTimestampForDisplay(checkInValue),
    checkOut: formatTimestampForDisplay(checkOutValue),
    lateIn: formatMinutesAsDuration(lateInMinutes),
    earlyOut: formatMinutesAsDuration(earlyOutMinutes),
    workHours: formatMinutesAsDuration(workHoursMinutes),
    shiftHours: '8h 30m',
    notes: notes.join(' '),
  };
}

export function getAttendanceSummary(rows = []) {
  return rows.reduce(
    (summary, row) => {
      const status = row.attendance_status || row.status;
      if (status === 'present') summary.presentCount += 1;
      if (status === 'absent') summary.absentCount += 1;
      if (status === 'half_day' || status === 'halfday') summary.halfDayCount += 1;
      if (status === 'on_leave') summary.presentCount += 0;
      return summary;
    },
    { presentCount: 0, absentCount: 0, halfDayCount: 0 }
  );
}

export function buildRegularizationEligibleDay(dateString, record) {
  if (isEmployeeScheduledOff(dateString)) {
    return null;
  }

  if (!record) {
    return {
      date: dateString,
      kind: 'gap',
      label: 'Absent',
    };
  }

  if (
    record.attendance_status === 'half_day' ||
    record.status === 'half_day' ||
    record.attendance_status === 'halfday' ||
    record.status === 'halfday' ||
    record.attendance_status === 'absent' ||
    record.status === 'absent' ||
    record.is_auto_checkout ||
    record.source === 'system_auto'
  ) {
    return {
      date: dateString,
      kind: 'gap',
      label: record.is_auto_checkout ? 'Auto Checkout' : 'Attendance Issue',
    };
  }

  return null;
}

export function summarizeAttendanceFromSwipes(swipes = []) {
  if (!Array.isArray(swipes) || swipes.length === 0) {
    return {
      firstCheckIn: null,
      lastCheckOut: null,
      workHoursMinutes: 0,
      lateInMinutes: 0,
      earlyOutMinutes: 0,
      attendanceStatus: 'absent',
      hasOpenSession: false,
    };
  }

  const sortedSwipes = [...swipes].sort(
    (left, right) => new Date(left.swipe_time).getTime() - new Date(right.swipe_time).getTime()
  );

  let openCheckIn = null;
  let workHoursMinutes = 0;
  let firstCheckIn = null;
  let lastCheckOut = null;

  for (const swipe of sortedSwipes) {
    if (swipe.swipe_type === 'in') {
      if (!firstCheckIn) {
        firstCheckIn = swipe.swipe_time;
      }
      openCheckIn = swipe.swipe_time;
      continue;
    }

    if (swipe.swipe_type === 'out' && openCheckIn) {
      const sessionMinutes = Math.max(
        0,
        Math.floor((new Date(swipe.swipe_time).getTime() - new Date(openCheckIn).getTime()) / 60000)
      );
      workHoursMinutes += sessionMinutes;
      lastCheckOut = swipe.swipe_time;
      openCheckIn = null;
    }
  }

  const checkInMinutes = getLocalMinutesFromTimestamp(firstCheckIn);
  const lateInMinutes = checkInMinutes === null
    ? 0
    : Math.max(0, checkInMinutes - timeStringToMinutes(ATTENDANCE_POLICY.shiftStart));
  const earlyOutMinutes = lastCheckOut
    ? Math.max(0, timeStringToMinutes(ATTENDANCE_POLICY.shiftEnd) - getLocalMinutesFromTimestamp(lastCheckOut))
    : 0;

  const attendanceStatus = classifyAttendanceStatus({
    checkInMinutes,
    checkOutMinutes: lastCheckOut ? getLocalMinutesFromTimestamp(lastCheckOut) : null,
    workHoursMinutes,
    hasOpenSession: Boolean(openCheckIn),
  });

  return {
    firstCheckIn,
    lastCheckOut,
    workHoursMinutes,
    lateInMinutes,
    earlyOutMinutes,
    attendanceStatus,
    hasOpenSession: Boolean(openCheckIn),
  };
}

export function mapSwipeForUi(swipe) {
  return {
    id: swipe.id,
    swipeTime: formatTimestampForDisplay(swipe.swipe_time),
    swipeType: swipe.swipe_type === 'in' ? 'IN' : 'OUT',
    doorAddress: swipe.door_address || '-',
  };
}
