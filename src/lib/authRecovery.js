export function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, '');
  return hash ? new URLSearchParams(hash) : new URLSearchParams();
}

export function isPasswordRecoveryUrl() {
  if (typeof window === 'undefined') return false;
  if (getHashParams().get('type') === 'recovery') return true;

  const search = new URLSearchParams(window.location.search);
  return search.has('code') && window.location.pathname.endsWith('/reset-password');
}

export function hasAuthCallbackInUrl() {
  if (typeof window === 'undefined') return false;

  const hash = getHashParams();
  if (hash.get('access_token') || hash.get('type') === 'recovery') return true;

  return new URLSearchParams(window.location.search).has('code');
}

export function buildResetPasswordPath(search = '', hash = '') {
  return `/reset-password${search || ''}${hash || ''}`;
}

export function clearAuthParamsFromUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.delete('code');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  const search = url.searchParams.toString();
  window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}`);
}
