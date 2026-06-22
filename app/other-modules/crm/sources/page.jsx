'use client';

export default function LeadSourcesPage() {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Page Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
          Lead Sources
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Manage and analyse where your leads are coming from
        </p>
      </div>

      {/* Coming Soon Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-violet-400 dark:text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.121m-1.5-2.121c.251.023.501.05.75.082M19 14.5l-4.091-4.091A2.25 2.25 0 0114.25 8.82V3.104m0 0c-.251.023-.501.05-.75.082M9 21h6m-6 0a3 3 0 01-3-3v-1.5a3 3 0 013-3h6a3 3 0 013 3V18a3 3 0 01-3 3m-6 0h6" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Upcoming Feature
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Lead source analytics and management is coming soon. Track which channels bring the most valuable leads.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-500 dark:text-violet-400 border border-violet-100 dark:border-violet-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          In Development
        </span>
      </div>
    </div>
  );
}
