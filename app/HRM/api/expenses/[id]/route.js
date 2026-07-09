import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import {
  calculateExpenseTotal,
  canActorEditExpenseClaim,
  canActorReviewExpenseClaim,
  canActorViewExpenseClaim,
  enrichExpenseClaimSummary,
  extractExpenseFileMap,
  formatExpenseCategoryLabel,
  getReportingManagerSummary,
  isMissingExpenseSchemaError,
  listExpensePeople,
  listExpenseReviewers,
  mapExpenseClaimSummary,
  mapExpenseReviewRows,
  parseExpenseItems,
  parseExpenseMultipart,
  requireExpenseActor,
  uploadExpenseFiles,
  validateExpenseClaimPayload,
  withExpenseAttachmentUrls,
} from '@/utils/expenses';

async function loadClaimBundle(claimId) {
  const [claimResult, itemsResult, attachmentsResult, reviewsResult] = await Promise.all([
    adminClient.from('hrm_expense_claims').select('*').eq('id', claimId).maybeSingle(),
    adminClient.from('hrm_expense_claim_items').select('*').eq('claim_id', claimId).order('expense_date', { ascending: true }),
    adminClient
      .from('hrm_expense_claim_attachments')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true }),
    adminClient
      .from('hrm_expense_claim_reviews')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true }),
  ]);

  if (claimResult.error) throw claimResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (attachmentsResult.error) throw attachmentsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  return {
    claim: claimResult.data || null,
    items: itemsResult.data || [],
    attachments: attachmentsResult.data || [],
    reviews: reviewsResult.data || [],
  };
}

function buildDetail(claim, items, attachments, reviews, actor, directory, reportingManager) {
  const summary = enrichExpenseClaimSummary(mapExpenseClaimSummary(claim), directory, reportingManager);
  return {
    ...summary,
    items: items.map((item) => ({
      id: item.id,
      expenseDate: item.expense_date,
      category: item.category,
      categoryLabel: formatExpenseCategoryLabel(item.category),
      description: item.description,
      amount: Number(item.amount || 0),
      vendorName: item.vendor_name || '',
      createdAt: item.created_at,
    })),
    attachments: withExpenseAttachmentUrls(attachments),
    reviews: mapExpenseReviewRows(reviews, directory.byAuthUserId),
    canEdit: canActorEditExpenseClaim(claim, actor),
    canReview: canActorReviewExpenseClaim(claim, actor),
    canResubmit: canActorEditExpenseClaim(claim, actor),
  };
}

export async function GET(_request, context) {
  try {
    const auth = await requireExpenseActor();
    if (auth.error) return auth.error;

    const resolvedParams = await context?.params;
    const claimId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!claimId) {
      return NextResponse.json({ error: 'Invalid claim id.' }, { status: 400 });
    }

    const { actor } = auth;
    const { claim, items, attachments, reviews } = await loadClaimBundle(claimId);

    if (!claim) {
      return NextResponse.json({ error: 'Expense claim not found.' }, { status: 404 });
    }

    if (!canActorViewExpenseClaim(claim, actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [directory, reportingManager] = await Promise.all([
      listExpensePeople(),
      getReportingManagerSummary(claim.employee_id),
    ]);
    return NextResponse.json(
      {
        claim: buildDetail(claim, items, attachments, reviews, actor, directory, reportingManager),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading expense claim detail:', error);
    if (isMissingExpenseSchemaError(error)) {
      return NextResponse.json(
        { error: 'Expense claim database setup is pending. Apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to load expense claim detail' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const auth = await requireExpenseActor();
    if (auth.error) return auth.error;

    const resolvedParams = await context?.params;
    const claimId = typeof resolvedParams?.id === 'string' ? resolvedParams.id.trim() : '';
    if (!claimId) {
      return NextResponse.json({ error: 'Invalid claim id.' }, { status: 400 });
    }

    const { actor } = auth;
    const { claim, items: existingItems, attachments: existingAttachments } = await loadClaimBundle(claimId);

    if (!claim) {
      return NextResponse.json({ error: 'Expense claim not found.' }, { status: 404 });
    }

    if (!canActorEditExpenseClaim(claim, actor)) {
      return NextResponse.json({ error: 'Only the employee can edit a claim sent back for correction.' }, { status: 403 });
    }

    const formData = await request.formData();
    const payload = parseExpenseMultipart(formData);
    const title = String(payload.title || '').trim();
    const purpose = String(payload.purpose || '').trim();
    const currency = String(payload.currency || 'INR').trim().toUpperCase();
    const reviewerAuthUserId = String(payload.reviewerAuthUserId || '').trim();
    const items = parseExpenseItems(payload.items);
    const reviewerOptions = await listExpenseReviewers(actor.authUserId);

    let reviewer;
    try {
      reviewer = validateExpenseClaimPayload({
        title,
        purpose,
        currency,
        reviewerAuthUserId,
        items,
        reviewerOptions,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message || 'Invalid claim payload.' }, { status: 400 });
    }

    const existingItemMap = new Map(existingItems.map((item) => [item.id, item]));
    const payloadExistingIds = new Set(items.map((item) => item.id).filter(Boolean));
    const removedItemIds = existingItems.map((item) => item.id).filter((id) => !payloadExistingIds.has(id));
    const fileMap = extractExpenseFileMap(formData);
    const newItemRows = [];
    const uploadedAttachments = [];

    for (const item of items) {
      if (item.id && existingItemMap.has(item.id)) {
        const { error: updateItemError } = await adminClient
          .from('hrm_expense_claim_items')
          .update({
            expense_date: item.expenseDate,
            category: item.category,
            description: item.description,
            amount: Number(item.amount.toFixed(2)),
            vendor_name: item.vendorName || null,
          })
          .eq('id', item.id)
          .eq('claim_id', claimId);

        if (updateItemError) throw updateItemError;
      } else {
        newItemRows.push({
          id: crypto.randomUUID(),
          claim_id: claimId,
          expense_date: item.expenseDate,
          category: item.category,
          description: item.description,
          amount: Number(item.amount.toFixed(2)),
          vendor_name: item.vendorName || null,
          clientId: item.clientId,
        });
      }
    }

    if (removedItemIds.length > 0) {
      const removedPaths = existingAttachments
        .filter((attachment) => removedItemIds.includes(attachment.claim_item_id))
        .map((attachment) => attachment.file_path)
        .filter(Boolean);

      if (removedPaths.length > 0) {
        await adminClient.storage.from('hrm-expense-files').remove(removedPaths);
      }

      const { error: deleteItemsError } = await adminClient
        .from('hrm_expense_claim_items')
        .delete()
        .in('id', removedItemIds);

      if (deleteItemsError) throw deleteItemsError;
    }

    if (newItemRows.length > 0) {
      const { error: insertItemsError } = await adminClient
        .from('hrm_expense_claim_items')
        .insert(newItemRows.map(({ clientId, ...row }) => row));
      if (insertItemsError) throw insertItemsError;
    }

    const allItemsForUpload = [
      ...items.filter((item) => item.id && existingItemMap.has(item.id)).map((item) => ({ id: item.id, clientId: item.clientId })),
      ...newItemRows.map((row) => ({ id: row.id, clientId: row.clientId })),
    ];

    for (const itemRow of allItemsForUpload) {
      const files = fileMap.get(itemRow.clientId) || [];
      if (!files.length) continue;
      const attachments = await uploadExpenseFiles({
        claimId,
        itemId: itemRow.id,
        files,
        actor,
      });
      uploadedAttachments.push(...attachments);
    }

    if (uploadedAttachments.length > 0) {
      const { error: attachmentError } = await adminClient
        .from('hrm_expense_claim_attachments')
        .insert(uploadedAttachments);
      if (attachmentError) throw attachmentError;
    }

    const totalAmount = calculateExpenseTotal(items);
    const submittedAt = new Date().toISOString();
    const { error: updateClaimError } = await adminClient
      .from('hrm_expense_claims')
      .update({
        title,
        purpose,
        currency,
        total_amount: totalAmount,
        reviewer_auth_user_id: reviewer.authUserId,
        reviewer_employee_id: reviewer.employeeId || null,
        reviewer_role: reviewer.role,
        reviewer_name_snapshot: reviewer.name,
        status: 'submitted',
        submitted_at: submittedAt,
        reviewed_at: null,
        review_note: null,
      })
      .eq('id', claimId);

    if (updateClaimError) throw updateClaimError;

    const { error: reviewError } = await adminClient.from('hrm_expense_claim_reviews').insert({
      claim_id: claimId,
      reviewer_auth_user_id: actor.authUserId,
      reviewer_role: actor.role,
      action: 'resubmitted',
      note: 'Claim updated and resubmitted by employee.',
      created_at: submittedAt,
    });

    if (reviewError) throw reviewError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating expense claim:', error);
    if (isMissingExpenseSchemaError(error)) {
      return NextResponse.json(
        { error: 'Expense claim database setup is pending. Apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update expense claim' }, { status: 500 });
  }
}
