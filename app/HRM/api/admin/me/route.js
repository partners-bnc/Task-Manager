import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

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

    return NextResponse.json({
      success: true,
      admin: {
        id: authContext.hrAdmin.id,
        authUserId: authContext.userId,
        srNo: authContext.hrAdmin.sr_no,
        name: authContext.hrAdmin.name,
        email: authContext.hrAdmin.email,
        phone: authContext.hrAdmin.phone || '',
        department: authContext.hrAdmin.department?.name || '',
        designation: authContext.hrAdmin.designation?.title || '',
        status: authContext.hrAdmin.status || 'Active',
        avatar: authContext.user.avatarUrl || '',
      },
    });
  } catch (error) {
    console.error('Error fetching HR admin profile:', error);
    return NextResponse.json({ error: 'Failed to fetch HR admin profile' }, { status: 500 });
  }
}
