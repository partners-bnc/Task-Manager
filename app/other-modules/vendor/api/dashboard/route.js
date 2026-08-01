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

export async function GET() {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payments, error } = await adminClient
      .from(PAYMENTS_TABLE)
      .select('payment_type, amount, payment_status, created_at');

    if (error) throw error;

    // Calculate metrics in memory
    const totalPayments = payments?.length || 0;
    let totalAmount = 0;
    let approvedCount = 0;
    let paidCount = 0;
    let vendorCount = 0;
    let ffCount = 0;
    let vendorAmount = 0;
    let ffAmount = 0;

    const monthlyMap = {};

    (payments || []).forEach(p => {
      const amount = parseFloat(p.amount) || 0;
      totalAmount += amount;

      if (p.payment_status === 'approved') approvedCount++;
      if (p.payment_status === 'paid') {
        approvedCount++;
        paidCount++;
      }

      if (p.payment_type === 'vendor_payment') {
        vendorCount++;
        vendorAmount += amount;
      } else {
        ffCount++;
        ffAmount += amount;
      }

      // Group by Month (YYYY-MM)
      const date = new Date(p.created_at);
      if (!isNaN(date.getTime())) {
        const monthName = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthlyMap[monthName] = (monthlyMap[monthName] || 0) + amount;
      }
    });

    // Format monthly trend for charts (last 6 months sort order)
    const sortedMonths = Object.keys(monthlyMap).sort((a, b) => new Date(a) - new Date(b)).slice(-6);
    const monthlyTrend = sortedMonths.map(month => ({
      month,
      amount: monthlyMap[month]
    }));

    const stats = {
      totalPayments,
      totalAmount: Math.round(totalAmount * 100) / 100,
      approvedCount,
      paidCount,
      typeDistribution: {
        vendor: { count: vendorCount, amount: Math.round(vendorAmount * 100) / 100 },
        ff: { count: ffCount, amount: Math.round(ffAmount * 100) / 100 }
      },
      monthlyTrend
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('GET dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
