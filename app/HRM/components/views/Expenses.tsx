'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import HrmEmptyState from '../ui/HrmEmptyState';
import { DetailPanelSkeleton, LoadingPanel } from '../ui/Skeleton';
import {
  type ExpenseClaimAttachment,
  type ExpenseClaimDetail,
  type ExpenseClaimSummary,
  type ExpenseListResponse,
  type ExpensePerson,
  type ExpenseReviewInboxResponse,
  type ExpenseViewSection,
  formatExpenseDate,
  formatExpenseDateTime,
  formatExpenseFileSize,
  formatExpenseMoney,
  formatExpenseRelativeTime,
  getExpenseInitials,
} from './expenseShared';

type ExpenseVariant = 'employee' | 'admin';

interface ExpensesProps {
  variant?: ExpenseVariant;
}

interface DraftLineItem {
  id?: string;
  localId: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  vendorName: string;
  files: File[];
}

interface DraftState {
  title: string;
  purpose: string;
  reviewerAuthUserId: string;
  currency: string;
  items: DraftLineItem[];
}

const EMPLOYEE_SECTIONS: Array<{ id: ExpenseViewSection; label: string; icon: string }> = [
  { id: 'claim', label: 'Claim Expense', icon: 'receipt_long' },
  { id: 'my-claims', label: 'My Claims', icon: 'pending_actions' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'review', label: 'Review Inbox', icon: 'fact_check' },
];

const ADMIN_SECTIONS: Array<{ id: ExpenseViewSection; label: string; icon: string }> = [
  { id: 'review', label: 'Pending Review', icon: 'fact_check' },
  { id: 'history', label: 'Reviewed History', icon: 'history' },
];

const EMPTY_REVIEW_DATA: ExpenseReviewInboxResponse = {
  actor: {
    authUserId: '',
    employeeId: null,
    role: 'employee',
    name: '',
    email: '',
    canCreateClaims: false,
    isAdmin: false,
  },
  pendingReview: [],
  reviewedHistory: [],
};

function createLineItem(): DraftLineItem {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return {
    localId: crypto.randomUUID(),
    expenseDate: iso,
    category: 'travel',
    description: '',
    amount: '',
    vendorName: '',
    files: [],
  };
}

function createDraft(defaultReviewer = '', defaultCurrency = 'INR'): DraftState {
  return {
    title: '',
    purpose: '',
    reviewerAuthUserId: defaultReviewer,
    currency: defaultCurrency,
    items: [createLineItem()],
  };
}

function toMonthValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = String(value || '').split('-');
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!yearNumber || !monthNumber) return value;
  return new Date(yearNumber, monthNumber - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function toCsvCell(value: unknown) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function ClaimStatusBadge({ status }: { status: string }) {
  const tones =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'rejected'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : status === 'needs_changes'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-violet-50 text-violet-700 border-violet-200';
  const icon =
    status === 'approved'
      ? 'check_circle'
      : status === 'rejected'
        ? 'cancel'
        : status === 'needs_changes'
          ? 'edit_square'
          : 'schedule';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${tones}`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function PersonAvatar({
  person,
  size = 44,
  rounded = 'rounded-full',
}: {
  person?: ExpensePerson | null;
  size?: number;
  rounded?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-violet-200 bg-violet-100 text-sm font-bold text-violet-700 shadow-[0_10px_22px_rgba(109,40,217,0.08)] ${rounded}`}
      style={{ width: size, height: size }}
    >
      {person?.avatarUrl ? (
        <Image
          src={person.avatarUrl}
          alt={person.name || 'User'}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        getExpenseInitials(person)
      )}
    </div>
  );
}

function AvatarPill({
  person,
  subtitleOverride,
}: {
  person?: ExpensePerson | null;
  subtitleOverride?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <PersonAvatar person={person} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-on-surface">{person?.name || 'Unknown'}</p>
        <p className="truncate text-xs text-on-surface-variant">
          {subtitleOverride || [person?.employeeCode, person?.email].filter(Boolean).join(' • ') || person?.role || ''}
        </p>
      </div>
    </div>
  );
}

function AttachmentLink({ attachment }: { attachment: ExpenseClaimAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 transition hover:border-violet-200 hover:bg-violet-50/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-on-surface">{attachment.fileName}</p>
        <p className="text-xs text-on-surface-variant">
          {[formatExpenseFileSize(attachment.fileSize), formatExpenseDateTime(attachment.createdAt)].filter(Boolean).join(' • ')}
        </p>
      </div>
      <span className="material-symbols-outlined text-violet-600">open_in_new</span>
    </a>
  );
}

function ClaimCard({
  claim,
  onOpen,
}: {
  claim: ExpenseClaimSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_20px_40px_rgba(76,29,149,0.08)]"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">{claim.claimNo}</span>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">{claim.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{claim.purpose}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#fbf7ff_0%,#f5f2ff_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Total</p>
          <p className="mt-2 text-2xl font-headline font-bold text-violet-900">
            {formatExpenseMoney(claim.totalAmount, claim.currency)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Reviewer</p>
          <p className="mt-2 text-sm font-medium text-on-surface">{claim.reviewer.name}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Requester</p>
          <p className="mt-2 text-sm font-medium text-on-surface">{claim.employee.name}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Submitted</p>
          <p className="mt-2 text-sm font-medium text-on-surface">{formatExpenseDate(claim.submittedAt)}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Updated</p>
            <p className="mt-2 text-sm font-medium text-on-surface">{formatExpenseRelativeTime(claim.updatedAt)}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700">
            View Details
            <span className="material-symbols-outlined text-lg">arrow_outward</span>
          </span>
        </div>
      </div>
    </button>
  );
}

function ClaimsSection({
  title,
  subtitle,
  claims,
  emptyMessage,
  emptyTitle = 'Nothing to show here',
  emptyIcon = 'receipt_long',
  onOpen,
  hideHeader = false,
}: {
  title: string;
  subtitle: string;
  claims: ExpenseClaimSummary[];
  emptyMessage: string;
  emptyTitle?: string;
  emptyIcon?: string;
  onOpen: (claimId: string) => void;
  hideHeader?: boolean;
}) {
  return (
    <div className="space-y-5">
      {hideHeader ? null : (
        <div>
          <h3 className="text-2xl font-headline font-bold text-on-surface">{title}</h3>
          <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
        </div>
      )}
      {claims.length ? (
        <div className="space-y-5">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} onOpen={() => onOpen(claim.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5">
          <HrmEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            message={emptyMessage}
          />
        </div>
      )}
    </div>
  );
}

function TimelineEntry({
  isLast,
  person,
  title,
  badge,
  timestamp,
  note,
}: {
  isLast: boolean;
  person?: ExpensePerson | null;
  title: string;
  badge: string;
  timestamp: string;
  note: string;
}) {
  return (
    <div className="relative flex gap-4 pl-1">
      {!isLast ? (
        <div className="absolute left-[25px] top-12 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-violet-200 via-violet-100 to-transparent" />
      ) : null}
      <PersonAvatar person={person} size={48} />
      <div className="min-w-0 flex-1 rounded-[1.7rem] border border-outline-variant/10 bg-surface-container-low px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-on-surface">{title}</p>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700">{badge}</span>
          <span className="text-xs text-on-surface-variant">{timestamp}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{note || 'No note added for this action.'}</p>
      </div>
    </div>
  );
}

export default function Expenses({ variant = 'employee' }: ExpensesProps) {
  const { showFeedback } = useHrmFeedback();
  const isEmployeeView = variant === 'employee';
  const [listData, setListData] = useState<ExpenseListResponse | null>(null);
  const [reviewData, setReviewData] = useState<ExpenseReviewInboxResponse>(EMPTY_REVIEW_DATA);
  const [activeSection, setActiveSection] = useState<ExpenseViewSection>(isEmployeeView ? 'claim' : 'review');
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaimDetail | null>(null);
  const [draft, setDraft] = useState<DraftState>(createDraft());
  const [editingClaimId, setEditingClaimId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [historyMode, setHistoryMode] = useState<'mine' | 'reviewed'>('mine');
  const [reviewMonth, setReviewMonth] = useState('all');

  const reviewerOptions = listData?.reviewerOptions || [];
  const currencies = listData?.currencies || ['INR'];
  const categories = listData?.categories || [
    'travel',
    'lodging',
    'meals',
    'fuel',
    'client_meeting',
    'office_supplies',
    'internet_phone',
    'training',
    'software',
    'other',
  ];

  const currentSections = useMemo(() => {
    if (!isEmployeeView) return ADMIN_SECTIONS;

    const base = EMPLOYEE_SECTIONS.filter((section) => section.id !== 'review');
    const hasReviewerAccess =
      reviewData.pendingReview.length > 0 || reviewData.reviewedHistory.length > 0 || Boolean(reviewData.actor.authUserId);

    return hasReviewerAccess ? EMPLOYEE_SECTIONS : base;
  }, [isEmployeeView, reviewData]);

  const pendingClaims = useMemo(
    () => [...(listData?.pendingClaims || []), ...(listData?.needsChangesClaims || [])],
    [listData]
  );

  const myHistoryClaims = useMemo(() => listData?.historyClaims || [], [listData]);
  const reviewedByMeClaims = useMemo(() => reviewData.reviewedHistory || [], [reviewData]);
  const pendingReviewClaims = useMemo(() => reviewData.pendingReview || [], [reviewData]);
  const reviewMonthOptions = useMemo(() => {
    const months = Array.from(
      new Set(
        pendingReviewClaims
          .map((claim) => toMonthValue(claim.submittedAt || claim.createdAt))
          .filter(Boolean)
      )
    ).sort((left, right) => right.localeCompare(left));

    return months;
  }, [pendingReviewClaims]);

  const filteredPendingReviewClaims = useMemo(() => {
    if (reviewMonth === 'all') return pendingReviewClaims;
    return pendingReviewClaims.filter((claim) => {
      const claimMonth = toMonthValue(claim.submittedAt || claim.createdAt);
      return claimMonth === reviewMonth;
    });
  }, [pendingReviewClaims, reviewMonth]);

  const totalDraftAmount = useMemo(
    () =>
      draft.items.reduce((sum, item) => {
        const amount = Number(item.amount || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [draft.items]
  );

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setIsLoading(true);
      setError('');

      try {
        const requests = [fetch('/HRM/api/expenses/review', { method: 'GET', credentials: 'include' })];

        if (isEmployeeView) {
          requests.unshift(fetch('/HRM/api/expenses', { method: 'GET', credentials: 'include' }));
        }

        const responses = await Promise.all(requests);
        if (!active) return;

        if (isEmployeeView) {
          const [listResponse, reviewResponse] = responses;
          const listResult = await listResponse.json();
          const reviewResult = await reviewResponse.json();

          if (!listResponse.ok) {
            throw new Error(listResult.error || 'Failed to load expense claims.');
          }

          setListData(listResult);
          setDraft((current) => {
            const defaultReviewer =
              current.reviewerAuthUserId ||
              listResult.reviewerOptions?.[0]?.authUserId ||
              '';

            return current.title || current.purpose || editingClaimId
              ? current
              : createDraft(defaultReviewer, listResult.currencies?.[0] || 'INR');
          });

          if (reviewResponse.ok) {
            setReviewData(reviewResult);
          } else {
            setReviewData(EMPTY_REVIEW_DATA);
          }
        } else {
          const [reviewResponse] = responses;
          const reviewResult = await reviewResponse.json();

          if (!reviewResponse.ok) {
            throw new Error(reviewResult.error || 'Failed to load expense review inbox.');
          }

          setReviewData(reviewResult);
          setListData(null);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load expense claims.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadPage();
    return () => {
      active = false;
    };
  }, [isEmployeeView, editingClaimId]);

  const openClaim = async (claimId: string) => {
    setSelectedClaimId(claimId);
    setIsDetailLoading(true);
    setError('');

    try {
      const response = await fetch(`/HRM/api/expenses/${claimId}`, {
        method: 'GET',
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load expense claim detail.');
      }

      setSelectedClaim(result.claim);
      setReviewNote(result.claim.reviewNote || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load expense claim detail.');
      setSelectedClaim(null);
      setSelectedClaimId('');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const resetDetail = () => {
    setSelectedClaimId('');
    setSelectedClaim(null);
    setReviewNote('');
  };

  const updateItem = (localId: string, updater: (item: DraftLineItem) => DraftLineItem) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.localId === localId ? updater(item) : item)),
    }));
  };

  const addItem = () => {
    setDraft((current) => ({
      ...current,
      items: [...current.items, createLineItem()],
    }));
  };

  const removeItem = (localId: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.localId !== localId),
    }));
  };

  const resetDraft = () => {
    setEditingClaimId('');
    setDraft(createDraft(reviewerOptions[0]?.authUserId || '', currencies[0] || 'INR'));
  };

  const beginEdit = (claim: ExpenseClaimDetail) => {
    setEditingClaimId(claim.id);
    setActiveSection('claim');
    setSelectedClaimId('');
    setSelectedClaim(null);
    setDraft({
      title: claim.title,
      purpose: claim.purpose,
      reviewerAuthUserId: claim.reviewer.authUserId,
      currency: claim.currency,
      items: claim.items.map((item) => ({
        id: item.id,
        localId: item.id,
        expenseDate: item.expenseDate,
        category: item.category,
        description: item.description,
        amount: String(item.amount),
        vendorName: item.vendorName || '',
        files: [],
      })),
    });
  };

  const submitClaim = async () => {
    if (!listData?.actor?.canCreateClaims) {
      showFeedback({ type: 'warning', title: 'Cannot Submit Claim', message: 'Only employees can submit expense claims.' });
      return;
    }

    if (!draft.title.trim() || !draft.purpose.trim() || !draft.reviewerAuthUserId) {
      showFeedback({ type: 'warning', title: 'Claim Details Required', message: 'Complete the title, purpose, and reviewer before submitting.' });
      return;
    }

    if (!draft.items.length) {
      showFeedback({ type: 'warning', title: 'Expense Item Required', message: 'Add at least one expense item.' });
      return;
    }

    const invalidItem = draft.items.find(
      (item) => !item.expenseDate || !item.category || !item.description.trim() || Number(item.amount || 0) <= 0
    );

    if (invalidItem) {
      showFeedback({ type: 'warning', title: 'Expense Item Incomplete', message: 'Each expense item needs a date, category, description, and amount.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append(
        'payload',
        JSON.stringify({
          title: draft.title.trim(),
          purpose: draft.purpose.trim(),
          reviewerAuthUserId: draft.reviewerAuthUserId,
          currency: draft.currency,
          items: draft.items.map((item) => ({
            id: item.id || undefined,
            clientId: item.localId,
            expenseDate: item.expenseDate,
            category: item.category,
            description: item.description.trim(),
            amount: Number(item.amount || 0),
            vendorName: item.vendorName.trim(),
          })),
        })
      );

      draft.items.forEach((item) => {
        item.files.forEach((file) => {
          formData.append(`files:${item.localId}`, file);
        });
      });

      const endpoint = editingClaimId ? `/HRM/api/expenses/${editingClaimId}` : '/HRM/api/expenses';
      const method = editingClaimId ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit expense claim.');
      }

      const wasEditingClaim = Boolean(editingClaimId);
      resetDraft();
      setActiveSection('my-claims');
      showFeedback({
        type: 'success',
        title: wasEditingClaim ? 'Expense Claim Updated' : 'Expense Claim Submitted',
        message: wasEditingClaim ? 'Expense claim updated successfully.' : 'Expense claim submitted successfully.',
      });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Expense Claim Not Submitted', message: requestError instanceof Error ? requestError.message : 'Failed to submit expense claim.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReview = async (action: 'approved' | 'rejected' | 'needs_changes') => {
    if (!selectedClaimId) return;

    if ((action === 'rejected' || action === 'needs_changes') && !reviewNote.trim()) {
      showFeedback({ type: 'warning', title: 'Review Note Required', message: 'Add a review note before sending this action.' });
      return;
    }

    setIsReviewSubmitting(true);

    try {
      const response = await fetch(`/HRM/api/expenses/${selectedClaimId}/review`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: reviewNote.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to review expense claim.');
      }

      resetDetail();
      showFeedback({ type: 'success', title: 'Expense Claim Reviewed', message: 'Expense claim review submitted successfully.' });
    } catch (requestError) {
      showFeedback({ type: 'error', title: 'Expense Review Failed', message: requestError instanceof Error ? requestError.message : 'Failed to review expense claim.' });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const exportPendingReviews = async () => {
    if (!filteredPendingReviewClaims.length) {
      showFeedback({ type: 'warning', title: 'No Claims To Export', message: 'There are no pending expense claims for the selected month.' });
      return;
    }

    try {
      const detailResponses = await Promise.all(
        filteredPendingReviewClaims.map(async (claim) => {
          const response = await fetch(`/HRM/api/expenses/${claim.id}`, {
            method: 'GET',
            credentials: 'include',
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || `Failed to load details for ${claim.claimNo}.`);
          }

          return result.claim as ExpenseClaimDetail;
        })
      );

      const header = [
        'Claim No',
        'Title',
        'Employee',
        'Reviewer',
        'Reporting Manager',
        'Status',
        'Currency',
        'Total Amount',
        'Submitted At',
        'Updated At',
        'Purpose',
        'Description',
        'Vendor',
      ];
      const rows = detailResponses.map((claim) => {
        const description = claim.items.map((item) => item.description).filter(Boolean).join(' | ');
        const vendor = claim.items.map((item) => item.vendorName).filter(Boolean).join(' | ');

        return [
          claim.claimNo,
          claim.title,
          claim.employee.name,
          claim.reviewer.name,
          claim.reportingManager?.name || claim.reportingManagerName || '',
          claim.statusLabel,
          claim.currency,
          claim.totalAmount,
          formatExpenseDateTime(claim.submittedAt),
          formatExpenseDateTime(claim.updatedAt),
          claim.purpose,
          description,
          vendor,
        ];
      });

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const monthSuffix = reviewMonth === 'all' ? 'all-months' : reviewMonth;
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-pending-review-${monthSuffix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showFeedback({ type: 'success', title: 'Export Ready', message: 'Pending expense reviews exported successfully.' });
    } catch (exportError) {
      showFeedback({
        type: 'error',
        title: 'Export Failed',
        message: exportError instanceof Error ? exportError.message : 'Failed to export pending reviews.',
      });
    }
  };

  const renderClaimDetail = () => {
    if (isDetailLoading) {
      return (
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <DetailPanelSkeleton />
        </div>
      );
    }

    if (!selectedClaim) return null;

    const attachmentsByItemId = selectedClaim.attachments.reduce<Record<string, ExpenseClaimAttachment[]>>((map, attachment) => {
      const key = attachment.claimItemId || 'claim';
      if (!map[key]) map[key] = [];
      map[key].push(attachment);
      return map;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetDetail}
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-violet-200 hover:text-violet-700"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back
          </button>

          {selectedClaim.canEdit ? (
            <button
              type="button"
              onClick={() => beginEdit(selectedClaim)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(109,40,217,0.2)] transition hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-lg">edit_square</span>
              Edit & Resubmit
            </button>
          ) : null}
        </div>

        <div className="rounded-[2.4rem] border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_24px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">{selectedClaim.claimNo}</span>
                <ClaimStatusBadge status={selectedClaim.status} />
              </div>
              <div>
                <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">{selectedClaim.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-on-surface-variant">{selectedClaim.purpose}</p>
              </div>
            </div>

            <div className="min-w-[260px] rounded-[2rem] bg-[linear-gradient(180deg,#faf5ff_0%,#f4ebff_100%)] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Claim Total</p>
              <p className="mt-2 text-3xl font-headline font-bold text-violet-950">
                {formatExpenseMoney(selectedClaim.totalAmount, selectedClaim.currency)}
              </p>
              <p className="mt-2 text-sm text-violet-800">Submitted {formatExpenseDateTime(selectedClaim.submittedAt)}</p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Employee</p>
              <div className="mt-3">
                <AvatarPill person={selectedClaim.employee} subtitleOverride={selectedClaim.employee.employeeCode || selectedClaim.employee.email} />
              </div>
            </div>
            <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reviewer</p>
              <div className="mt-3">
                <AvatarPill person={selectedClaim.reviewer} subtitleOverride={selectedClaim.reviewer.role === 'hr_admin' ? 'HR Admin Reviewer' : selectedClaim.reviewer.employeeCode || selectedClaim.reviewer.email} />
              </div>
            </div>
            <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reporting Manager</p>
              <div className="mt-3">
                {selectedClaim.reportingManager ? (
                  <AvatarPill person={selectedClaim.reportingManager} subtitleOverride={selectedClaim.reportingManager.employeeCode || selectedClaim.reportingManager.email || 'Reporting Manager'} />
                ) : (
                  <p className="text-sm font-semibold text-on-surface">Not assigned</p>
                )}
              </div>
            </div>
            <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Last Review Note</p>
              <p className="mt-3 text-sm leading-6 text-on-surface">{selectedClaim.reviewNote || 'No review note added yet.'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6">
          <div className="mb-5">
            <h3 className="text-xl font-headline font-bold text-on-surface">Expense Items</h3>
            <p className="mt-1 text-sm text-on-surface-variant">Structured item breakdown with receipts attached per line where available.</p>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-outline-variant/10">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    {['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Receipts'].map((label) => (
                      <th key={label} className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {selectedClaim.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 text-sm font-medium text-on-surface">{formatExpenseDate(item.expenseDate)}</td>
                      <td className="px-5 py-4 text-sm text-on-surface">{item.categoryLabel}</td>
                      <td className="px-5 py-4 text-sm text-on-surface">{item.description}</td>
                      <td className="px-5 py-4 text-sm text-on-surface">{item.vendorName || '-'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-on-surface">
                        {formatExpenseMoney(item.amount, selectedClaim.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {(attachmentsByItemId[item.id] || []).length ? (
                            (attachmentsByItemId[item.id] || []).map((attachment) => (
                              <AttachmentLink key={attachment.id} attachment={attachment} />
                            ))
                          ) : (
                            <p className="text-sm text-on-surface-variant">No receipt attached.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6">
            <div className="mb-5">
              <h3 className="text-xl font-headline font-bold text-on-surface">Claim Timeline</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Every submission, correction loop, and final decision stays visible in a cleaner approval trail.</p>
            </div>
            <div className="space-y-4">
              {selectedClaim.reviews.map((review, index) => (
                <TimelineEntry
                  key={review.id}
                  isLast={index === selectedClaim.reviews.length - 1}
                  person={review.reviewer}
                  title={review.reviewer.name}
                  badge={review.actionLabel}
                  timestamp={formatExpenseDateTime(review.createdAt)}
                  note={review.note}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {selectedClaim.attachments.filter((attachment) => !attachment.claimItemId).length > 0 ? (
              <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6">
                <h3 className="text-xl font-headline font-bold text-on-surface">General Attachments</h3>
                <div className="mt-4 space-y-3">
                  {selectedClaim.attachments
                    .filter((attachment) => !attachment.claimItemId)
                    .map((attachment) => (
                      <AttachmentLink key={attachment.id} attachment={attachment} />
                    ))}
                </div>
              </div>
            ) : null}

            {selectedClaim.canReview ? (
              <div className="rounded-[2rem] border border-violet-200 bg-[linear-gradient(180deg,#fdfbff_0%,#f7f3ff_100%)] p-6 shadow-[0_22px_44px_rgba(109,40,217,0.08)]">
                <h3 className="text-xl font-headline font-bold text-on-surface">Review Decision</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Approve, reject, or send this claim back for correction. Rejection and correction loops should include a clear note.
                </p>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  rows={5}
                  placeholder="Add a decision note for the employee."
                  className="mt-5 w-full resize-none rounded-[1.5rem] border border-outline-variant/20 bg-white px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    disabled={isReviewSubmitting}
                    onClick={() => submitReview('needs_changes')}
                    className="rounded-full border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    Needs Changes
                  </button>
                  <button
                    type="button"
                    disabled={isReviewSubmitting}
                    onClick={() => submitReview('rejected')}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isReviewSubmitting}
                    onClick={() => submitReview('approved')}
                    className="rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,40,217,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderClaimForm = () => (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-[2.4rem] border border-outline-variant/10 bg-surface-container-lowest p-7 shadow-[0_24px_48px_rgba(15,23,42,0.05)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">
              {editingClaimId ? 'Resubmit Claim' : 'Claim Expense'}
            </p>
            <h2 className="mt-2 text-3xl font-headline font-bold tracking-tight text-on-surface">
              {editingClaimId ? 'Update and Resubmit' : 'Create a Company Expense Claim'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Submit travel, client, operational, or project spending with a structured breakdown and receipts in one clean request.
            </p>
          </div>
          {editingClaimId ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-full border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-violet-200 hover:text-violet-700"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Claim Title</label>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="April client visit reimbursement"
              className="w-full rounded-[1.4rem] border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reviewer</label>
            <select
              value={draft.reviewerAuthUserId}
              onChange={(event) => setDraft((current) => ({ ...current, reviewerAuthUserId: event.target.value }))}
              className="w-full rounded-[1.4rem] border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            >
              <option value="">Select reviewer</option>
              {reviewerOptions.map((reviewer) => (
                <option key={reviewer.authUserId} value={reviewer.authUserId}>
                  {reviewer.name} {reviewer.role === 'hr_admin' ? '(HR Admin)' : reviewer.employeeCode ? `(${reviewer.employeeCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_0.6fr]">
          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Business Purpose</label>
            <textarea
              rows={4}
              value={draft.purpose}
              onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))}
              placeholder="Explain why this expense was incurred for the company."
              className="w-full resize-none rounded-[1.6rem] border border-outline-variant/20 bg-surface-container-low px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div className="grid gap-5">
            <div>
              <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Currency</label>
              <select
                value={draft.currency}
                onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}
                className="w-full rounded-[1.4rem] border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[1.6rem] border border-violet-100 bg-violet-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Reporting Manager</p>
              <div className="mt-3">
                {listData?.reportingManager ? (
                  <AvatarPill
                    person={listData.reportingManager}
                    subtitleOverride={listData.reportingManager.employeeCode || listData.reportingManager.email || 'Reporting Manager'}
                  />
                ) : (
                  <p className="text-sm font-semibold text-violet-950">Not assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Expense Line Items</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Keep the claim clear by breaking it into individual spend entries.</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {draft.items.map((item, index) => (
              <div key={item.localId} className="rounded-[1.8rem] border border-outline-variant/10 bg-surface-container-low p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-on-surface">Expense Item {index + 1}</p>
                  {draft.items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item.localId)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Expense Date</label>
                    <input
                      type="date"
                      value={item.expenseDate}
                      onChange={(event) => updateItem(item.localId, (current) => ({ ...current, expenseDate: event.target.value }))}
                      className="w-full rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Category</label>
                    <select
                      value={item.category}
                      onChange={(event) => updateItem(item.localId, (current) => ({ ...current, category: event.target.value }))}
                      className="w-full rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Vendor</label>
                    <input
                      type="text"
                      value={item.vendorName}
                      onChange={(event) => updateItem(item.localId, (current) => ({ ...current, vendorName: event.target.value }))}
                      placeholder="Uber, hotel, cafe"
                      className="w-full rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(event) => updateItem(item.localId, (current) => ({ ...current, amount: event.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>

                <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="flex h-full flex-col">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Description</label>
                    <textarea
                      rows={5}
                      value={item.description}
                      onChange={(event) => updateItem(item.localId, (current) => ({ ...current, description: event.target.value }))}
                      placeholder="Describe what was purchased or reimbursed."
                      className="h-full min-h-[170px] w-full resize-none rounded-[1.3rem] border border-outline-variant/20 bg-white px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>

                  <div className="flex h-full flex-col">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Receipts</label>
                    <label className="flex min-h-[170px] flex-1 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-violet-200 bg-white px-4 py-4 text-center transition hover:border-violet-300 hover:bg-violet-50/30">
                      <span className="material-symbols-outlined text-3xl text-violet-600">upload_file</span>
                      <span className="mt-3 text-sm font-semibold text-on-surface">Drop receipts here or click to browse</span>
                      <span className="mt-1 text-xs text-on-surface-variant">PDF, PNG, JPG, DOC, XLS</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          updateItem(item.localId, (current) => ({ ...current, files }));
                        }}
                      />
                    </label>
                    {item.files.length ? (
                      <div className="mt-3 space-y-2">
                        {item.files.map((file) => (
                          <div key={`${item.localId}-${file.name}`} className="rounded-xl bg-white px-3 py-2 text-xs text-on-surface-variant">
                            {file.name}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2.2rem] border border-outline-variant/10 bg-[linear-gradient(180deg,#fdfbff_0%,#f4efff_100%)] p-6 shadow-[0_20px_40px_rgba(109,40,217,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">Expense Summary</p>
          <p className="mt-3 text-4xl font-headline font-bold text-violet-950">
            {formatExpenseMoney(totalDraftAmount, draft.currency)}
          </p>
          <div className="mt-5 space-y-3 text-sm text-violet-950">
            <div className="flex items-center justify-between gap-4">
              <span className="text-violet-900/70">Reviewer</span>
              <span className="font-semibold">
                {reviewerOptions.find((reviewer) => reviewer.authUserId === draft.reviewerAuthUserId)?.name || 'Not selected'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-violet-900/70">Currency</span>
              <span className="font-semibold">{draft.currency}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-violet-900/70">Line Items</span>
              <span className="font-semibold">{draft.items.length}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={submitClaim}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-[1.4rem] bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(109,40,217,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isSubmitting ? (editingClaimId ? 'Resubmitting...' : 'Submitting...') : editingClaimId ? 'Resubmit Claim' : 'Submit Claim'}
          </button>
        </div>

        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Before You Submit</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
            <li>Use one claim title for a single business trip, visit, or reimbursement theme.</li>
            <li>Keep each spend in a separate line item so the reviewer can approve faster.</li>
            <li>Attach receipts at the item level wherever possible for cleaner finance audit trails.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    if (activeSection === 'claim' && isEmployeeView) {
      return renderClaimForm();
    }

    if (activeSection === 'my-claims') {
      return (
        <ClaimsSection
          title="Pending And Needs Changes"
          subtitle="Track the expense claims you have submitted and the ones returned for correction."
          claims={pendingClaims}
          emptyTitle="No active claims in your queue"
          emptyIcon="inventory_2"
          emptyMessage="No active expense claims are waiting in your queue."
          onOpen={openClaim}
        />
      );
    }

    if (activeSection === 'review') {
      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-2xl font-headline font-bold text-on-surface">Pending Review</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Review expense claims month-wise, export the current list, then approve or reject them one by one in the portal.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Select Month</label>
                <select
                  value={reviewMonth}
                  onChange={(event) => setReviewMonth(event.target.value)}
                  className="min-w-[220px] rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                >
                  <option value="all">All Months</option>
                  {reviewMonthOptions.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={exportPendingReviews}
                className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-outline-variant/20 bg-white px-4 py-3 text-sm font-semibold text-on-surface transition hover:border-violet-200 hover:text-violet-700"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export
              </button>
            </div>
          </div>

          <ClaimsSection
            title="Pending Review"
            subtitle="These expense claims are assigned to you for action right now."
            claims={filteredPendingReviewClaims}
            emptyTitle="No claims pending review"
            emptyIcon="fact_check"
            emptyMessage="No expense claims are pending for the selected month."
            onOpen={openClaim}
            hideHeader
          />
        </div>
      );
    }

    if (activeSection === 'history' && isEmployeeView) {
      return (
        <div className="space-y-8">
          <div className="flex justify-start">
            <div className="inline-flex rounded-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              {[
                { id: 'mine' as const, label: 'My History', icon: 'account_circle' },
                { id: 'reviewed' as const, label: 'Reviewed By Me', icon: 'fact_check' },
              ].map((item) => {
                const isActive = historyMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHistoryMode(item.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {historyMode === 'mine' ? (
            <ClaimsSection
              title="My Expense History"
              subtitle="Approved and rejected claims that you submitted as an employee."
              claims={myHistoryClaims}
              emptyTitle="No expense history yet"
              emptyIcon="history"
              emptyMessage="You have no completed expense claim history yet."
              onOpen={openClaim}
              hideHeader
            />
          ) : (
            <ClaimsSection
              title="Reviewed By Me"
              subtitle="Claims where you were the reviewer and already completed a decision."
              claims={reviewedByMeClaims}
              emptyTitle="No reviewed claims yet"
              emptyIcon="task_alt"
              emptyMessage="You have not reviewed any expense claims yet."
              onOpen={openClaim}
              hideHeader
            />
          )}
        </div>
      );
    }

    return (
      <ClaimsSection
        title="Reviewed History"
        subtitle="Completed review decisions with the latest outcome and full detail access."
        claims={reviewedByMeClaims}
        emptyTitle="No reviewed expense claims yet"
        emptyIcon="history"
        emptyMessage="No reviewed expense claims are available in this section yet."
        onOpen={openClaim}
      />
    );
  };

  return (
    <div className={`mx-auto ${variant === 'admin' ? 'max-w-7xl space-y-5 px-4 pt-4 pb-6 lg:px-5 lg:pt-5' : 'max-w-7xl space-y-6 pb-8'}`}>
      <EmployeePageHeader
        icon="receipt_long"
        title="Expense Claims"
        description="Capture company spend with a cleaner submission flow, structured item breakdowns, receipt uploads, and a sharper review experience."
        compact={variant === 'admin'}
      />

      <section className="overflow-x-auto">
        <div className={`relative inline-grid min-w-[420px] grid-flow-col auto-cols-fr items-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] shadow-[0_16px_30px_rgba(15,23,42,0.05)] ${variant === 'admin' ? 'rounded-[1.05rem] p-1' : 'rounded-[1.25rem] p-1'}`}>
          {currentSections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  resetDetail();
                  setActiveSection(section.id);
                }}
                className={`relative z-10 inline-flex items-center justify-center gap-2 font-semibold transition-all ${variant === 'admin' ? 'rounded-[0.85rem] px-3.5 py-2.5 text-[13px]' : 'rounded-[1rem] px-4 py-3 text-sm'} ${
                  isActive
                    ? 'bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] text-violet-950 shadow-[0_12px_24px_rgba(167,139,250,0.18)]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`material-symbols-outlined ${variant === 'admin' ? 'text-[17px]' : 'text-[18px]'}`}>{section.icon}</span>
                {section.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <LoadingPanel
          title="Loading expense claims"
          message="We are preparing your claims, review inbox, and detailed reimbursement data."
        />
      ) : error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : isEmployeeView && listData?.setupPending ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          Expense claim database setup is pending. Apply the latest expense claim migration first.
        </div>
      ) : !isEmployeeView && reviewData.setupPending ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          Expense claim database setup is pending. Apply the latest expense claim migration first.
        </div>
      ) : selectedClaimId ? (
        renderClaimDetail()
      ) : (
        renderSectionContent()
      )}
    </div>
  );
}
