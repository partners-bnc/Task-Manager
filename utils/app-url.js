const DEFAULT_APP_URL = 'https://tasks.bncglobal.in';

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

export function getAppUrl(preferredUrl = '') {
  const preferred = normalizeUrl(preferredUrl);
  if (preferred) {
    return preferred;
  }

  const configuredUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    DEFAULT_APP_URL
  );

  return configuredUrl;
}

export function getLoginUrl(preferredUrl = '') {
  return `${getAppUrl(preferredUrl)}/login`;
}
