// Canonical site origin for building absolute URLs (auth redirects, emails).
//
// Why this exists: relying on `window.location.origin` for Supabase's
// `emailRedirectTo` means the value depends on whatever URL the user is
// currently on (preview deploy, custom alias, etc). When that URL isn't in
// Supabase's redirect allow-list, Supabase silently falls back to the
// project's Site URL — which in our case was localhost, so prod magic links
// landed on localhost.
//
// Resolution order:
//   1. NEXT_PUBLIC_APP_URL — explicit override; set this in Vercel prod.
//   2. NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL — Vercel auto-injects when
//      "Automatically expose System Environment Variables" is enabled.
//   3. NEXT_PUBLIC_VERCEL_URL — current deployment URL (preview-safe).
//   4. window.location.origin — browser fallback for local dev.
//   5. http://localhost:3000 — server-side dev fallback.

function withProtocol(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return trimTrailingSlash(withProtocol(explicit));

  const prodUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return trimTrailingSlash(withProtocol(prodUrl));

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) return trimTrailingSlash(withProtocol(vercelUrl));

  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return 'http://localhost:3000';
}
