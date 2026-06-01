import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
    if (!authContext || authContext.accountType === 'employee') {
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
          designation: authContext.superAdmin.designation || 'Super Admin',
          status: authContext.superAdmin.status || 'Active',
          role: authContext.superAdmin.designation || 'Super Admin',
          accountRole: 'Super Admin',
          avatar: authContext.superAdmin.profile_picture_url || user.user_metadata?.avatar_url || '',
        },
      });
    }

    if (!authContext.hrAdmin) {
      if (authContext.accountType === 'support' && authContext.support) {
        return NextResponse.json({
          success: true,
          admin: {
            id: user.id,
            srNo: 'SUP-1',
            name: authContext.support.name,
            email: authContext.support.email,
            phone: '',
            department: 'Support',
            designation: authContext.support.designation_ref?.title || authContext.support.designation || 'IT Support',
            status: authContext.support.status || 'Active',
            role: getAccountTypeLabel('support'),
            accountRole: 'Support',
            avatar: authContext.support.profile_picture_url || user.user_metadata?.avatar_url || '',
          },
        });
      }
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
        designation: authContext.hrAdmin.designation_ref?.title || authContext.hrAdmin.designation?.title || '',
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
    if (!authContext || authContext.accountType === 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const fullName = body?.name !== undefined ? String(body.name).trim() : undefined;
    const designation = body?.designation !== undefined ? String(body.designation).trim() : undefined;
    const password = body?.password !== undefined ? String(body.password) : undefined;

    if (fullName === undefined && designation === undefined && password === undefined) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    if (fullName !== undefined || designation !== undefined) {
      const updates = [];

      if (fullName !== undefined) {
        updates.push(
          supabase
            .from('hrm_profiles')
            .update({ full_name: fullName || null })
            .eq('id', user.id)
        );
      }

      if (fullName !== undefined) {
        updates.push(
          supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              full_name: fullName || '',
            },
          })
        );
      }

      if (authContext.isSuperAdmin && authContext.superAdmin && (fullName !== undefined || designation !== undefined)) {
        updates.push(
          supabase
            .from('privileged_accounts')
            .update({
              ...(fullName !== undefined ? { name: fullName || null } : {}),
              ...(designation !== undefined ? { designation: designation || null } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('auth_user_id', user.id)
        );
      } else if (authContext.hrAdmin && fullName !== undefined) {
        updates.push(
          supabase
            .from('privileged_accounts')
            .update({ name: fullName || null, updated_at: new Date().toISOString() })
            .eq('auth_user_id', user.id)
        );
      } else if (authContext.support && (fullName !== undefined || designation !== undefined)) {
        updates.push(
          supabase
            .from('privileged_accounts')
            .update({
              ...(fullName !== undefined ? { name: fullName || null } : {}),
              ...(designation !== undefined ? { designation: designation || null } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('auth_user_id', user.id)
        );
      }

      const results = await Promise.all(updates);

      for (const result of results) {
        if (result?.error) {
          return NextResponse.json({ error: result.error.message }, { status: 500 });
        }
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

        if (authContext.isSuperAdmin && authContext.superAdmin) {
          const passwordHash = await bcrypt.hash(password, 10);
          const { error: privilegedPasswordError } = await supabase
            .from('privileged_accounts')
            .update({
              password_hash: passwordHash,
              updated_at: new Date().toISOString(),
            })
            .eq('auth_user_id', user.id);

          if (privilegedPasswordError) {
            return NextResponse.json({ error: privilegedPasswordError.message }, { status: 500 });
          }
        } else if (authContext.support) {
          const passwordHash = await bcrypt.hash(password, 10);
          const { error: privilegedPasswordError } = await supabase
            .from('privileged_accounts')
            .update({
              password_hash: passwordHash,
              updated_at: new Date().toISOString(),
            })
            .eq('auth_user_id', user.id);

          if (privilegedPasswordError) {
            return NextResponse.json({ error: privilegedPasswordError.message }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Failed to update admin profile' }, { status: 500 });
  }
}

