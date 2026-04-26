// src/app/home/page.tsx
// Authenticated home dashboard — renders after onboarding is complete.
// Pure Server Component. Middleware gates this route for authenticated users only.

import { CheckinPeek } from '@/components/feature/home/CheckinPeek';
import { FeedMeCta } from '@/components/feature/home/FeedMeCta';
import { HomeMacroRing } from '@/components/feature/home/HomeMacroRing';
import { LastCookedCard } from '@/components/feature/home/LastCookedCard';
import { PantryStat } from '@/components/feature/home/PantryStat';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import { getTodayCheckin } from '@/server/checkin';
import { listForUser } from '@/server/pantry/repo';
import { getMyProfile } from '@/server/profile';
import { listCookedLog } from '@/server/recipes';

export default async function HomePage() {
  const { userId } = await requireUser();
  const supabase = await createServerClient();

  // Parallel data fetch — all sources are independent.
  const [profile, pantryItems, todayCheckin, cookedLog] = await Promise.all([
    getMyProfile(),
    listForUser(supabase, userId).catch(() => [] as Awaited<ReturnType<typeof listForUser>>),
    getTodayCheckin().catch(() => null),
    listCookedLog(30).catch(() => [] as Awaited<ReturnType<typeof listCookedLog>>),
  ]);

  const lastCooked = cookedLog[0] ?? null;

  const displayName = profile?.display_name ?? 'there';

  return (
    <div className="min-h-dvh bg-background px-4 pb-24">
      {/* Greeting header */}
      <header className="pt-12 pb-6">
        <p className="text-sm font-medium text-muted-foreground mb-0.5">
          Good {getTimeOfDay()}, {displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          What would you like to eat?
        </h1>
      </header>

      {/* Feed Me CTA (hero action) */}
      <section className="mb-6 bento-rise">
        <FeedMeCta />
      </section>

      {/* Bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Macro ring tile */}
        <div className="sm:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 bento-rise bento-rise-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s macros
          </p>
          <HomeMacroRing profile={profile} checkin={todayCheckin} />
        </div>

        {/* Pantry stat tile */}
        <div className="bento-rise bento-rise-2">
          <PantryStat itemCount={pantryItems.length} />
        </div>

        {/* Check-in peek tile */}
        <div className="bento-rise bento-rise-3">
          <CheckinPeek checkin={todayCheckin} />
        </div>

        {/* Last cooked tile */}
        {lastCooked && (
          <div className="sm:col-span-2 bento-rise bento-rise-4">
            <LastCookedCard entry={lastCooked} />
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
