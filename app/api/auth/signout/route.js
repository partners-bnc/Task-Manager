import { createClient } from '@/utils/supabase/server'
import { adminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const employeeSessionToken = request.cookies.get('employee_session')?.value

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  if (employeeSessionToken) {
    await adminClient
      .from('employee_sessions')
      .delete()
      .eq('token', employeeSessionToken)
  }

  const response = NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  })

  response.cookies.set({
    name: 'employee_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
