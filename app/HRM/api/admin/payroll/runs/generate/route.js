import { NextResponse } from 'next/server';
import { generatePayrollRun } from '@/utils/payroll';
import { jsonErrorResponse, requireHrPayrollAccess } from '@/utils/payroll-api';

export async function POST(request) {
  try {
    const auth = await requireHrPayrollAccess();
    if (auth.error) return auth.error;

    const body = await request.json();
    const year = Number.parseInt(String(body.year || ''), 10);
    const month = Number.parseInt(String(body.month || ''), 10);
    const previewSignature = String(body.previewSignature || '').trim();

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return NextResponse.json({ error: 'Valid year and month are required.' }, { status: 400 });
    }

    const result = await generatePayrollRun({
      year,
      month,
      actorUserId: auth.authContext.userId,
      previewSignature,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error generating payroll run:', error);
    return jsonErrorResponse(error, 'Failed to generate payroll run');
  }
}
