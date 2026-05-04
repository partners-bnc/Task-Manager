import { NextResponse } from 'next/server';
import { loadCstDashboard, requirePdplActor } from '@/utils/auditing-cst';

export async function GET(_request, { params }) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { id } = await params;
    const dashboard = await loadCstDashboard(id, auth.actor);
    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error) {
    console.error('Error loading CST dashboard:', error);
    if (String(error.message || '').includes('do not have access')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to load CST dashboard' }, { status: 500 });
  }
}
