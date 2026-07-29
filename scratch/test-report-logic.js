import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReportLogic(targetDateStr) {
  const targetDate = new Date(targetDateStr);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = daysOfWeek[targetDate.getDay()];

  console.log(`\n==================================================`);
  console.log(`Testing Daily Report Logic for date: ${targetDateStr} (${dayName})`);
  console.log(`==================================================`);

  // 1. Fetch active employees
  const { data: employees, error: empError } = await supabase
    .from('hrm_employees')
    .select('id, employee_id, name, email, working_days, second_saturday_off')
    .eq('employment_lifecycle_status', 'active');

  if (empError) {
    console.error("Error fetching employees:", empError);
    return;
  }
  console.log(`Total Active Employees: ${employees.length}`);

  // 2. Fetch holidays
  const { data: holidays, error: holError } = await supabase
    .from('hrm_holidays')
    .select('id, date, name')
    .eq('date', targetDateStr);

  if (holError) {
    console.error("Error fetching holidays:", holError);
    return;
  }
  const isHoliday = holidays.length > 0;

  // 3. Fetch leaves
  const { data: leaves, error: leaveError } = await supabase
    .from('hrm_leave_requests')
    .select('id, employee_id, status, start_date, end_date')
    .in('status', ['approved', 'pending'])
    .lte('start_date', targetDateStr)
    .gte('end_date', targetDateStr);

  if (leaveError) {
    console.error("Error fetching leaves:", leaveError);
    return;
  }

  const employeeLeaves = {};
  leaves.forEach(l => {
    if (!employeeLeaves[l.employee_id]) {
      employeeLeaves[l.employee_id] = [];
    }
    employeeLeaves[l.employee_id].push(l);
  });

  // 4. Fetch daily work logs
  const { data: logs, error: logError } = await supabase
    .from('hrm_daily_work_logs')
    .select('employee_id')
    .eq('log_date', targetDateStr);

  if (logError) {
    console.error("Error fetching work logs:", logError);
    return;
  }
  const submittedLogIds = new Set(logs.map(l => l.employee_id));

  // 5. Fetch check-ins
  const { data: attendance, error: attError } = await supabase
    .from('hrm_attendance')
    .select('employee_id, check_in, status')
    .eq('date', targetDateStr)
    .not('check_in', 'is', null)
    .in('status', ['present', 'late', 'halfday']);

  if (attError) {
    console.error("Error fetching attendance:", attError);
    return;
  }
  const checkedInIds = new Set(attendance.map(a => a.employee_id));

  const isSecondSaturday = (date) => {
    if (date.getDay() !== 6) return false;
    const dateNum = date.getDate();
    return dateNum >= 8 && dateNum <= 14;
  };

  // Daily work logs
  const workLogCandidates = [];
  employees.forEach(emp => {
    const wDays = Array.isArray(emp.working_days) ? emp.working_days : [];
    const isEmpWorkingDay = wDays.includes(dayName);
    if (!isEmpWorkingDay) return;
    if (emp.second_saturday_off && isSecondSaturday(targetDate)) return;
    if (isHoliday) return;
    if (submittedLogIds.has(emp.id)) return;

    let status = 'Missing Log';
    const empLvs = employeeLeaves[emp.id] || [];
    const approvedLeave = empLvs.find(l => l.status === 'approved');
    const pendingLeave = empLvs.find(l => l.status === 'pending');

    if (approvedLeave) status = 'On Leave (Approved)';
    else if (pendingLeave) status = 'On Leave (Pending)';

    workLogCandidates.push({ employee_id: emp.employee_id, name: emp.name, email: emp.email, status });
  });

  console.log(`Found ${workLogCandidates.length} candidates missing daily work logs:`);
  console.table(workLogCandidates);

  // Daily checkins
  const attendanceCandidates = [];
  employees.forEach(emp => {
    const wDays = Array.isArray(emp.working_days) ? emp.working_days : [];
    const isEmpWorkingDay = wDays.includes(dayName);
    if (!isEmpWorkingDay) return;
    if (emp.second_saturday_off && isSecondSaturday(targetDate)) return;
    if (isHoliday) return;
    if (checkedInIds.has(emp.id)) return;

    let status = 'Missing Check-in';
    const empLvs = employeeLeaves[emp.id] || [];
    const approvedLeave = empLvs.find(l => l.status === 'approved');
    const pendingLeave = empLvs.find(l => l.status === 'pending');

    if (approvedLeave) status = 'On Leave (Approved)';
    else if (pendingLeave) status = 'On Leave (Pending)';

    attendanceCandidates.push({ employee_id: emp.employee_id, name: emp.name, email: emp.email, status });
  });

  console.log(`Found ${attendanceCandidates.length} candidates missing check-in:`);
  console.table(attendanceCandidates);
}

async function testWeeklyReportLogic(sundayDateStr) {
  const sundayDate = new Date(sundayDateStr);
  console.log(`\n==================================================`);
  console.log(`Testing Weekly Consolidated Report for Sunday: ${sundayDateStr}`);
  console.log(`==================================================`);

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Calculate Monday to Saturday dates
  const weekDates = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(sundayDate);
    d.setDate(sundayDate.getDate() - i);
    weekDates.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: daysOfWeek[d.getDay()],
      dateObj: d
    });
  }
  
  const weekStartStr = weekDates[0].dateStr;
  const weekEndStr = weekDates[5].dateStr;
  console.log(`Week range: ${weekStartStr} (Monday) to ${weekEndStr} (Saturday)`);

  // 1. Fetch active employees
  const { data: employees, error: empError } = await supabase
    .from('hrm_employees')
    .select('id, employee_id, name, email, working_days, second_saturday_off')
    .eq('employment_lifecycle_status', 'active');

  if (empError) {
    console.error("Error fetching employees:", empError);
    return;
  }

  // Fetch leave types for name mapping
  const { data: leaveTypes, error: ltError } = await supabase
    .from('hrm_leave_types')
    .select('id, name');
  if (ltError) {
    console.error("Error fetching leave types:", ltError);
    return;
  }
  const leaveTypeMap = {};
  (leaveTypes || []).forEach(lt => { leaveTypeMap[lt.id] = lt.name; });

  // 2. Fetch leaves active during the week
  const { data: leaves, error: leaveError } = await supabase
    .from('hrm_leave_requests')
    .select('id, employee_id, leave_type_id, status, start_date, end_date, duration_days')
    .in('status', ['approved', 'pending'])
    .lte('start_date', weekEndStr)
    .gte('end_date', weekStartStr);

  if (leaveError) {
    console.error("Error fetching leaves:", leaveError);
    return;
  }

  // Map leaves by employee for easy day-by-day lookup
  const employeeLeaves = {};
  leaves.forEach(l => {
    if (!employeeLeaves[l.employee_id]) {
      employeeLeaves[l.employee_id] = [];
    }
    employeeLeaves[l.employee_id].push(l);
  });

  // Map employee name for formatting
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  const formattedLeaves = leaves.map(l => {
    const emp = empMap[l.employee_id] || { employee_id: 'N/A', name: 'Unknown' };
    return {
      employee_id: emp.employee_id,
      name: emp.name,
      leave_type: leaveTypeMap[l.leave_type_id] || 'Leave',
      status: l.status,
      start_date: l.start_date,
      end_date: l.end_date,
      duration_days: l.duration_days
    };
  });

  console.log(`\n--- 1. Leaves Applied during the Week ---`);
  console.table(formattedLeaves);

  // Helper to determine second Saturday
  const isSecondSaturday = (date) => {
    if (date.getDay() !== 6) return false;
    const dateNum = date.getDate();
    return dateNum >= 8 && dateNum <= 14;
  };

  // 3. Process day-by-day attendance and logs
  const missingAttendanceMap = {};
  const missingLogsMap = {};

  for (const wd of weekDates) {
    const { dateStr, dayName, dateObj } = wd;

    // Fetch holidays on this day
    const { data: holidays } = await supabase
      .from('hrm_holidays')
      .select('id')
      .eq('date', dateStr);
    const isHoliday = holidays && holidays.length > 0;

    // Fetch daily logs on this day
    const { data: logs } = await supabase
      .from('hrm_daily_work_logs')
      .select('employee_id')
      .eq('log_date', dateStr);
    const logSubmittedIds = new Set((logs || []).map(l => l.employee_id));

    // Fetch attendance on this day
    const { data: attendance } = await supabase
      .from('hrm_attendance')
      .select('employee_id')
      .eq('date', dateStr)
      .not('check_in', 'is', null)
      .in('status', ['present', 'late', 'halfday']);
    const checkedInIds = new Set((attendance || []).map(a => a.employee_id));

    employees.forEach(emp => {
      const wDays = Array.isArray(emp.working_days) ? emp.working_days : [];
      const isEmpWorkingDay = wDays.includes(dayName);

      if (!isEmpWorkingDay) return;
      if (emp.second_saturday_off && isSecondSaturday(dateObj)) return;
      if (isHoliday) return;

      // Determine leave status for this day
      let leaveStatus = null;
      const empLvs = employeeLeaves[emp.id] || [];
      const activeLeave = empLvs.find(l => dateStr >= l.start_date && dateStr <= l.end_date);
      if (activeLeave) {
        leaveStatus = activeLeave.status === 'approved' ? 'On Leave (Approved)' : 'On Leave (Pending)';
      }

      // Check attendance
      if (!checkedInIds.has(emp.id)) {
        if (!missingAttendanceMap[emp.id]) {
          missingAttendanceMap[emp.id] = {
            employee_id: emp.employee_id,
            name: emp.name,
            email: emp.email,
            dates: []
          };
        }
        missingAttendanceMap[emp.id].dates.push({
          date: dateStr,
          status: leaveStatus || 'Missing Check-in'
        });
      }

      // Check work logs
      if (!logSubmittedIds.has(emp.id)) {
        if (!missingLogsMap[emp.id]) {
          missingLogsMap[emp.id] = {
            employee_id: emp.employee_id,
            name: emp.name,
            email: emp.email,
            dates: []
          };
        }
        missingLogsMap[emp.id].dates.push({
          date: dateStr,
          status: leaveStatus || 'Missing Log'
        });
      }
    });
  }

  console.log(`\n--- 2. Employees Missing Check-in (Grouped) ---`);
  const attList = Object.values(missingAttendanceMap);
  attList.forEach(item => {
    console.log(`- [${item.employee_id}] ${item.name} (${item.email})`);
    console.log(`  Dates: ` + item.dates.map(d => `${d.date} (${d.status})`).join(', '));
  });

  console.log(`\n--- 3. Employees Missing Daily Work Logs (Grouped) ---`);
  const logList = Object.values(missingLogsMap);
  logList.forEach(item => {
    console.log(`- [${item.employee_id}] ${item.name} (${item.email})`);
    console.log(`  Dates: ` + item.dates.map(d => `${d.date} (${d.status})`).join(', '));
  });
}

const action = process.argv[2] || 'daily';
const dateStr = process.argv[3] || '2026-07-28';

if (action === 'weekly') {
  // Pass a Sunday date to generate report for preceding Monday-Saturday
  // e.g. Sunday July 26, 2026
  testWeeklyReportLogic(dateStr).catch(console.error);
} else {
  testReportLogic(dateStr).catch(console.error);
}
