import { NextResponse } from 'next/server';
import { generatePayslipForItem, getLatestPayslipForItem, getPayrollItemById } from '@/utils/payroll';
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

    const existingPayslip = await getLatestPayslipForItem(id);
    const payslip = await generatePayslipForItem({
      itemId: id,
      actorUserId: auth.authContext.userId,
    });

    const item = await getPayrollItemById(id);
    return NextResponse.json({ payslip, item, alreadyExists: Boolean(existingPayslip) }, { status: existingPayslip ? 200 : 201 });
  } catch (error) {
    console.error('Error generating payslip:', error);
    return jsonErrorResponse(error, 'Failed to generate payslip');
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

    if (!payslip) {
      return NextResponse.json({ item, payslip: null }, { status: 200 });
    }

    return NextResponse.json({ item, payslip }, { status: 200 });
  } catch (error) {
    console.error('Error loading payslip:', error);
    return jsonErrorResponse(error, 'Failed to load payslip');
  }
}
