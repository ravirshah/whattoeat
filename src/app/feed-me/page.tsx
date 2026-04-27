import { FeedMeIsland } from '@/components/feature/feed-me/FeedMeIsland';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Feed Me - WhatToEat',
  description: 'Get personalised meal recommendations based on your pantry and goals.',
};

// The page RSC does not call requireUser() — the middleware at src/middleware.ts
// already protects authenticated routes. If middleware is bypassed, the island's
// regenerateAction will redirect to /auth/login.

export default async function FeedMePage() {
  const cookieStore = await cookies();

  // Derive the client's local date from the 'tz' cookie if available.
  // The cookie value is the UTC-offset string set by the client-side timezone
  // detector (shipped in a future track). Falls back to UTC today.
  const tzOffset = cookieStore.get('tz')?.value;
  const localDate = tzOffset
    ? getLocalDateFromOffset(tzOffset)
    : new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-background">
      <div className="py-6">
        <FeedMeIsland localDate={localDate} />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives today's local date string (YYYY-MM-DD) from a UTC offset string.
 * The offset format is '+HH:MM' or '-HH:MM'.
 * Falls back to UTC today if the offset is malformed.
 */
function getLocalDateFromOffset(tzOffset: string): string {
  try {
    const sign = tzOffset.startsWith('-') ? -1 : 1;
    const [hourStr, minStr] = tzOffset.replace(/^[+-]/, '').split(':');
    const offsetMinutes =
      sign * (Number.parseInt(hourStr ?? '0', 10) * 60 + Number.parseInt(minStr ?? '0', 10));
    const now = new Date();
    const localMs = now.getTime() + offsetMinutes * 60_000;
    return new Date(localMs).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
