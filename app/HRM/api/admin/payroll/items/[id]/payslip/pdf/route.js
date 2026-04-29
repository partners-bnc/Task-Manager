import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import PayrollPdfDocument from '@/app/HRM/components/views/payroll/PayrollPdfDocument';
import { getLatestPayslipForItem } from '@/utils/payroll';
import { jsonErrorResponse, requireHrPayrollAccess } from '@/utils/payroll-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readParams(params) {
  return typeof params?.then === 'function' ? params : Promise.resolve(params);
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
    if (!payslip?.snapshot_json) {
      return NextResponse.json({ error: 'Payslip PDF is not available yet.' }, { status: 404 });
    }

    const buffer = await renderToBuffer(<PayrollPdfDocument snapshot={payslip.snapshot_json} />);
    const { searchParams } = new URL(request.url);
    const shouldDownload = searchParams.get('download') === '1';
    const fileName = `${payslip.payslip_number || 'payslip'}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error rendering payroll payslip PDF:', error);
    return jsonErrorResponse(error, 'Failed to render payslip PDF');
  }
}
