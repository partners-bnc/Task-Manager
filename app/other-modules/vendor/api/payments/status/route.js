import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

const PAYMENTS_TABLE = 'vendor_payments';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  return resolveAuthenticatedUserContext(supabase, user);
}

export async function POST(request) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { payment_id, status } = body;

    if (!payment_id || !status) {
      return NextResponse.json({ error: 'Missing payment_id or status' }, { status: 400 });
    }

    const allowedStatuses = ['invoice_uploaded', 'approved', 'paid'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: payment, error: fetchError } = await adminClient
      .from(PAYMENTS_TABLE)
      .select('id, payment_status')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment entry not found' }, { status: 404 });
    }

    const { data: updatedPayment, error: updateError } = await adminClient
      .from(PAYMENTS_TABLE)
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('POST status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
