const WORKSPACE_AUTH_CACHE_KEY = 'workspace-auth-context-v1';

function buildDefaultModules() {
  return {
    taskManager: { enabled: false, href: null },
    hrm: { enabled: false, href: null },
    auditing: { enabled: false, href: null },
    crm: { enabled: false, href: null },
  };
}

export function buildDefaultWorkspaceState() {
  return {
    loading: true,
    isAuthenticated: false,
    accountType: null,
    workspaceHref: '/login',
    taskManagerHref: '/login',
    user: null,
    modules: buildDefaultModules(),
  };
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function normalizeWorkspaceState(result = {}) {
  const modules = {
    ...buildDefaultModules(),
    ...(result?.modules || {}),
  };

  return {
    loading: false,
    isAuthenticated: Boolean(result?.authenticated ?? result?.isAuthenticated),
    accountType: result?.accountType || null,
    workspaceHref: result?.workspaceHref || result?.destination || '/login',
    taskManagerHref: result?.taskManagerHref || '/login',
    user: result?.user || null,
    modules: {
      taskManager: {
        enabled: Boolean(modules.taskManager?.enabled),
        href: modules.taskManager?.href || null,
      },
      hrm: {
        enabled: Boolean(modules.hrm?.enabled),
        href: modules.hrm?.href || null,
      },
      auditing: {
        enabled: Boolean(modules.auditing?.enabled),
        href: modules.auditing?.href || null,
      },
      crm: {
        enabled: Boolean(modules.crm?.enabled),
        href: modules.crm?.href || null,
      },
    },
  };
}

export function readCachedWorkspaceState() {
  if (!canUseSessionStorage()) return null;

  try {
    const rawValue = window.sessionStorage.getItem(WORKSPACE_AUTH_CACHE_KEY);
    if (!rawValue) return null;
    return normalizeWorkspaceState(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function writeCachedWorkspaceState(state) {
  if (!canUseSessionStorage() || !state || state.loading) return;

  try {
    window.sessionStorage.setItem(
      WORKSPACE_AUTH_CACHE_KEY,
      JSON.stringify({
        authenticated: Boolean(state.isAuthenticated),
        accountType: state.accountType || null,
        workspaceHref: state.workspaceHref || '/login',
        taskManagerHref: state.taskManagerHref || '/login',
        user: state.user || null,
        modules: state.modules || buildDefaultModules(),
      })
    );
  } catch {
    // Ignore cache write failures in the browser.
  }
}

export function clearCachedWorkspaceState() {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(WORKSPACE_AUTH_CACHE_KEY);
  } catch {
    // Ignore cache clear failures in the browser.
  }
}

let workspaceAuthRequest = null;

export async function fetchWorkspaceState() {
  if (!workspaceAuthRequest) {
    workspaceAuthRequest = (async () => {
      const response = await fetch('/api/auth/context', {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));
      const normalized = normalizeWorkspaceState(result);

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load workspace access.');
      }

      if (normalized.isAuthenticated) {
        writeCachedWorkspaceState(normalized);
      } else {
        clearCachedWorkspaceState();
      }

      return normalized;
    })().finally(() => {
      workspaceAuthRequest = null;
    });
  }

  return workspaceAuthRequest;
}
