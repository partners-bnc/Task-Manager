'use client';

import React from 'react';

type HrmEmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
  compact?: boolean;
  className?: string;
};

export default function HrmEmptyState({
  icon = 'inbox',
  title,
  message,
  compact = false,
  className = '',
}: HrmEmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-dashed border-violet-200/70 bg-[linear-gradient(180deg,rgba(237,244,252,0.96)_0%,rgba(255,255,255,1)_100%)] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ${
        compact ? 'py-8' : 'py-12'
      } ${className}`}
    >
      <div className="pointer-events-none absolute -left-6 top-4 h-20 w-20 rounded-full bg-violet-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-blue-100/40 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/80 bg-white/90 text-violet-700 shadow-[0_16px_34px_rgba(49,112,197,0.16)]">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <h3 className="mt-5 text-lg font-headline font-bold text-on-surface">{title}</h3>
        <p className="mt-2 max-w-[28rem] text-sm leading-6 text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}
