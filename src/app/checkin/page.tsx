import { CheckinForm } from '@/components/feature/checkin/CheckinForm';
import { CheckinSummary } from '@/components/feature/checkin/CheckinSummary';
import { Checkin } from '@/contracts/zod/checkin';
import { getTodayCheckin } from '@/server/checkin/actions';

export const metadata = { title: 'Daily Check-in - WhatToEat' };

/**
 * Single-screen daily check-in.
 *
 * Server Component - fetches today's check-in on the server before rendering.
 * `getTodayCheckin()` calls `requireUser()` internally; unauthenticated
 * requests are redirected to `/auth/login` before this component renders.
 *
 * TODO: accept a `localDate` search param and forward it to `getTodayCheckin`
 * so the UTC vs. local-day ambiguity is resolved at the page level.
 */
export default async function CheckinPage() {
  // Derive today's ISO date string (UTC). T8 should pass localDate instead.
  // TODO: pass client's local date once T8 wires the feed-me context.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const rawExisting = await getTodayCheckin(todayUtc);
  // Parse through the Zod schema to get strongly typed fields (training, hunger as enums).
  // The action serialises created_at to ISO string at the boundary, so we can pass through.
  const existing = rawExisting ? Checkin.parse(rawExisting) : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">Daily Check-in</h1>
        <p className="mt-1 text-sm text-text-muted">
          {existing
            ? 'You\'re all set for today. Tap "Edit" to adjust.'
            : '3 taps, ~5 seconds. How are you feeling?'}
        </p>
      </header>

      {existing ? <CheckinSummary checkin={existing} /> : <CheckinForm date={todayUtc} />}
    </main>
  );
}
