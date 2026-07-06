import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getCurrentDateInTimeZone } from '@/utils/attendance';

// Force dynamic execution to bypass any caching of attendance reports
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);

  if (!authContext || !authContext.employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const managerEmployeeId = authContext.employee.id;
  const todayStr = getCurrentDateInTimeZone(); // e.g. '2026-07-06'

  try {
    // 1. Fetch direct reportees from hrm_employees using adminClient to bypass RLS
    const { data: reportees, error: reporteesError } = await adminClient
      .from('hrm_employees')
      .select('id, name, email, profile_picture_url, role, department_id')
      .eq('reporting_manager_id', managerEmployeeId)
      .is('access_disabled_at', null);

    if (reporteesError) {
      throw new Error(reporteesError.message);
    }

    if (!reportees || reportees.length === 0) {
      return NextResponse.json({ isManager: false, reportees: [] });
    }

    const reporteeIds = reportees.map(r => r.id);

    // 2. Fetch today's attendance summaries using adminClient to bypass RLS
    const { data: attendanceRecords, error: attendanceError } = await adminClient
      .from('hrm_attendance')
      .select('*')
      .in('employee_id', reporteeIds)
      .eq('date', todayStr);

    if (attendanceError) {
      throw new Error(attendanceError.message);
    }

    // 3. Fetch today's swipes using adminClient to bypass RLS
    const { data: swipes, error: swipesError } = await adminClient
      .from('hrm_attendance_swipes')
      .select('*')
      .in('employee_id', reporteeIds)
      .eq('swipe_date', todayStr)
      .order('swipe_time', { ascending: true });

    if (swipesError) {
      throw new Error(swipesError.message);
    }

    // Combine data
    const reporteesAttendance = reportees.map(reportee => {
      const attendance = attendanceRecords.find(a => a.employee_id === reportee.id);
      const reporteeSwipes = swipes.filter(s => s.employee_id === reportee.id);

      // Determine status:
      // If it is past 11:30 AM and they have not checked in, mark as "Absent"
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      const isLateCheckInThresholdPassed = currentMinutes >= (11 * 60 + 30); // 11:30 AM
      const hasCheckedIn = !!attendance?.check_in;

      let calculatedStatus = 'Absent';

      if (hasCheckedIn) {
        if (attendance.status === 'present') {
          calculatedStatus = 'Present';
        } else if (attendance.status === 'halfday' || attendance.status === 'half_day') {
          calculatedStatus = 'Half Day';
        } else {
          calculatedStatus = 'Present';
        }
      } else {
        if (isLateCheckInThresholdPassed) {
          calculatedStatus = 'Absent';
        } else {
          calculatedStatus = 'Not Checked In';
        }
      }

      // Format role for frontend UI
      let formattedRole = 'Employee';
      if (reportee.role && reportee.role !== 'employee') {
        formattedRole = reportee.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      return {
        id: reportee.id,
        name: reportee.name,
        email: reportee.email,
        avatar_url: reportee.profile_picture_url,
        job_title: formattedRole,
        status: calculatedStatus,
        checkIn: attendance?.check_in || null,
        checkOut: attendance?.check_out || null,
        workHours: attendance?.work_hours_minutes || 0,
        swipes: reporteeSwipes.map(s => ({
          id: s.id,
          time: s.swipe_time,
          type: s.swipe_type,
        })),
      };
    });

    return NextResponse.json({ isManager: true, reportees: reporteesAttendance });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
