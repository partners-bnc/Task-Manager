import { NextResponse } from 'next/server';
import { getAdminPayrollHistoryItem } from '@/utils/payroll';
import { jsonErrorResponse, requireHrPayrollAccess } from '@/utils/payroll-api';

async function readParams(params) {
  return typeof params?.then === 'function' ? params : Promise.resolve(params);
}

export async function GET(request, context) {
  try {
    const auth = await requireHrPayrollAccess();
    if (auth.error) return auth.error;

    const { itemId } = await readParams(context.params);
    if (!itemId) {
      return NextResponse.json({ error: 'Payroll item id is required.' }, { status: 400 });
    }

    const detail = await getAdminPayrollHistoryItem(itemId);
    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    console.error('Error loading admin payroll history item:', error);
    return jsonErrorResponse(error, 'Failed to load payroll history item');
  }
}
