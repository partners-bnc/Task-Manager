'use client';

import Loader from '@/components/ui/loader';

export function BrandedFullPageLoader({ eyebrow, title, message } = {}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc]">
      <Loader />
    </div>
  );
}

export function WorkspaceShellLoader({ title, message } = {}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc]">
      <Loader />
    </div>
  );
}

export function ModuleCardsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 w-full animate-pulse">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="relative block w-full h-[300px] overflow-hidden rounded-[28px] border border-violet-200/70 bg-slate-300/30 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
        >
          {/* Status Badge Placeholder */}
          <div className="absolute top-4 right-4 z-20 h-6 w-20 rounded-full bg-slate-300/60" />

          {/* White Bottom Overlay Placeholder (35%) */}
          <div className="absolute bottom-0 inset-x-0 h-[35%] bg-gradient-to-t from-white via-white/80 to-transparent flex items-end pb-5 px-6 z-20">
            <div className="h-5 w-24 rounded bg-slate-300/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
