import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import PayrollPdfDocument from '@/app/HRM/components/views/payroll/PayrollPdfDocument';
import { getEmployeePaidPayrollMonth } from '@/utils/payroll';
import { jsonErrorResponse, requireEmployeePayrollAccess } from '@/utils/payroll-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readParams(params) {
  return typeof params?.then === 'function' ? params : Promise.resolve(params);
}

export async function GET(request, context) {
  try {
    const auth = await requireEmployeePayrollAccess();
    if (auth.error) return auth.error;

    const { year, month } = await readParams(context.params);
    const parsedYear = Number.parseInt(String(year || ''), 10);
    const parsedMonth = Number.parseInt(String(month || ''), 10);

    if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
      return NextResponse.json({ error: 'Valid year and month are required.' }, { status: 400 });
    }

    const item = await getEmployeePaidPayrollMonth(auth.authContext.employee.id, parsedYear, parsedMonth);
    if (!item?.payslipReleased) {
      return NextResponse.json({ error: 'Payslip has not been released by HR yet.' }, { status: 403 });
    }

    if (!item?.payslip?.snapshot_json) {
      return NextResponse.json({ error: 'Payslip PDF is not available yet.' }, { status: 404 });
    }

    const buffer = await renderToBuffer(<PayrollPdfDocument snapshot={item.payslip.snapshot_json} />);
    const { searchParams } = new URL(request.url);
    const shouldDownload = searchParams.get('download') === '1';
    const fileName = `${item.payslip.payslip_number || `payslip-${parsedYear}-${parsedMonth}`}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error rendering employee payslip PDF:', error);
    return jsonErrorResponse(error, 'Failed to render payslip PDF');
  }
}
