import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

async function requireHrAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.isHrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

function cleanText(value) {
  const nextValue = String(value || '').trim();
  return nextValue || null;
}

function deriveYearFromDate(value) {
  const normalized = cleanText(value);
  if (!normalized) {
    return null;
  }

  const [yearText] = normalized.split('-');
  const year = Number(yearText);
  return Number.isFinite(year) ? year : null;
}

function normalizeHolidayType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return 'company';
  }

  if (['general', 'festival holiday', 'gazetted holiday', 'company'].includes(normalized)) {
    return 'company';
  }

  if (['national holiday', 'national'].includes(normalized)) {
    return 'national';
  }

  if (['regional holiday', 'regional'].includes(normalized)) {
    return 'regional';
  }

  return normalized;
}

export async function GET() {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { data, error } = await adminClient
      .from('hrm_holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load holidays' }, { status: 500 });
    }

    return NextResponse.json({ holidays: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error loading admin holidays:', error);
    return NextResponse.json({ error: error.message || 'Failed to load holidays' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const holidayDate = cleanText(body?.holidayDate);
    const holidayName = cleanText(body?.holidayName);
    const holidayType = normalizeHolidayType(body?.holidayType);
    const year = deriveYearFromDate(holidayDate);

    if (!holidayDate || !holidayName || !year) {
      return NextResponse.json({ error: 'Holiday date and holiday name are required' }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from('hrm_holidays')
      .insert({
        year,
        date: holidayDate,
        name: holidayName,
        type: holidayType,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create holiday' }, { status: 500 });
    }

    return NextResponse.json({ holiday: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ error: error.message || 'Failed to create holiday' }, { status: 500 });
  }
}
