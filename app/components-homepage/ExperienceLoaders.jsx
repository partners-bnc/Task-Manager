'use client';

function SpinnerRing({
  sizeClass = 'h-11 w-11',
  trackClass = 'border-slate-200',
  accentClass = 'border-t-teal-500',
}) {
  return <div className={`${sizeClass} animate-spin rounded-full border-[3px] ${trackClass} ${accentClass}`} />;
}

export function BrandedFullPageLoader({
  eyebrow = 'Preparing Workspace',
  title = 'Loading',
  message = 'Please wait while we finish loading everything for you.',
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.32),transparent_30%)]" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
          {eyebrow}
        </div>
        <div className="mt-8 flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#ecfeff_100%)] shadow-[0_18px_50px_rgba(13,148,136,0.16)]">
            <div className="absolute inset-0 rounded-full bg-teal-100/60 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white bg-white shadow-sm">
              <SpinnerRing />
            </div>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">{message}</p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="h-2 rounded-full bg-slate-100" />
          <div className="h-2 rounded-full bg-teal-100" />
          <div className="h-2 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function WorkspaceShellLoader({
  title = 'Loading workspace',
  message = 'We are preparing your dashboard, permissions, and latest data.',
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-5 md:p-6">
      <div className="mx-auto flex max-w-[1500px] gap-5">
        <aside className="hidden min-h-[calc(100vh-3rem)] w-20 shrink-0 rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:flex md:flex-col md:items-center">
          <div className="h-11 w-11 rounded-2xl bg-slate-100" />
          <div className="mt-6 h-24 w-10 rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-10 rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-10 rounded-full bg-slate-100" />
          <div className="mt-auto h-10 w-10 rounded-full bg-slate-100" />
        </aside>

        <div className="flex-1 space-y-5">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Workspace Loading
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{message}</p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center self-start rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#ecfeff_100%)] shadow-[0_18px_45px_rgba(13,148,136,0.16)]">
                <SpinnerRing />
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                <div className="mt-5 h-4 w-32 rounded-full bg-slate-100" />
                <div className="mt-3 h-8 w-24 rounded-2xl bg-slate-100" />
                <div className="mt-4 h-3 w-full rounded-full bg-slate-100" />
                <div className="mt-2 h-3 w-4/5 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="h-5 w-44 rounded-full bg-slate-100" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 6 }, (_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-3">
                  <div className="h-12 rounded-2xl bg-slate-100" />
                  <div className="h-12 rounded-2xl bg-slate-100" />
                  <div className="h-12 rounded-2xl bg-slate-100" />
                  <div className="h-12 rounded-2xl bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleCardsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-violet-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,255,0.96))] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08),0_3px_0_rgba(226,232,240,0.9)]"
        >
          <div className="mb-10 flex items-start justify-between gap-4">
            <div className="h-14 w-14 rounded-2xl bg-violet-100" />
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>
          <div className="h-9 w-40 rounded-2xl bg-slate-100" />
          <div className="mt-4 h-3 w-full rounded-full bg-slate-100" />
          <div className="mt-3 h-3 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-3 h-3 w-4/6 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
