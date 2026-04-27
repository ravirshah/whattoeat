// src/app/home/page.tsx
// Authenticated home dashboard — renders after onboarding is complete.
// Pure Server Component. Middleware gates this route for authenticated users only.

import { CheckinPeek } from '@/components/feature/home/CheckinPeek';
import { FeedMeCta } from '@/components/feature/home/FeedMeCta';
import { HomeMacroRing } from '@/components/feature/home/HomeMacroRing';
import { LastCookedCard } from '@/components/feature/home/LastCookedCard';
import { PantryStat } from '@/components/feature/home/PantryStat';
import { ProactiveBrief } from '@/components/feature/home/ProactiveBrief';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import { getTodayCheckin } from '@/server/checkin';
import { listForUser } from '@/server/pantry/repo';
import { getMyProfile } from '@/server/profile';
import { listCookedLog } from '@/server/recipes';

export default async function HomePage() {
  const { userId } = await requireUser();
  const supabase = await createServerClient();

  const [profile, pantryItems, todayCheckin, cookedLog] = await Promise.all([
    getMyProfile(),
    listForUser(supabase, userId).catch(() => [] as Awaited<ReturnType<typeof listForUser>>),
    getTodayCheckin().catch(() => null),
    listCookedLog(30).catch(() => [] as Awaited<ReturnType<typeof listCookedLog>>),
  ]);

  const lastCooked = cookedLog[0] ?? null;
  const displayName = profile?.display_name ?? 'there';
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 pb-12 sm:px-6">
        {/* Greeting */}
        <header className="pt-6 pb-5 sm:pt-10 sm:pb-7">
          <p className="text-[13px] font-medium text-muted-foreground">
            Good {tod}, {displayName}
          </p>
          <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground leading-tight">
            What would you like to eat?
          </h1>
        </header>

        {/* Proactive brief — the first thing the AI tells you about today */}
        <div className="bento-rise bento-rise-1">
          <ProactiveBrief
            profile={profile}
            checkin={todayCheckin}
            pantryItemCount={pantryItems.length}
            hour={hour}
          />
        </div>

        {/* Hero CTA */}
        <div className="mt-4 bento-rise bento-rise-2">
          <FeedMeCta />
        </div>

        {/* Today's macros — full-width, the most-glanced surface */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6 bento-rise bento-rise-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today&apos;s macros
          </p>
          <div className="mt-3">
            <HomeMacroRing profile={profile} checkin={todayCheckin} />
          </div>
        </section>

        {/* Action row — tighter than the previous bento */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bento-rise bento-rise-4">
          <PantryStat itemCount={pantryItems.length} />
          <CheckinPeek checkin={todayCheckin} />
        </div>

        {lastCooked && (
          <div className="mt-4 bento-rise bento-rise-4">
            <LastCookedCard entry={lastCooked} />
          </div>
        )}
      </div>
    </div>
  );
}
