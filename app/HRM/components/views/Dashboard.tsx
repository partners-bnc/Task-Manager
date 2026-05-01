'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AttendanceRecord, AttendanceResponse } from './attendanceShared';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import { captureAttendanceLocationPayload } from '@/utils/attendance-location';

type HolidayItem = {
  id: string;
  date: string;
  title: string;
  type: string;
};

function RollingDigit({
  value,
  sizeClass,
  muted = false,
}: {
  value: string;
  sizeClass: string;
  muted?: boolean;
}) {
  const digit = Number.parseInt(value, 10) || 0;

  return (
    <span className={`relative inline-flex h-[1.08em] w-[0.7em] overflow-hidden ${sizeClass} ${muted ? 'text-violet-300' : 'text-violet-500'}`}>
      <span
        className="absolute left-0 top-0 flex w-full flex-col items-center transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${digit * 1.08}em)` }}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className="flex h-[1.08em] w-full items-center justify-center font-mono tabular-nums"
          >
            {index}
          </span>
        ))}
      </span>
    </span>
  );
}

function RollingTimeGroup({
  value,
  sizeClass,
  muted = false,
}: {
  value: string;
  sizeClass: string;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex items-center">
      {value.split('').map((digit, index) => (
        <RollingDigit key={`${digit}-${index}`} value={digit} sizeClass={sizeClass} muted={muted} />
      ))}
    </span>
  );
}

// Dummy holiday data for the dashboard card and full calendar modal
const holidays = [
  {
    id: '1',
    date: '2026-03-30',
    title: 'Ugadi',
    type: 'Festival Holiday',
    occasion: 'Telugu and Kannada New Year',
    description: 'Celebrated as the traditional new year with prayers, family meals, and festive gatherings.',
  },
  {
    id: '2',
    date: '2026-04-03',
    title: 'Good Friday',
    type: 'Gazetted Holiday',
    occasion: 'Christian observance',
    description: 'A day of reflection and prayer commemorating the crucifixion of Jesus Christ.',
  },
  {
    id: '3',
    date: '2026-04-14',
    title: 'Dr. Ambedkar Jayanti',
    type: 'National Holiday',
    occasion: 'Birth anniversary of Dr. B. R. Ambedkar',
    description: 'Observed to honor Dr. Ambedkar’s contribution to the Constitution and social justice in India.',
  },
  {
    id: '4',
    date: '2026-05-01',
    title: 'Labour Day',
    type: 'National Holiday',
    occasion: 'International Workers’ Day',
    description: 'Recognizes workers, labor rights, and the contributions of people across industries.',
  },
  {
    id: '5',
    date: '2026-08-15',
    title: 'Independence Day',
    type: 'National Holiday',
    occasion: 'Independence of India',
    description: 'Marked with flag hoisting, cultural programs, and remembrance of the freedom movement.',
  },
  {
    id: '6',
    date: '2026-08-28',
    title: 'Onam',
    type: 'Festival Holiday',
    occasion: 'Harvest festival of Kerala',
    description: 'Celebrated with floral decorations, traditional feasts, and community events.',
  },
  {
    id: '7',
    date: '2026-10-19',
    title: 'Diwali',
    type: 'Festival Holiday',
    occasion: 'Festival of Lights',
    description: 'Observed with lamps, sweets, family visits, and prayers symbolizing light over darkness.',
  },
  {
    id: '8',
    date: '2026-12-25',
    title: 'Christmas Day',
    type: 'Gazetted Holiday',
    occasion: 'Christmas celebration',
    description: 'A holiday for church services, community celebrations, and time with family.',
  },
];

function formatHolidayTypeLabel(type) {
  if (type === 'company') {
    return 'General';
  }

  if (!type) {
    return 'General';
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getGreetingMeta(date: Date) {
  const hours = date.getHours();

  if (hours < 12) {
    return {
      title: 'Good Morning',
      emoji: '🌤️',
      note: 'Start the day with clarity and stay ahead of your tasks.',
    };
  }

  if (hours < 17) {
    return {
      title: 'Good Afternoon',
      emoji: '☀️',
      note: 'Everything you need for the workday is lined up here.',
    };
  }

  return {
    title: 'Good Evening',
    emoji: '🌙',
    note: 'Wrap up the day smoothly and keep tomorrow prepared.',
  };
}

const WEEKLY_MOTIVATION_MESSAGES = [
  {
    title: 'Keep Going',
    body: 'Small steps every day build strong results. Stay steady, stay proud, and keep moving forward.',
  },
  {
    title: 'You Are Growing',
    body: 'Every task you complete adds to your progress. Trust your effort and let your work speak for you.',
  },
  {
    title: 'One Good Day',
    body: 'A focused day can change the whole week. Stay calm, stay kind, and do your best with confidence.',
  },
  {
    title: 'Stay Inspired',
    body: 'Good work comes from clear thinking and a positive heart. Keep your energy pointed toward progress.',
  },
  {
    title: 'You Can Do This',
    body: 'Challenges are part of growth. Keep learning, keep showing up, and keep believing in yourself.',
  },
  {
    title: 'Progress Matters',
    body: 'You do not need perfection every day. Consistent effort and honest work always create momentum.',
  },
];

function getWeekOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diffInDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffInDays / 7);
}

export default function Dashboard({
  employee,
  setCurrentTab,
  onLogout,
  isLoggingOut,
}: {
  employee?: { name?: string; employee_id?: string; working_days?: string[]; second_saturday_off?: boolean } | null;
  setCurrentTab?: (tab: string) => void;
  onLogout?: () => Promise<void>;
  isLoggingOut?: boolean;
}) {
  const { showFeedback } = useHrmFeedback();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSwipesModalOpen, setIsSwipesModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<HolidayItem | null>(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayAction, setTodayAction] = useState<'check_in' | 'check_out'>('check_in');
  const [todaySwipes, setTodaySwipes] = useState<{ id: string; swipeTime: string; swipeType: string; doorAddress: string }[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
  });
  const [attendanceSetupPending, setAttendanceSetupPending] = useState(false);
  const [isAttendanceUpdating, setIsAttendanceUpdating] = useState(false);
  const [holidayItems, setHolidayItems] = useState<HolidayItem[]>([]);
  const attendanceButtonClassName =
    'group relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-400 via-violet-500 to-violet-600 px-4 py-3 text-xs font-semibold text-white shadow-[0_14px_28px_rgba(139,92,246,0.28)] transition-all duration-200 before:absolute before:inset-x-4 before:top-1 before:h-[42%] before:rounded-full before:bg-white/20 before:blur-md hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(139,92,246,0.34)] active:translate-y-1 active:shadow-[0_8px_18px_rgba(139,92,246,0.22)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0';
  const attendanceMonth = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
  const todayDateKey = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
  const weeklyMotivation = useMemo(() => {
    const weekIndex = getWeekOfYear(new Date()) % WEEKLY_MOTIVATION_MESSAGES.length;
    return WEEKLY_MOTIVATION_MESSAGES[weekIndex];
  }, []);

  // Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isSwipesModalOpen) setIsSwipesModalOpen(false);
        if (isHolidayModalOpen) setIsHolidayModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSwipesModalOpen, isHolidayModalOpen]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTodayAttendance() {
      try {
        const [attendanceResponse, swipeResponse] = await Promise.all([
          fetch(`/HRM/api/attendance?month=${attendanceMonth}`, { method: 'GET' }),
          fetch(`/HRM/api/attendance/swipes?date=${todayDateKey}`, { method: 'GET' }),
        ]);
        const result: AttendanceResponse & { setupPending?: boolean; error?: string } = await attendanceResponse.json();
        const swipeResult = await swipeResponse.json();

        if (!active || !attendanceResponse.ok) {
          return;
        }

        setTodayAttendance(result.todayRecord || null);
        setTodayAction(result.todayAction === 'check_out' ? 'check_out' : 'check_in');
        setAttendanceRecords(result.records || []);
        setAttendanceSummary(
          result.summary || {
            presentCount: 0,
            absentCount: 0,
            halfDayCount: 0,
          }
        );
        setAttendanceSetupPending(Boolean(result.setupPending));
        setTodaySwipes(Array.isArray(swipeResult?.swipes) ? swipeResult.swipes : []);
      } catch {
        if (active) {
          setTodayAttendance(null);
          setTodayAction('check_in');
          setTodaySwipes([]);
          setAttendanceRecords([]);
          setAttendanceSummary({
            presentCount: 0,
            absentCount: 0,
            halfDayCount: 0,
          });
          setAttendanceSetupPending(false);
        }
      }
    }

    loadTodayAttendance();

    const handleAttendanceRefresh = () => {
      loadTodayAttendance();
    };

    window.addEventListener('hrm-attendance-updated', handleAttendanceRefresh);
    return () => {
      active = false;
      window.removeEventListener('hrm-attendance-updated', handleAttendanceRefresh);
    };
  }, [attendanceMonth, todayDateKey]);

  useEffect(() => {
    let active = true;

    async function loadHolidays() {
      try {
        const response = await fetch('/HRM/api/holidays', { method: 'GET' });
        const result = await response.json();

        if (!response.ok || !active) {
          return;
        }

        setHolidayItems(
          (result.holidays || []).map((holiday) => ({
            id: holiday.id,
            date: holiday.date,
            title: holiday.name,
            type: holiday.type || 'General',
          }))
        );
      } catch {
        if (active) {
          setHolidayItems([]);
        }
      }
    }

    loadHolidays();
    return () => {
      active = false;
    };
  }, []);

  const cardHolidays = useMemo(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return holidayItems.filter((holiday) => holiday.date >= todayKey).slice(0, 3);
  }, [holidayItems]);

  const formattedFullDate = currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedShortDate = currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const dayName = currentTime.toLocaleDateString('en-GB', { weekday: 'long' });
  const greetingMeta = getGreetingMeta(currentTime);
  
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');
  const timeString = { hours, minutes, seconds };

  // Calendar helper functions
  const getMonthData = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    
    const days = [];
    // Previous month padding
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const holiday = holidayItems.find(h => h.date === dateStr);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      days.push({ 
        day: i, 
        date: dateStr,
        isCurrentMonth: true, 
        isWeekend: new Date(year, month, i).getDay() === 0 || new Date(year, month, i).getDay() === 6,
        isToday,
        holiday
      });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    
    return { days, year, month, monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  };

  const getMonthFromHoliday = (holidayDate) => {
    const [year, month] = holidayDate.split('-').map(Number);
    return new Date(year, month - 1, 1);
  };

  const getHolidayForMonth = (date) => holidayItems.find((holiday) => {
    const holidayDate = parseDate(holiday.date);
    return holidayDate.getFullYear() === date.getFullYear() && holidayDate.getMonth() === date.getMonth();
  });

  // Find next upcoming holiday, otherwise fall back to the latest holiday month in the list
  const getDefaultMonth = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const nextHoliday = holidayItems.find(h => h.date >= todayStr);
    if (nextHoliday) {
      return getMonthFromHoliday(nextHoliday.date);
    }

    const latestHoliday = holidayItems[holidayItems.length - 1];
    if (latestHoliday) {
      return getMonthFromHoliday(latestHoliday.date);
    }

    return new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const [calendarMonth, setCalendarMonth] = useState(() => getDefaultMonth());
  const monthData = getMonthData(calendarMonth);

  useEffect(() => {
    if (!holidayItems.length) {
      return;
    }

    const resolveMonthFromHoliday = (holidayDate) => {
      const [year, month] = holidayDate.split('-').map(Number);
      return new Date(year, month - 1, 1);
    };

    const resolveDefaultMonth = () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nextHoliday = holidayItems.find((holiday) => holiday.date >= todayStr);
      if (nextHoliday) {
        return resolveMonthFromHoliday(nextHoliday.date);
      }

      const latestHoliday = holidayItems[holidayItems.length - 1];
      if (latestHoliday) {
        return resolveMonthFromHoliday(latestHoliday.date);
      }

      return new Date(today.getFullYear(), today.getMonth(), 1);
    };

    const resolveHolidayForMonth = (date) =>
      holidayItems.find((holiday) => {
        const holidayDate = parseDate(holiday.date);
        return holidayDate.getFullYear() === date.getFullYear() && holidayDate.getMonth() === date.getMonth();
      });

    setCalendarMonth((current) => {
      const hasHolidayInCurrentMonth = holidayItems.some((holiday) => {
        const holidayDate = parseDate(holiday.date);
        return holidayDate.getFullYear() === current.getFullYear() && holidayDate.getMonth() === current.getMonth();
      });

      if (hasHolidayInCurrentMonth) {
        return current;
      }

      return resolveDefaultMonth();
    });

    setSelectedDate((current) => current || resolveHolidayForMonth(resolveDefaultMonth()) || null);
  }, [holidayItems]);

  const changeCalendarMonth = (offset) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(nextMonth);
    setSelectedDate(getHolidayForMonth(nextMonth) || null);
  };

  const goToPrevMonth = () => changeCalendarMonth(-1);
  const goToNextMonth = () => changeCalendarMonth(1);

  const openHolidayModal = () => {
    const defaultMonth = selectedDate ? getMonthFromHoliday(selectedDate.date) : getDefaultMonth();
    setCalendarMonth(defaultMonth);
    setSelectedDate(getHolidayForMonth(defaultMonth) || null);
    setIsHolidayModalOpen(true);
  };

  const handleDateClick = (dayInfo) => {
    if (dayInfo.isCurrentMonth && dayInfo.holiday) {
      setSelectedDate(dayInfo.holiday);
    }
  };

  // Safe date parsing without timezone issues
  const parseDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getHolidayDateInfo = (dateStr) => {
    const d = parseDate(dateStr);
    return {
      month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      day: d.getDate()
    };
  };

  const displayName = employee?.name || employee?.employee_id || 'Employee';
  const loginId = employee?.employee_id || 'not assigned yet';
  const averageWorkHoursLabel = useMemo(() => {
    const minutes = attendanceRecords.reduce((total, record) => {
      const match = typeof record.workHours === 'string' ? record.workHours.match(/(\d+)h\s+(\d+)m/) : null;
      if (!match) {
        return total;
      }

      return total + (Number(match[1]) * 60) + Number(match[2]);
    }, 0);

    const countedDays = attendanceRecords.filter((record) => typeof record.workHours === 'string' && /\dh\s+\d+m/.test(record.workHours)).length;
    if (!countedDays) {
      return '0h 00m';
    }

    const averageMinutes = Math.round(minutes / countedDays);
    const hours = Math.floor(averageMinutes / 60);
    const mins = averageMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }, [attendanceRecords]);

  const onTimeArrivalLabel = useMemo(() => {
    const totalTracked = attendanceSummary.presentCount + attendanceSummary.halfDayCount;
    if (!totalTracked) {
      return '0%';
    }

    const onTimePercentage = Math.round((attendanceSummary.presentCount / totalTracked) * 1000) / 10;
    return `${onTimePercentage}%`;
  }, [attendanceSummary]);

  const weeklyBars = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const dayOffset = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - dayOffset);
    const normalizedWorkingDays = Array.isArray(employee?.working_days) && employee.working_days.length > 0
      ? employee.working_days
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return weekdayOrder
      .map((dayName, index) => ({ dayName, index }))
      .map(({ dayName, index }) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const record = attendanceRecords.find((item) => item.date === dateKey);
      const match = record?.workHours?.match(/(\d+)h\s+(\d+)m/);
      const workMinutes = match ? (Number(match[1]) * 60) + Number(match[2]) : 0;
      const isWorkingDay = normalizedWorkingDays.includes(dayName);
      const heightPercent = workMinutes ? Math.max(14, Math.min(100, Math.round((workMinutes / 540) * 100))) : isWorkingDay ? 18 : 12;

      return {
        label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }),
        workLabel: workMinutes ? `${Math.floor(workMinutes / 60)}h ${String(workMinutes % 60).padStart(2, '0')}m` : '0h 00m',
        heightPercent,
        hasData: Boolean(record && workMinutes),
        isWorkingDay,
      };
    });
  }, [attendanceRecords, employee?.working_days]);

  const attendanceActionLabel = useMemo(() => {
    return todayAction === 'check_out' ? 'Check Out' : 'Check In';
  }, [todayAction]);

  const handleAttendanceAction = async () => {
    if (isAttendanceUpdating) {
      return;
    }

    try {
      setIsAttendanceUpdating(true);
      const locationPayload = await captureAttendanceLocationPayload();
      const response = await fetch('/HRM/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        showFeedback({
          type: 'warning',
          title: 'Attendance Not Marked',
          message: result.error || 'Unable to update attendance right now.',
        });
        return;
      }

      setTodayAttendance(result.attendance || null);
      setTodayAction(result.action === 'checked_in' ? 'check_out' : 'check_in');
      window.dispatchEvent(new CustomEvent('hrm-attendance-updated'));

      if (result.warning) {
        showFeedback({
          type: 'warning',
          title: 'Attendance Saved with Fallback Location',
          message: result.warning,
        });
      }
    } catch {
      showFeedback({
        type: 'error',
        title: 'Attendance Not Updated',
        message: 'Unable to update attendance right now.',
      });
    } finally {
      setIsAttendanceUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 sm:space-y-8">
      {/* Welcome Hero Section */}
      <EmployeePageHeader
        icon="space_dashboard"
        title={`${greetingMeta.title}, ${displayName}`}
        description={`${greetingMeta.note} Your login ID is ${loginId}.`}
        action={(
          <div className="flex items-center gap-4 rounded-3xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-4 editorial-shadow">
            <span className="text-3xl leading-none">{greetingMeta.emoji}</span>
            <div>
              <p className="text-sm font-headline font-bold text-on-surface">{formattedFullDate}</p>
              <p className="text-xs text-on-surface-variant">{dayName}</p>
            </div>
          </div>
        )}
      />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Attendance Summary Card (Large) */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 editorial-shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-headline">Attendance Summary</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-full">This Week</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Avg. Work Hours</p>
                  <p className="text-xl font-bold font-headline">{attendanceSetupPending ? 'Setup Pending' : averageWorkHoursLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-tertiary-container/40 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">On-time Arrival</p>
                  <p className="text-xl font-bold font-headline">{attendanceSetupPending ? 'Setup Pending' : onTimeArrivalLabel}</p>
                </div>
              </div>
              {attendanceSetupPending && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Attendance tables are not created in the database yet, so live attendance summary is waiting for setup.
                </p>
              )}
            </div>
            
            <div className="flex-1 w-full border-t border-outline-variant/10 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="flex h-36 items-end justify-between gap-3">
                {weeklyBars.map((bar) => (
                  <div key={bar.dayName} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-semibold text-on-surface-variant">{bar.workLabel}</span>
                    <div className="flex h-28 w-full items-end justify-center">
                      <div
                        className={`${bar.hasData ? 'bg-violet-400 hover:bg-violet-500' : bar.isWorkingDay ? 'bg-violet-200/90' : 'bg-violet-100/80'} w-full max-w-[2.75rem] rounded-t-xl transition-colors`}
                        style={{ height: `${bar.heightPercent}%` }}
                        title={`${bar.dayName}: ${bar.workLabel}`}
                      />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${bar.isWorkingDay ? 'text-on-surface-variant' : 'text-violet-300'}`}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Review Cards (Empty State Placeholder) */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-[#F6ECFF] p-6 flex flex-col items-center justify-center text-center editorial-shadow">
          <div className="w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center mb-4 shadow-sm">
            <span className="material-symbols-outlined text-tertiary text-3xl">auto_awesome</span>
          </div>
          <h3 className="text-base font-bold font-headline mb-1 text-on-surface">{weeklyMotivation.title}</h3>
          <p className="text-xs text-on-tertiary-container leading-relaxed">{weeklyMotivation.body}</p>
          <div className="mt-6 text-xs font-bold uppercase tracking-widest text-tertiary">Take a small pause and keep going</div>
        </div>

        {/* Upcoming Holidays List */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-2xl p-6 editorial-shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-headline">Upcoming Holidays</h3>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors text-xl">more_horiz</button>
          </div>
          <div className="space-y-4">
            {cardHolidays.length === 0 && (
              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">
                No upcoming holidays have been added yet.
              </div>
            )}
            {cardHolidays.map((holiday) => {
              const dateInfo = getHolidayDateInfo(holiday.date);
              const weekday = parseDate(holiday.date).toLocaleDateString('en-GB', { weekday: 'short' });
              return (
                <div key={holiday.id} className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex flex-col items-center justify-center border border-outline-variant/15 group-hover:bg-primary/5 transition-colors">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">{dateInfo.month}</span>
                    <span className="text-base font-bold text-primary">{dateInfo.day}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface">{holiday.title}</p>
                    <p className="text-xs text-on-surface-variant">{weekday} • {formatHolidayTypeLabel(holiday.type)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button 
            onClick={openHolidayModal}
            className="w-full mt-6 py-2 bg-surface-container-low text-on-surface-variant rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors"
          >
            Full Calendar
          </button>
        </div>

        {/* Quick Action Cards - 2 Column with Split Left */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Left Column - Split into two stacked cards */}
          <div className="flex flex-col h-full min-h-65">
            {/* Request Leave Card */}
            <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-t-2xl text-on-primary flex flex-col justify-between flex-1 shadow-lg shadow-primary/20 group hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">flight_takeoff</span>
                  <h4 className="text-base font-bold font-headline">Request Leave</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab?.('leave')}
                  className="px-3 py-1.5 bg-surface-container-lowest/90 text-primary rounded-lg text-xs font-bold shadow-sm hover:scale-105 hover:bg-surface-container-lowest transition-all"
                >
                  Apply Now
                </button>
              </div>
              <p className="text-xs opacity-80 mt-1">Planning a getaway? Submit your leave application in just a few clicks.</p>
            </div>

            {/* Policy Manual Card - Matching the style */}
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-200/60 p-6 rounded-b-2xl text-on-surface flex flex-col justify-between flex-1 shadow-sm group hover:shadow-md hover:shadow-slate-500/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-slate-500">menu_book</span>
                  <h4 className="text-base font-bold font-headline text-slate-700">Policy Manual</h4>
                </div>
                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all">View</button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Access company policies, HR guidelines, and workplace rules.</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl text-on-surface flex flex-col h-full min-h-65 shadow-sm relative overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-5 right-5 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Live</span>
            </div>
            
            <div className="relative z-10 flex flex-1 flex-col">
              <div className="space-y-3 self-start text-left">
                <div className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-slate-400">calendar_today</span>
                  <p className="text-sm font-medium text-slate-600">
                    {formattedFullDate}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">{dayName}</span>
                  <span className="w-px h-3 bg-slate-300" />
                  <span className="inline-flex items-center rounded-md border border-violet-100 bg-violet-50 px-2.5 py-1">
                    <span className="text-[11px] font-bold text-violet-600 font-mono">{loginId}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-end justify-center gap-1 text-center">
                  <RollingTimeGroup value={timeString.hours} sizeClass="text-5xl md:text-6xl font-semibold tracking-tight" />
                  <span className="mb-1 font-mono text-4xl md:text-5xl font-semibold text-violet-300">:</span>
                  <RollingTimeGroup value={timeString.minutes} sizeClass="text-5xl md:text-6xl font-semibold tracking-tight" />
                  <span className="mb-0.5 ml-2 font-mono text-2xl md:text-3xl font-medium text-violet-300">:</span>
                  <RollingTimeGroup value={timeString.seconds} sizeClass="text-2xl md:text-3xl font-medium tracking-tight" muted />
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="relative z-10 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button 
                onClick={() => setIsSwipesModalOpen(true)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-violet-100 rounded-xl text-xs font-semibold text-violet-700 hover:border-violet-200 hover:bg-violet-50/70 hover:shadow-sm transition-all duration-200"
              >
                <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">badge</span>
                View Swipes
              </button>
              <button
                onClick={handleAttendanceAction}
                disabled={isAttendanceUpdating}
                className={attendanceButtonClassName}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    {attendanceActionLabel === 'Check Out' ? 'logout' : 'login'}
                  </span>
                  {isAttendanceUpdating ? 'Updating...' : attendanceActionLabel}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSwipesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-surface w-[calc(100%-2rem)] max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 scale-100 transition-transform">
            <div className="bg-surface-container-lowest px-6 py-4 flex items-center justify-between border-b border-outline-variant/10">
              <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
                Swipes
              </h3>
              <button 
                onClick={() => setIsSwipesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 bg-surface">
              <div className="flex flex-wrap gap-x-8 gap-y-4 items-center text-sm mb-6 text-on-surface-variant">
                <div>Date <span className="font-semibold text-on-surface ml-1">{formattedShortDate}</span></div>
                <div>Shift Time <span className="font-semibold text-on-surface ml-1">10:00 to 19:00</span></div>
                <div>Employee ID <span className="font-semibold text-on-surface ml-1">{loginId}</span></div>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-outline-variant/20">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#f5ecff] text-on-surface-variant font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-outline-variant/10">Swipe Time</th>
                      <th className="px-4 py-3 border-b border-outline-variant/10">In/Out</th>
                      <th className="px-4 py-3 border-b border-outline-variant/10">Door/Address</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/10">
                    {todaySwipes.length > 0 ? todaySwipes.map((swipe) => (
                      <tr key={swipe.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-on-surface">{swipe.swipeTime}</td>
                        <td className="px-4 py-3 font-semibold text-on-surface">{swipe.swipeType}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{swipe.doorAddress}</td>
                      </tr>
                    )) : (
                      <tr className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-on-surface opacity-30">--:--:--</td>
                        <td className="px-4 py-3 font-semibold text-on-surface-variant opacity-30">-</td>
                        <td className="px-4 py-3 text-on-surface-variant opacity-30">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Calendar Modal */}
      {isHolidayModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={(e) => e.target === e.currentTarget && setIsHolidayModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="holiday-modal-title"
        >
          <div id="holiday-modal-title" className="sr-only">Holiday Calendar</div>
          <div className="bg-surface w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 scale-100 transition-transform flex flex-col">
            {/* Modal Header */}
            <div className="bg-surface-container-lowest px-6 py-4 flex items-center justify-between border-b border-outline-variant/10 shrink-0">
              <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Holiday Calendar
              </h3>
              <button 
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex flex-col lg:flex-row overflow-hidden">
              {/* Calendar Grid */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={goToPrevMonth}
                    className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <h4 className="text-xl font-bold font-headline text-on-surface">{monthData.monthName}</h4>
                  <button 
                    onClick={goToNextMonth}
                    className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-on-surface-variant py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {monthData.days.map((dayInfo, idx) => {
                    if (!dayInfo.isCurrentMonth || !dayInfo.day) {
                      return <div key={idx} className="h-14 rounded-xl" aria-hidden="true"></div>;
                    }

                    const isSelected = selectedDate?.date === dayInfo.date;
                    const baseClasses = 'relative flex h-14 flex-col justify-between rounded-xl px-3 py-2 text-left transition-all';
                    const stateClasses = isSelected
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : dayInfo.holiday
                        ? 'bg-amber-50 text-slate-900 ring-1 ring-amber-200 hover:bg-amber-100'
                        : dayInfo.isWeekend
                          ? 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                          : 'bg-transparent text-on-surface hover:bg-surface-container-low';
                    const interactivityClasses = dayInfo.holiday ? 'cursor-pointer' : 'cursor-default';

                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`${baseClasses} ${stateClasses} ${interactivityClasses} ${dayInfo.isToday ? 'ring-1 ring-slate-300' : ''}`}
                        disabled={!dayInfo.holiday}
                        onClick={() => handleDateClick(dayInfo)}
                      >
                        <span className={`relative z-10 block text-base font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {dayInfo.day}
                        </span>
                        {dayInfo.holiday && (
                          <>
                            <span className={`absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`}></span>
                            <span className={`relative z-10 mt-2 inline-flex max-w-full self-start truncate rounded-full px-2 py-1 text-[10px] font-semibold ${isSelected ? 'bg-white/15 text-white' : 'bg-white text-amber-700 shadow-sm'}`}>
                              Holiday
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-outline-variant/10 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-surface-container-low ring-1 ring-slate-300"></span>
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-900"></span>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
              
              {/* Holiday Detail Panel */}
              <div className="w-full lg:w-72 bg-surface-container-lowest p-6 border-t lg:border-t-0 lg:border-l border-outline-variant/10 shrink-0">
                <h5 className="text-sm font-bold font-headline text-on-surface-variant uppercase tracking-wide mb-4">
                  Selected Date
                </h5>
                {selectedDate ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-surface-container flex flex-col items-center justify-center border border-outline-variant/20">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                          {parseDate(selectedDate.date).toLocaleDateString('en-GB', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-on-surface">
                          {parseDate(selectedDate.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{selectedDate.title}</p>
                        <p className="text-xs text-on-surface-variant">
                          {parseDate(selectedDate.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/10">
                      <p className="text-xs text-on-surface-variant mb-1">Holiday</p>
                      <span className="inline-flex px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold border border-outline-variant/20">
                        {selectedDate.title}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/10">
                      <p className="text-xs text-on-surface-variant mb-2">Holiday Type</p>
                      <p className="text-sm font-medium text-on-surface">{formatHolidayTypeLabel(selectedDate.type)}</p>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/10">
                      <p className="text-xs text-on-surface-variant mb-2">About This Holiday</p>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        {selectedDate.title} is marked in the holiday calendar, so attendance cannot be marked on this date.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2 opacity-50">event</span>
                    <p className="text-sm text-on-surface-variant">Select a holiday from the calendar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
