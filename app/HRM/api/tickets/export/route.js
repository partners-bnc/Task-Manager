import { NextResponse } from 'next/server';
import { buildTicketExportCsv } from '@/utils/ticket-export';
import { requireTicketActor } from '@/utils/tickets';

export async function GET(request) {
  try {
    const auth = await requireTicketActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    if (!actor.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    const csvContent = await buildTicketExportCsv({
      actor,
      moduleKey: 'all',
      search,
      status,
      category,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="all-tickets-export.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting HRM tickets:', error);
    return NextResponse.json({ error: error.message || 'Failed to export tickets' }, { status: 500 });
  }
}
