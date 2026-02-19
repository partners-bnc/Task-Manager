import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fallbackName = user.email ? user.email.split('@')[0] : 'Admin User';

    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        name: profile?.full_name || fallbackName,
        email: user.email || '',
        role: 'Admin',
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const fullName = body?.name !== undefined ? String(body.name).trim() : undefined;
    const password = body?.password !== undefined ? String(body.password) : undefined;

    if (fullName === undefined && password === undefined) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
    }

    if (fullName !== undefined) {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName || null })
        .eq('id', user.id);

      if (updateProfileError) {
        return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
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
