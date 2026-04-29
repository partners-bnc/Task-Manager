import { NextResponse } from 'next/server';
import { getPayrollItemById, getLatestPayslipForItem, releasePayslipToEmployee } from '@/utils/payroll';
import { jsonErrorResponse, requireHrPayrollAccess } from '@/utils/payroll-api';

async function readParams(params) {
  return typeof params?.then === 'function' ? params : Promise.resolve(params);
}

export async function POST(request, context) {
  try {
    const auth = await requireHrPayrollAccess();
    if (auth.error) return auth.error;

    const { id } = await readParams(context.params);
    if (!id) {
      return NextResponse.json({ error: 'Payroll item id is required.' }, { status: 400 });
    }

    const payslip = await releasePayslipToEmployee({
      itemId: id,
      actorUserId: auth.authContext.userId,
    });

    const item = await getPayrollItemById(id);
    return NextResponse.json({ payslip, item }, { status: 200 });
  } catch (error) {
    console.error('Error sending payslip to employee:', error);
    return jsonErrorResponse(error, 'Failed to send payslip to employee');
  }
}

export async function GET(request, context) {
  try {
    const auth = await requireHrPayrollAccess();
    if (auth.error) return auth.error;

    const { id } = await readParams(context.params);
    if (!id) {
      return NextResponse.json({ error: 'Payroll item id is required.' }, { status: 400 });
    }

    const payslip = await getLatestPayslipForItem(id);
    const item = await getPayrollItemById(id);
    return NextResponse.json({ payslip, item }, { status: 200 });
  } catch (error) {
    console.error('Error loading payslip release state:', error);
    return jsonErrorResponse(error, 'Failed to load payslip release state');
  }
}
