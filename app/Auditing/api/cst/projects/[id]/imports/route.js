import { NextResponse } from 'next/server';
import { createCstImportLog, replaceCstSectionRows, requirePdplActor } from '@/utils/auditing-cst';

export async function POST(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id } = await params;

    if (Array.isArray(body.ganttRows)) {
      await replaceCstSectionRows(id, 'gantt', body.ganttRows, auth.actor);
    }

    await createCstImportLog(
      id,
      {
        sourceFileName: body.sourceFileName,
        sheetMapping: body.sheetMapping,
        importSummary: body.importSummary,
      },
      auth.actor
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error importing CST workbook data:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to import CST workbook data' }, { status: 500 });
  }
}
