import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { resolveAuthenticatedUserContext } from '@/utils/auth/context'
import { isEmployeeAccessDisabledNow } from '@/utils/hrm-employment'
import { supabasePublicKey, supabaseUrl } from '@/utils/supabase/config'

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  const isTaskAdminPath = pathname.startsWith('/Taskmanager/admin')
  const isTaskDashboardPath = pathname.startsWith('/Taskmanager/dashboard')
  const isHRMAdminPath = pathname.startsWith('/HRM/hrm/admin')
  const isHRMEmployeePath = pathname.startsWith('/HRM/hrm') && !isHRMAdminPath
  const isEmployeeIntakePath = pathname.startsWith('/employee-intake')
  const isAuditingPath = pathname.startsWith('/Auditing/auditing')
  const isSuperAdminPath = pathname.startsWith('/superadmin')
  const isOtherModulesPath = pathname.startsWith('/other-modules')
  const isProtectedPath =
    isTaskAdminPath ||
    isTaskDashboardPath ||
    isHRMAdminPath ||
    isHRMEmployeePath ||
    isEmployeeIntakePath ||
    isAuditingPath ||
    isSuperAdminPath ||
    isOtherModulesPath

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const authContext = await resolveAuthenticatedUserContext(supabase, user)

    if (!authContext) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }

    if (isSuperAdminPath && !authContext.isSuperAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }

    if ((isHRMAdminPath || isEmployeeIntakePath) && !authContext.isHrAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }

    if (isHRMEmployeePath && authContext.accountType !== 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }

    if (authContext.accountType === 'employee' && isEmployeeAccessDisabledNow(authContext.employee)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isTaskAdminPath && authContext.accountType === 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }

    if (isTaskDashboardPath && authContext.accountType !== 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = authContext.destination
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/Taskmanager/admin/:path*', '/Taskmanager/dashboard/:path*', '/HRM/hrm/:path*', '/Auditing/auditing/:path*', '/superadmin/:path*', '/employee-intake/:path*', '/other-modules/:path*', '/login'],
}
