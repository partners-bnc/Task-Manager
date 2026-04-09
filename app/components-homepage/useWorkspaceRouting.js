'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const DEFAULT_WORKSPACE_STATE = {
  isAuthenticated: false,
  accountType: null,
  taskManagerHref: '/login',
};

export function useWorkspaceRouting() {
  const [workspaceState, setWorkspaceState] = useState(DEFAULT_WORKSPACE_STATE);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const loadWorkspaceState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        setWorkspaceState(DEFAULT_WORKSPACE_STATE);
        return;
      }

      try {
        const response = await fetch('/api/auth/context', {
          method: 'GET',
          credentials: 'include',
        });

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setWorkspaceState({
            isAuthenticated: true,
            accountType: null,
            taskManagerHref: '/login',
          });
          return;
        }

        const result = await response.json();

        setWorkspaceState({
          isAuthenticated: Boolean(result?.authenticated),
          accountType: result?.accountType || null,
          taskManagerHref: result?.taskManagerHref || '/login',
        });
      } catch {
        if (isMounted) {
          setWorkspaceState({
            isAuthenticated: true,
            accountType: null,
            taskManagerHref: '/login',
          });
        }
      }
    };

    loadWorkspaceState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadWorkspaceState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return workspaceState;
}
