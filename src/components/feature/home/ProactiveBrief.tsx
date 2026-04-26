import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import type { CheckinDTO } from '@/server/checkin/actions';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';

interface ProactiveBriefProps {
  profile: Profile | null;
  checkin: CheckinDTO | null;
  pantryItemCount: number;
  /** Locally-derived hour 0–23 — passed in so server-render is timezone-aware. */
  hour: number;
}

interface Brief {
  greeting: string;
  body: React.ReactNode;
  cta: { href: string; label: string };
}

// Deterministic insight that *feels* AI-generated. Uses real signal —
// time of day, check-in status, pantry depth, macro target — to compose
// a single conversational nudge with a clear next action.
function buildBrief({ profile, checkin, pantryItemCount, hour }: ProactiveBriefProps): Brief {
  const target = profile?.targets?.kcal ?? 0;
  const partOfDay =
    hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 17 ? 'afternoon' : 'evening';

  // Highest-priority nudge first.
  if (!checkin) {
    return {
      greeting: 'Quick check-in?',
      body: (
        <>
          A 15-second log of energy and training lets me tune today&apos;s picks for how you
          actually feel — not just the calendar.
        </>
      ),
      cta: { href: '/checkin', label: 'Log check-in' },
    };
  }

  if (pantryItemCount < 4) {
    return {
      greeting: 'Pantry is running thin',
      body: (
        <>
          You have <strong className="font-semibold text-foreground">{pantryItemCount}</strong>{' '}
          {pantryItemCount === 1 ? 'item' : 'items'} on hand. Tell me what&apos;s in your kitchen
          and I&apos;ll surface meals you can actually make tonight.
        </>
      ),
      cta: { href: '/pantry', label: 'Update pantry' },
    };
  }

  if (partOfDay === 'evening' && target > 0) {
    return {
      greeting: 'Dinner time',
      body: (
        <>
          Energy is{' '}
          <strong className="font-semibold text-foreground">{labelEnergy(checkin.energy)}</strong>{' '}
          and you&apos;ve got{' '}
          <strong className="font-semibold text-foreground">{pantryItemCount} pantry items</strong>{' '}
          to work with. I&apos;ll match the protein push to your macro gap.
        </>
      ),
      cta: { href: '/feed-me', label: 'Plan dinner' },
    };
  }

  if (partOfDay === 'morning') {
    return {
      greeting: 'Good morning',
      body: (
        <>
          Front-loading protein early makes the rest of the day easier. I&apos;ll bias toward fast,
          high-protein options based on what you logged.
        </>
      ),
      cta: { href: '/feed-me', label: 'Pick breakfast' },
    };
  }

  return {
    greeting: 'Ready when you are',
    body: (
      <>
        I&apos;ve got your goal, your check-in, and{' '}
        <strong className="font-semibold text-foreground">{pantryItemCount} pantry items</strong>{' '}
        loaded. Pull a meal whenever — I&apos;ll explain the why.
      </>
    ),
    cta: { href: '/feed-me', label: 'Feed me' },
  };
}

function labelEnergy(e: number): string {
  return ['—', 'depleted', 'low', 'steady', 'good', 'high'][e] ?? '—';
}

export function ProactiveBrief(props: ProactiveBriefProps) {
  const brief = buildBrief(props);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border',
        'bg-gradient-to-br from-surface-elevated via-card to-card',
        'px-5 py-5 sm:px-6 sm:py-6',
      )}
    >
      {/* Subtle accent glow in the corner — signals "intelligent" without screaming */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-accent/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent">
            <SparklesIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today&apos;s brief
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{brief.greeting}</h2>
          <p className="text-[14px] leading-relaxed text-muted-foreground">{brief.body}</p>
        </div>

        <Button asChild variant="default" size="sm" className="self-start mt-1">
          <Link href={brief.cta.href}>
            {brief.cta.label}
            <ArrowRightIcon className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
