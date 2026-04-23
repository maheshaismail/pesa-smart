/**
 * Returns the canonical site URL for auth email redirects.
 *
 * Priority order:
 * 1. VITE_SITE_URL env var (set in Netlify build settings)
 * 2. Hardcoded production Netlify URL when running on the Netlify domain
 * 3. window.location.origin (works for Lovable preview & local dev)
 *
 * IMPORTANT: For email verification to land on Netlify, also set the
 * "Site URL" in your backend auth settings to https://pesa-smart.netlify.app
 */
const PRODUCTION_URL = 'https://pesa-smart.netlify.app';

export function getSiteUrl(): string {
  const envUrl = import.meta.env.VITE_SITE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // If running on Netlify, always use the canonical Netlify URL
    if (host.endsWith('netlify.app') || host === 'pesa-smart.netlify.app') {
      return PRODUCTION_URL;
    }
    // Otherwise use whatever origin the user is on (Lovable preview, localhost)
    return window.location.origin;
  }

  return PRODUCTION_URL;
}
