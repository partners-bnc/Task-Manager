'use client';

export default function FollowUpsPage() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Page Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
          Follow Ups
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Track and manage your lead follow-up activities
        </p>
      </div>

      {/* Coming Soon Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Upcoming Feature
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Follow-up tracking is coming soon. You will be able to schedule, view, and manage all your lead follow-ups from here.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          In Development
        </span>
      </div>
    </div>
  );
}
