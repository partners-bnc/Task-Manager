import { NextResponse } from 'next/server';
import { listAdminPayrollHistory } from '@/utils/payroll';
import { jsonErrorResponse, parseIntegerParam, requireHrPayrollAccess } from '@/utils/payroll-api';

export async function GET(request) {
  try {
    const auth = await requireHrPayrollAccess();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const employeeId = String(searchParams.get('employeeId') || '').trim();
    const year = parseIntegerParam(searchParams.get('year'));

    if (!employeeId) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const rows = await listAdminPayrollHistory({ employeeId, year });
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    console.error('Error loading admin payroll history:', error);
    return jsonErrorResponse(error, 'Failed to load payroll history');
  }
}
