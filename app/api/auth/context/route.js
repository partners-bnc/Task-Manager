import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

function getTaskManagerHref(accountType) {
  if (accountType === 'employee') {
    return '/Taskmanager/dashboard';
  }

  if (accountType === 'hr_admin' || accountType === 'super_admin') {
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
        taskManagerHref: '/login',
      });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);

    if (!authContext) {
      return NextResponse.json({
        authenticated: true,
        accountType: null,
        taskManagerHref: '/login',
      });
    }

    return NextResponse.json({
      authenticated: true,
      accountType: authContext.accountType,
      taskManagerHref: getTaskManagerHref(authContext.accountType),
      user: authContext.user,
    });
  } catch (error) {
    console.error('Error resolving auth context:', error);

    return NextResponse.json(
      {
        authenticated: false,
        accountType: null,
        taskManagerHref: '/login',
        error: error.message || 'Failed to resolve auth context',
      },
      { status: 500 }
    );
  }
}
