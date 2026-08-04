const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { listDatesInRange, isEmployeeScheduledOff } = require('../utils/attendance.js');

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

function buildEligibleDay(date, attendanceRow, hasHalfDayLeave = false) {
  if (!attendanceRow) {
    return { date, kind: 'gap', label: 'Absent', hasHalfDayLeave };
  }
  const status = String(attendanceRow.status || attendanceRow.attendance_status || '').trim().toLowerCase();
  if (status === 'halfday' || status === 'half_day') {
    return { date, kind: 'gap', label: 'Half Day', hasHalfDayLeave };
  }
  if (status === 'absent') {
    return { date, kind: 'gap', label: 'Absent', hasHalfDayLeave };
  }
  return null;
}

async function run() {
  try {
    console.log("=== Testing API Logic for Gourav Bansal (June 2026) ===");

    const employeeId = '988287f1-9b32-4882-90d7-b67f18c91bb1'; // Gourav
    const start = '2026-06-01';
    const end = '2026-06-30';
    const today = '2026-08-03';

    const [employeeRowResult, attendanceResult, regularizationResult] = await Promise.all([
      supabase.from('hrm_employees').select('*').eq('id', employeeId).single(),
      supabase.from('hrm_attendance').select('*').eq('employee_id', employeeId).gte('date', start).lte('date', end),
      supabase.from('hrm_regularization_requests').select('*').eq('employee_id', employeeId).gte('date', start).lte('date', end)
    ]);

    const employeeRow = employeeRowResult.data;
    const attendanceRows = attendanceResult.data;
    const regularizationRows = regularizationResult.data;

    const employeeSchedule = {
      workingDays: employeeRow.working_days || [],
      secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
    };

    const attendanceMap = new Map((attendanceRows || []).map((row) => [row.date, row]));
    
    // Exact updated filter logic:
    const resolvedDates = new Set(
      (regularizationRows || [])
        .filter((row) => {
          const status = String(row.status || row.request_status).toLowerCase();
          return status === 'pending' || status === 'approved';
        })
        .map((row) => row.date)
    );

    console.log("Resolved (Approved/Pending) dates:", [...resolvedDates]);

    const eligibleDays = [];
    for (const date of listDatesInRange(start, end)) {
      if (date > today || resolvedDates.has(date) || isEmployeeScheduledOff(date, employeeSchedule)) {
        continue;
      }

      const day = buildEligibleDay(date, attendanceMap.get(date) || null, false);
      if (day) {
        eligibleDays.push(day);
      }
    }

    console.log("Eligible Days count:", eligibleDays.length);
    console.log("Eligible Days:", eligibleDays);

    const pending = [];
    const history = [];
    for (const row of regularizationRows || []) {
      if (String(row.status || '').toLowerCase() === 'pending') {
        pending.push(row);
      } else {
        history.push(row);
      }
    }

    console.log("Pending requests count:", pending.length);
    console.log("History requests count:", history.length);
    console.log("History:", history.map(h => ({ date: h.date, status: h.status })));

  } catch (err) {
    console.error(err);
  }
}

run();
