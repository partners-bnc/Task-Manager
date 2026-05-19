'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type HrmFeedbackType = 'success' | 'error' | 'warning' | 'info';

type HrmFeedbackPayload = {
  type?: HrmFeedbackType;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  linkLabel?: string;
  linkValue?: string;
  linkHint?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: (() => void | Promise<void>) | null;
};

type ActiveFeedback = HrmFeedbackPayload & {
  mode: 'message' | 'confirm';
};

type HrmFeedbackContextValue = {
  showFeedback: (payload: HrmFeedbackPayload | string) => void;
  confirmFeedback: (payload: HrmFeedbackPayload | string) => Promise<boolean>;
};

const HrmFeedbackContext = createContext<HrmFeedbackContextValue | null>(null);

const FEEDBACK_META: Record<HrmFeedbackType, { icon: string; title: string; badgeClass: string }> = {
  success: {
    icon: 'task_alt',
    title: 'Success',
    badgeClass: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
  },
  error: {
    icon: 'error',
    title: 'Action Needed',
    badgeClass: 'bg-rose-100 text-rose-700 ring-rose-200/80',
  },
  warning: {
    icon: 'warning',
    title: 'Please Check',
    badgeClass: 'bg-amber-100 text-amber-700 ring-amber-200/80',
  },
  info: {
    icon: 'info',
    title: 'Notice',
    badgeClass: 'bg-violet-100 text-violet-700 ring-violet-200/80',
  },
};

function normalizePayload(payload: HrmFeedbackPayload | string): HrmFeedbackPayload {
  return typeof payload === 'string' ? { message: payload } : payload;
}

export function HrmFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [activeFeedback, setActiveFeedback] = useState<ActiveFeedback | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const [secondaryActionLoading, setSecondaryActionLoading] = useState(false);
  const [secondaryActionDone, setSecondaryActionDone] = useState(false);

  const resolveConfirm = useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
  }, []);

  const closeFeedback = useCallback(() => {
    if (activeFeedback?.mode === 'confirm') {
      resolveConfirm(false);
    }
    setSecondaryActionLoading(false);
    setSecondaryActionDone(false);
    setActiveFeedback(null);
  }, [activeFeedback?.mode, resolveConfirm]);

  const showFeedback = useCallback((payload: HrmFeedbackPayload | string) => {
    setSecondaryActionDone(false);
    setActiveFeedback({
      type: 'info',
      ...normalizePayload(payload),
      mode: 'message',
    });
  }, []);

  const confirmFeedback = useCallback((payload: HrmFeedbackPayload | string) => {
    resolveConfirm(false);
    setSecondaryActionDone(false);
    setActiveFeedback({
      type: 'warning',
      ...normalizePayload(payload),
      mode: 'confirm',
    });

    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, [resolveConfirm]);

  const confirmAction = useCallback(() => {
    resolveConfirm(true);
    setSecondaryActionLoading(false);
    setSecondaryActionDone(false);
    setActiveFeedback(null);
  }, [resolveConfirm]);

  const runSecondaryAction = useCallback(async () => {
    if (!activeFeedback?.onSecondaryAction || secondaryActionLoading) return;
    try {
      setSecondaryActionLoading(true);
      await activeFeedback.onSecondaryAction();
      setSecondaryActionDone(true);
    } finally {
      setSecondaryActionLoading(false);
    }
  }, [activeFeedback, secondaryActionLoading]);

  useEffect(() => {
    if (!activeFeedback) return;
    const timer = window.setTimeout(() => okButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [activeFeedback]);

  useEffect(() => {
    if (!secondaryActionDone) return;
    const timer = window.setTimeout(() => setSecondaryActionDone(false), 1800);
    return () => window.clearTimeout(timer);
  }, [secondaryActionDone]);

  useEffect(() => {
    if (!activeFeedback) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (activeFeedback.mode === 'message') {
        closeFeedback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFeedback, closeFeedback]);

  const value = useMemo(() => ({ showFeedback, confirmFeedback }), [confirmFeedback, showFeedback]);
  const type = activeFeedback?.type || 'info';
  const meta = FEEDBACK_META[type];
  const title = activeFeedback?.title || meta.title;

  return (
    <HrmFeedbackContext.Provider value={value}>
      {children}
      {activeFeedback ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-violet-950/12 px-4 py-6 backdrop-blur-[3px]">
          <div
            role={activeFeedback.mode === 'confirm' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby="hrm-feedback-title"
            aria-describedby="hrm-feedback-message"
            className="w-full max-w-[640px] overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#fcfbff_40%,#f2ebff_100%)] p-7 shadow-[0_28px_72px_rgba(76,29,149,0.20),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-violet-100/70"
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] ring-1 ${meta.badgeClass}`}>
                <span className="material-symbols-outlined text-[32px]">{meta.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p id="hrm-feedback-title" className="font-headline text-[1.9rem] font-extrabold leading-none text-on-surface">
                  {title}
                </p>
                <p id="hrm-feedback-message" className="mt-4 whitespace-pre-wrap text-base leading-7 text-on-surface-variant">
                  {activeFeedback.message}
                </p>
              </div>
            </div>

            {activeFeedback.linkValue ? (
              <div className="mt-6 rounded-[1.6rem] border border-violet-100 bg-[linear-gradient(180deg,rgba(248,245,255,0.95)_0%,rgba(242,236,255,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">
                      {activeFeedback.linkLabel || 'Secure Link'}
                    </p>
                    <div className="mt-3 rounded-2xl border border-violet-200/80 bg-white/95 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                      <input
                        ref={linkInputRef}
                        readOnly
                        value={activeFeedback.linkValue}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        className="w-full overflow-x-auto bg-transparent font-mono text-sm leading-6 text-violet-950 outline-none"
                      />
                    </div>
                    {activeFeedback.linkHint ? (
                      <p className="mt-3 text-sm text-violet-700/80">{activeFeedback.linkHint}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={runSecondaryAction}
                    disabled={!activeFeedback.onSecondaryAction || secondaryActionLoading}
                    className={`rounded-full border px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      secondaryActionDone
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
                        : 'border-violet-200 bg-white/90 text-violet-800 hover:bg-violet-50'
                    }`}
                  >
                    {secondaryActionLoading ? 'Copying...' : secondaryActionDone ? 'Copied' : activeFeedback.secondaryActionLabel || 'Copy Link'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex justify-end gap-3">
              {activeFeedback.mode === 'confirm' ? (
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="rounded-full border border-violet-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {activeFeedback.cancelLabel || 'Cancel'}
                </button>
              ) : null}
              <button
                ref={okButtonRef}
                type="button"
                onClick={activeFeedback.mode === 'confirm' ? confirmAction : closeFeedback}
                className="rounded-full bg-[linear-gradient(180deg,#efe7ff_0%,#d8c7ff_100%)] px-6 py-2.5 text-sm font-extrabold text-violet-950 shadow-[0_12px_22px_rgba(139,92,246,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(139,92,246,0.22)] focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {activeFeedback.mode === 'confirm' ? activeFeedback.confirmLabel || 'Confirm' : activeFeedback.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </HrmFeedbackContext.Provider>
  );
}

export function useHrmFeedback() {
  const context = useContext(HrmFeedbackContext);
  if (!context) {
    throw new Error('useHrmFeedback must be used inside HrmFeedbackProvider');
  }
  return context;
}
