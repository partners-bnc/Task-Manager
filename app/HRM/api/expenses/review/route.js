import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  enrichExpenseClaimSummary,
  isMissingExpenseSchemaError,
  listExpensePeople,
  mapExpenseClaimSummary,
  requireExpenseActor,
} from '@/utils/expenses';

function createEmptyResponse(actor) {
  return {
    setupPending: true,
    actor,
    pendingReview: [],
    reviewedHistory: [],
  };
}

export async function GET() {
  try {
    const auth = await requireExpenseActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    let claimsResult;
    try {
      if (actor.role === 'hr_admin') {
        claimsResult = await adminClient
          .from('hrm_expense_claims')
          .select('*')
          .order('updated_at', { ascending: false });
      } else {
        claimsResult = await adminClient
          .from('hrm_expense_claims')
          .select('*')
          .eq('reviewer_auth_user_id', actor.authUserId)
          .order('updated_at', { ascending: false });
      }
    } catch (error) {
      if (isMissingExpenseSchemaError(error)) {
        return NextResponse.json(createEmptyResponse(actor), { status: 200 });
      }
      throw error;
    }

    if (claimsResult.error) {
      if (isMissingExpenseSchemaError(claimsResult.error)) {
        return NextResponse.json(createEmptyResponse(actor), { status: 200 });
      }
      throw claimsResult.error;
    }

    const directory = await listExpensePeople();
    const rows = claimsResult.data || [];
    const pendingReview = [];
    const reviewedHistory = [];

    rows.forEach((claim) => {
      const mapped = enrichExpenseClaimSummary(mapExpenseClaimSummary(claim), directory);
      if (claim.status === 'submitted') {
        pendingReview.push(mapped);
      } else {
        reviewedHistory.push(mapped);
      }
    });

    return NextResponse.json(
      {
        setupPending: false,
        actor,
        pendingReview,
        reviewedHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading expense review inbox:', error);
    return NextResponse.json({ error: error.message || 'Failed to load expense review inbox' }, { status: 500 });
  }
}
