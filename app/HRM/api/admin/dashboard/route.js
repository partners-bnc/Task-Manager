import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getHrAdminDashboardData } from '@/utils/hr-admins';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

function getUpcomingBirthdays(employees = []) {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return employees
    .filter((employee) => employee.date_of_birth)
    .map((employee) => {
      const birthDate = new Date(`${employee.date_of_birth}T00:00:00`);
      const nextBirthday = new Date(todayMidnight.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      if (nextBirthday < todayMidnight) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }

      return {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        date_of_birth: employee.date_of_birth,
        profile_picture_url: employee.profile_picture_url,
        daysUntilBirthday: Math.ceil((nextBirthday.getTime() - todayMidnight.getTime()) / 86400000),
      };
    })
    .sort((left, right) => left.daysUntilBirthday - right.daysUntilBirthday)
    .slice(0, 5);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    if (!authContext?.isHrAdmin || !authContext.hrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { hrAdmins, employees, departments, designations } = await getHrAdminDashboardData();
    const recentEmployees = employees.slice(0, 6);

    return NextResponse.json({
      success: true,
      admin: {
        name: authContext.hrAdmin.name,
        email: authContext.hrAdmin.email,
        department: authContext.hrAdmin.department?.name || '',
        designation: authContext.hrAdmin.designation?.title || '',
      },
      metrics: {
        hrAdminCount: hrAdmins.length,
        employeeCount: employees.length,
        activeEmployeeCount: employees.filter((employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'active').length,
        onLeaveEmployeeCount: employees.filter((employee) => deriveEmploymentFields(employee).currentStage === 'on_leave').length,
        departmentCount: departments.length,
        designationCount: designations.length,
      },
      recentEmployees,
      recentHrAdmins: hrAdmins.slice(0, 5),
      upcomingBirthdays: getUpcomingBirthdays(employees),
    });
  } catch (error) {
    console.error('Error fetching HR admin dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch HR admin dashboard' }, { status: 500 });
  }
}
