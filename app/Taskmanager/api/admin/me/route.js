import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAccountTypeLabel } from '@/utils/auth/roles';
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
    if (!authContext?.isHrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (authContext.isSuperAdmin && authContext.superAdmin) {
      return NextResponse.json({
        success: true,
        admin: {
          id: user.id,
          srNo: 'SA-1',
          name: authContext.superAdmin.name,
          email: authContext.superAdmin.email,
          phone: '',
          department: 'Executive',
          designation: 'Super Admin',
          status: authContext.superAdmin.status || 'Active',
          role: 'Super Admin',
          avatar: user.user_metadata?.avatar_url || '',
        },
      });
    }

    if (!authContext.hrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        srNo: authContext.hrAdmin.sr_no,
        name: authContext.hrAdmin.name,
        email: authContext.hrAdmin.email,
        phone: authContext.hrAdmin.phone || '',
        department: authContext.hrAdmin.department?.name || '',
        designation: authContext.hrAdmin.designation?.title || '',
        status: authContext.hrAdmin.status || 'Active',
        role: getAccountTypeLabel('hr_admin'),
        avatar: user.user_metadata?.avatar_url || '',
      },
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Failed to fetch admin profile' }, { status: 500 });
  }
}

export async function PATCH(request) {
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
    if (!authContext?.isHrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const fullName = body?.name !== undefined ? String(body.name).trim() : undefined;
    const password = body?.password !== undefined ? String(body.password) : undefined;

    if (fullName === undefined && password === undefined) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    if (fullName !== undefined) {
      const updates = [
        supabase
          .from('hrm_profiles')
          .update({ full_name: fullName || null })
          .eq('id', user.id),
      ];

      if (authContext.isSuperAdmin && authContext.superAdmin) {
        updates.push(
          supabase
            .from('super_admins')
            .update({ name: fullName || null, updated_at: new Date().toISOString() })
            .eq('auth_user_id', user.id)
        );
      } else if (authContext.hrAdmin) {
        updates.push(
          supabase
            .from('hr_admins')
            .update({ name: fullName || null, updated_at: new Date().toISOString() })
            .eq('auth_user_id', user.id)
        );
      }

      const [updateProfileResult, secondaryUpdateResult] = await Promise.all(updates);

      if (updateProfileResult.error) {
        return NextResponse.json({ error: updateProfileResult.error.message }, { status: 500 });
      }

      if (secondaryUpdateResult?.error) {
        return NextResponse.json({ error: secondaryUpdateResult.error.message }, { status: 500 });
      }
    }

    if (password !== undefined) {
      if (password.length > 0 && password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }

      if (password.length > 0) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) {
          return NextResponse.json({ error: passwordError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Failed to update admin profile' }, { status: 500 });
  }
}

