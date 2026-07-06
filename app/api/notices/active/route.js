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
    if (!authContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine target audience match based on user account type
    const isHrOrSuperAdmin = authContext.accountType === 'hr_admin' || authContext.accountType === 'super_admin';
    const audienceFilter = ['all'];
    if (isHrOrSuperAdmin) {
      audienceFilter.push('admin');
    } else {
      audienceFilter.push('employee');
    }

    const now = new Date().toISOString();

    // Query active notices targeting the user's role
    const { data: notices, error: fetchError } = await supabase
      .from('hrm_notices')
      .select('*')
      .eq('is_active', true)
      .lte('start_time', now)
      .gte('end_time', now)
      .in('target_audience', audienceFilter)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    const activeNotice = notices && notices.length > 0 ? notices[0] : null;

    return NextResponse.json({ success: true, notice: activeNotice });
  } catch (error) {
    console.error('Error fetching active notice:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch active notice' }, { status: 500 });
  }
}
