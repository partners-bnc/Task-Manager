import { NextResponse } from 'next/server';
import {
  CST_SECTIONS,
  deleteCstSectionRow,
  requirePdplActor,
  updateCstSectionRow,
} from '@/utils/auditing-cst';

function assertSection(section) {
  if (!CST_SECTIONS.includes(section)) {
    throw new Error('Unsupported CST section.');
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, section, rowId } = await params;
    assertSection(section);
    const body = await request.json();
    await updateCstSectionRow(id, section, rowId, body, auth.actor);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating CST row:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update CST row' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id, section, rowId } = await params;
    assertSection(section);
    await deleteCstSectionRow(id, section, rowId, auth.actor);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting CST row:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete CST row' }, { status: 500 });
  }
}
