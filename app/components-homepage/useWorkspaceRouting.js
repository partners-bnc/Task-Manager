'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  buildDefaultWorkspaceState,
  clearCachedWorkspaceState,
  fetchWorkspaceState,
  readCachedWorkspaceState,
} from './workspaceAuthClient';

export function useWorkspaceRouting() {
  const [workspaceState, setWorkspaceState] = useState(() => readCachedWorkspaceState() || buildDefaultWorkspaceState());

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const loadWorkspaceState = async (force = false) => {
      try {
        const nextWorkspaceState = await fetchWorkspaceState(force);
        if (!isMounted) return;
        setWorkspaceState(nextWorkspaceState);
      } catch {
        if (isMounted) {
          const cachedWorkspaceState = readCachedWorkspaceState();
          setWorkspaceState((current) => cachedWorkspaceState || { ...current, loading: false });
        }
      }
    };

    // Always fetch fresh state on mount to reflect DB values after recent changes.
    loadWorkspaceState(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCachedWorkspaceState();
        if (isMounted) {
          setWorkspaceState({ ...buildDefaultWorkspaceState(), loading: false });
        }
        return;
      }
      // Force a fresh fetch after sign-in or other auth changes.
      loadWorkspaceState(true);
    });

    const handleFocus = () => {
      // On window focus, perform a non-forced fetch (will reuse in-flight request if present)
      loadWorkspaceState();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return workspaceState;
}
