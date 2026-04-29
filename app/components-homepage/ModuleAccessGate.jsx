'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BrandedFullPageLoader } from './ExperienceLoaders';
import { buildDefaultWorkspaceState, fetchWorkspaceState } from './workspaceAuthClient';

export function ModuleAccessGate({
  moduleKey,
  moduleLabel,
  children,
}) {
  const [state, setState] = useState(() => ({
    ...buildDefaultWorkspaceState(),
    authenticated: false,
    enabled: false,
    href: null,
    error: '',
  }));

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      try {
        const result = await fetchWorkspaceState();

        if (!active) return;

        const moduleState = result.modules?.[moduleKey];

        setState({
          loading: false,
          authenticated: Boolean(result.isAuthenticated),
          enabled: Boolean(moduleState?.enabled),
          href: moduleState?.href || null,
          error: '',
        });
      } catch (error) {
        if (!active) return;

        setState({
          loading: false,
          authenticated: false,
          enabled: false,
          href: null,
          error: error?.message || 'Failed to check module access.',
        });
      }
    }

    loadAccess();
    return () => {
      active = false;
    };
  }, [moduleKey]);

  if (state.loading) {
    return (
      <BrandedFullPageLoader
        eyebrow={`${moduleLabel} Access`}
        title={`Opening ${moduleLabel}`}
        message="Checking your access and preparing the latest module data so everything appears together."
      />
    );
  }

  if (!state.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">Login Required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Please log in to open the {moduleLabel} module.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
            >
              Go To Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!state.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff7f7_0%,#fff1f2_100%)] p-4">
        <div className="w-full max-w-lg rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <span className="material-symbols-outlined text-[30px]">lock</span>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">No Access To {moduleLabel}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            You do not have access to this module right now. Please contact HR Admin if this access should be enabled.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/other-modules"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
            >
              Back To Modules
            </Link>
            <Link
              href="/"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
            >
              Home
            </Link>
          </div>
          {state.error ? (
            <p className="mt-4 text-xs text-red-600">{state.error}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return children;
}
