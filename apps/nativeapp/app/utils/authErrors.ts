export function isUnverifiedEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as {code?: unknown; message?: unknown};
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (code === 'unauthorized') return true;
  if (code === 'access_denied' && message.includes('email_not_verified'))
    return true;
  if (message.includes('email_not_verified')) return true;
  return false;
}
