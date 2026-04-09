import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const mode = searchParams.get('mode') || 'all';

    let query = adminClient
      .from('hrm_holidays')
      .select('*');

    if (mode === 'upcoming') {
      query = query.gte('date', getTodayDateString()).order('date', { ascending: true }).limit(12);
    } else if (month) {
      const [yearText, monthText] = month.split('-');
      const year = Number(yearText);
      const monthNumber = Number(monthText);
      const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
      const end = `${year}-${String(monthNumber).padStart(2, '0')}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
      query = query.gte('date', start).lte('date', end).order('date', { ascending: true });
    } else {
      query = query.order('date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load holidays' }, { status: 500 });
    }

    return NextResponse.json({ holidays: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error loading holidays:', error);
    return NextResponse.json({ error: error.message || 'Failed to load holidays' }, { status: 500 });
  }
}
