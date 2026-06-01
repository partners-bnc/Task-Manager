import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

function getTaskManagerHref(accountType) {
  if (accountType === 'employee') {
    return '/Taskmanager/dashboard';
  }

  if (accountType === 'hr_admin' || accountType === 'super_admin' || accountType === 'support') {
    return '/Taskmanager/admin';
  }

  return '/login';
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        accountType: null,
        destination: '/login',
        taskManagerHref: '/login',
        workspaceHref: '/login',
        modules: {
          taskManager: { enabled: false, href: null },
          hrm: { enabled: false, href: null },
          auditing: { enabled: false, href: null },
          crm: { enabled: false, href: null },
        },
      });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);

    if (!authContext) {
      return NextResponse.json({
        authenticated: true,
        accountType: null,
        destination: '/login',
        taskManagerHref: '/login',
        workspaceHref: '/login',
        modules: {
          taskManager: { enabled: false, href: null },
          hrm: { enabled: false, href: null },
          auditing: { enabled: false, href: null },
          crm: { enabled: false, href: null },
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      accountType: authContext.accountType,
      destination: authContext.destination,
      taskManagerHref:
        authContext.moduleAccess?.taskManager?.href || getTaskManagerHref(authContext.accountType),
      workspaceHref: authContext.destination,
      modules: authContext.moduleAccess || {
        taskManager: { enabled: false, href: null },
        hrm: { enabled: false, href: null },
        auditing: { enabled: false, href: null },
        crm: { enabled: false, href: null },
      },
      user: authContext.user,
    });
  } catch (error) {
    console.error('Error resolving auth context:', error);

    return NextResponse.json(
      {
        authenticated: false,
        accountType: null,
        destination: '/login',
        taskManagerHref: '/login',
        workspaceHref: '/login',
        modules: {
          taskManager: { enabled: false, href: null },
          hrm: { enabled: false, href: null },
          auditing: { enabled: false, href: null },
          crm: { enabled: false, href: null },
        },
        error: error.message || 'Failed to resolve auth context',
      },
      { status: 500 }
    );
  }
}
