import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing notice ID parameter' }, { status: 400 });
    }

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
    } = body;

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (content !== undefined) updatePayload.content = content.trim();
    if (content_format !== undefined) updatePayload.content_format = content_format;
    if (bg_color !== undefined) updatePayload.bg_color = bg_color;
    if (text_color !== undefined) updatePayload.text_color = text_color;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;
    if (border_color !== undefined) updatePayload.border_color = border_color;
    if (title_size !== undefined) updatePayload.title_size = title_size;
    if (content_size !== undefined) updatePayload.content_size = content_size;
    if (content_bold !== undefined) updatePayload.content_bold = content_bold;
    if (start_time !== undefined) updatePayload.start_time = start_time;
    if (end_time !== undefined) updatePayload.end_time = end_time;
    if (target_audience !== undefined) updatePayload.target_audience = target_audience;
    if (display_frequency !== undefined) updatePayload.display_frequency = display_frequency;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedNotice, error: updateError } = await supabase
      .from('hrm_notices')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, notice: updatedNotice });
  } catch (error) {
    console.error('Error updating admin notice:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notice' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing notice ID parameter' }, { status: 400 });
    }

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

    const { error: deleteError } = await supabase
      .from('hrm_notices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin notice:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete notice' }, { status: 500 });
  }
}
