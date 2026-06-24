import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

// GET: List all issued certificates
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = adminClient
      .from('hrm_certificates')
      .select('*')
      .order('issued_at', { ascending: false });

    if (search) {
      query = query.or(
        `recipient_name.ilike.%${search}%,recipient_employee_id.ilike.%${search}%,certificate_id.ilike.%${search}%,designation.ilike.%${search}%`
      );
    }

    const { data: certificates, error: queryError } = await query;

    if (queryError) {
      // If table doesn't exist yet, return a clean warning so the UI knows to show a warning
      if (queryError.message.includes('relation "public.hrm_certificates" does not exist') || queryError.code === 'P0001' || queryError.code === '42P01') {
        return NextResponse.json({
          error: 'database_migration_needed',
          message: 'The certificates table does not exist. Please apply the migration files.',
          certificates: []
        });
      }
      throw queryError;
    }

    return NextResponse.json({ success: true, certificates: certificates || [] });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

// POST: Generate new certificate
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
      employee_id,
      recipient_name,
      recipient_employee_id,
      designation,
      start_date,
      end_date,
    } = body;

    if (!recipient_name || !recipient_employee_id || !designation || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required certificate details' }, { status: 400 });
    }

    // Generate unique sequential Certificate ID
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yyyymm = `${year}${month}`;

    // Get count of certificates created in the current month
    const startOfMonth = `${year}-${month}-01T00:00:00.000Z`;
    const { count, error: countError } = await adminClient
      .from('hrm_certificates')
      .select('*', { count: 'exact', head: true })
      .gte('issued_at', startOfMonth);

    if (countError) {
      if (countError.message.includes('relation "public.hrm_certificates" does not exist') || countError.code === '42P01') {
        return NextResponse.json({
          error: 'database_migration_needed',
          message: 'The certificates table does not exist. Please apply the migration files.'
        }, { status: 500 });
      }
      throw countError;
    }

    const nextSeq = String((count || 0) + 1).padStart(4, '0');
    const initialCertId = `BNC-INT-${yyyymm}-${nextSeq}`;

    // Resilience against ID collision (e.g. parallel runs)
    let finalCertificateId = initialCertId;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const { data: existing } = await adminClient
        .from('hrm_certificates')
        .select('id')
        .eq('certificate_id', finalCertificateId)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        attempts++;
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalCertificateId = `BNC-INT-${yyyymm}-${randomSuffix}`;
      }
    }

    // Insert record
    const { data: inserted, error: insertError } = await adminClient
      .from('hrm_certificates')
      .insert({
        certificate_id: finalCertificateId,
        employee_id: employee_id || null,
        recipient_name,
        recipient_employee_id,
        designation,
        start_date,
        end_date,
        issued_by: authContext.hrAdmin.id,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, certificate: inserted });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate certificate' }, { status: 500 });
  }
}
