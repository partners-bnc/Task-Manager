const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

const ATTENDANCE_POLICY = {
  shiftStart: '09:00',
  shiftEnd: '17:30',
  presentMinutes: 270, // 4.5 hours
};

function getLocalMinutesFromTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  // Convert to Asia/Kolkata minutes from midnight
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function classifyAttendanceStatus({ checkInMinutes, checkOutMinutes, workHoursMinutes, hasOpenSession = false }) {
  if (checkInMinutes === null) {
    return 'absent';
  }

  if (hasOpenSession || checkOutMinutes === null) {
    return 'halfday';
  }

  return workHoursMinutes >= ATTENDANCE_POLICY.presentMinutes ? 'present' : 'halfday';
}

function summarizeAttendanceFromSwipes(swipes = []) {
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

async function run() {
  try {
    const employeeId = '4404d98d-67cb-405b-bcc9-0e7a37f51f44'; // Rohan (E106)
    const date = '2026-07-17';

    console.log(`Checking swipes for Rohan on ${date}...`);
    const { data: swipes, error } = await supabase
      .from('hrm_attendance_swipes')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('swipe_date', date)
      .order('swipe_time', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    console.log("Swipes found in DB:", JSON.stringify(swipes, null, 2));

    const summary = summarizeAttendanceFromSwipes(swipes || []);
    console.log("Computed summary:", JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
