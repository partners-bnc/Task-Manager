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

    const loadWorkspaceState = async () => {
      try {
        const nextWorkspaceState = await fetchWorkspaceState();
        if (!isMounted) return;
        setWorkspaceState(nextWorkspaceState);
      } catch {
        if (isMounted) {
          const cachedWorkspaceState = readCachedWorkspaceState();
          setWorkspaceState((current) => cachedWorkspaceState || { ...current, loading: false });
        }
      }
    };

    loadWorkspaceState();

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
      loadWorkspaceState();
    });

    const handleFocus = () => {
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
