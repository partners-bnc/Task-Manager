import { NextResponse } from 'next/server';
import {
  deleteCstProject,
  isMissingCstSchemaError,
  loadCstProject,
  requirePdplActor,
  updateCstProject,
} from '@/utils/auditing-cst';

export async function GET(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id } = await params;
    const project = await loadCstProject(id, auth.actor);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('Error loading CST project:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isMissingCstSchemaError(error)) {
      return NextResponse.json(
        { error: 'CST audit database setup is pending. Apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to load CST project' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id } = await params;
    await updateCstProject(id, body, auth.actor);
    const project = await loadCstProject(id, auth.actor);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('Error updating CST project:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update CST project' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id } = await params;
    await deleteCstProject(id, auth.actor);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting CST project:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete CST project' }, { status: 500 });
  }
}
