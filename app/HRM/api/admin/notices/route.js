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
    if (!authContext?.isHrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: notices, error: fetchError } = await supabase
      .from('hrm_notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({ success: true, notices: notices || [] });
  } catch (error) {
    console.error('Error fetching admin notices:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch notices' }, { status: 500 });
  }
}

export async function POST(request) {
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
    const {
      title,
      content,
      content_format = 'text',
      bg_color = '#ffffff',
      text_color = '#0f172a',
      primary_color = '#4f46e5',
      border_color = '#e2e8f0',
      title_size = '24px',
      content_size = '16px',
      content_bold = false,
      start_time,
      end_time,
      target_audience = 'all',
      display_frequency = 'always',
      is_active = true,
    } = body;

    if (!title || !content || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields: title, content, start_time, end_time' }, { status: 400 });
    }

    const { data: newNotice, error: insertError } = await supabase
      .from('hrm_notices')
      .insert({
        title: title.trim(),
        content: content.trim(),
        content_format,
        bg_color,
        text_color,
        primary_color,
        border_color,
        title_size,
        content_size,
        content_bold,
        start_time,
        end_time,
        target_audience,
        display_frequency,
        is_active,
        created_by: authContext.profile?.id || authContext.userId,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, notice: newNotice });
  } catch (error) {
    console.error('Error creating admin notice:', error);
    return NextResponse.json({ error: error.message || 'Failed to create notice' }, { status: 500 });
  }
}
