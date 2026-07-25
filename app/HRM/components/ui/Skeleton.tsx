'use client';

import React from 'react';
import Loader from '@/components/ui/loader';

export function Skeleton({
  className = '',
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export function Spinner({
  sizeClass = 'h-10 w-10',
  ringClass = 'border-violet-200',
  accentClass = 'border-t-violet-600',
}: {
  sizeClass?: string;
  ringClass?: string;
  accentClass?: string;
}) {
  return <div className={`${sizeClass} rounded-full border-4 ${ringClass} ${accentClass} animate-spin`} />;
}

export function LoadingPanel({
  title = 'Loading data',
  message = 'Please wait while we prepare this section.',
  className = '',
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex w-full items-center justify-center py-16 ${className}`}>
      <Loader />
    </div>
  );
}

export function MetricCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/70 bg-surface-container-lowest px-5 py-5 shadow-[0_18px_38px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableRowsSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-11 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-[1.75rem]" />
    </div>
  );
}

export function ShellSkeleton({
  sidebarWidthClass = 'w-60',
}: {
  sidebarWidthClass?: string;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className={`${sidebarWidthClass} fixed left-0 top-0 hidden h-screen bg-surface-container-low px-6 py-5 md:block`}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-100/80 blur-2xl" />
            <Skeleton className="relative h-24 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-full" />
          ))}
        </div>
      </aside>

      <div className="flex-1 px-4 py-4 md:ml-64 md:px-6 md:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-surface-container-lowest px-6 py-6 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <div className="hidden md:flex h-20 w-20 items-center justify-center rounded-full bg-violet-50">
                <Spinner sizeClass="h-9 w-9" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="h-72" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
