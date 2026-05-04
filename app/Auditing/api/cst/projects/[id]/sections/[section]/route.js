import { NextResponse } from 'next/server';
import {
  assertCstProjectAccess,
  createCstSectionRow,
  CST_SECTIONS,
  loadCstSectionRows,
  replaceCstSectionRows,
  requirePdplActor,
} from '@/utils/auditing-cst';

function assertSection(section) {
  if (!CST_SECTIONS.includes(section)) {
    throw new Error('Unsupported CST section.');
  }
}

export async function GET(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, section } = await params;
    assertSection(section);
    await assertCstProjectAccess(id, auth.actor);
    const rows = await loadCstSectionRows(id, section);
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    console.error('Error loading CST section rows:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to load CST section rows' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, section } = await params;
    assertSection(section);
    const body = await request.json();
    const rowId = await createCstSectionRow(id, section, body, auth.actor);
    return NextResponse.json({ rowId }, { status: 201 });
  } catch (error) {
    console.error('Error creating CST section row:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create CST section row' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, section } = await params;
    assertSection(section);
    const body = await request.json();
    await replaceCstSectionRows(id, section, body.rows, auth.actor);
    const rows = await loadCstSectionRows(id, section);
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    console.error('Error replacing CST section rows:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to replace CST section rows' }, { status: 500 });
  }
}
