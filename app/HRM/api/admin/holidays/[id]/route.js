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

async function resolveParams(context) {
  const params = await context?.params;
  const id = typeof params?.id === 'string' ? params.id : '';
  return id;
}

export async function PATCH(request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const id = await resolveParams(context);
    if (!id) {
      return NextResponse.json({ error: 'Holiday id is required' }, { status: 400 });
    }

    const body = await request.json();
    const holidayDate = cleanText(body?.holidayDate);
    const payload = {
      year: deriveYearFromDate(holidayDate),
      date: holidayDate,
      name: cleanText(body?.holidayName),
      type: normalizeHolidayType(body?.holidayType),
    };

    if (!payload.date || !payload.name || !payload.year) {
      return NextResponse.json({ error: 'Holiday date and holiday name are required' }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from('hrm_holidays')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to update holiday' }, { status: 500 });
    }

    return NextResponse.json({ holiday: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({ error: error.message || 'Failed to update holiday' }, { status: 500 });
  }
}

export async function DELETE(_request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const id = await resolveParams(context);
    if (!id) {
      return NextResponse.json({ error: 'Holiday id is required' }, { status: 400 });
    }

    const { error } = await adminClient.from('hrm_holidays').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to delete holiday' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete holiday' }, { status: 500 });
  }
}
