import { cn } from '@/components/ui/utils';
import type { CheckinDTO } from '@/server/checkin/actions';
import { DumbbellIcon, ZapIcon } from 'lucide-react';
import Link from 'next/link';

interface CheckinPeekProps {
  checkin: CheckinDTO | null;
}

const ENERGY_LABELS: Record<number, string> = {
  1: 'Depleted',
  2: 'Low',
  3: 'OK',
  4: 'Good',
  5: 'Energised',
};

// Checkin schema has: energy (1-5), training ('none'|'light'|'hard'), hunger ('low'|'normal'|'high')
// No 'mood' field in actual schema — we show energy + training instead

export function CheckinPeek({ checkin }: CheckinPeekProps) {
  const hasCheckin = !!checkin;

  return (
    <Link
      href="/checkin"
      className={cn(
        'rounded-2xl border border-border bg-card p-5 flex flex-col gap-3',
        'transition-colors duration-150 hover:bg-muted/50',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Today&apos;s check-in
        </p>
        {hasCheckin && (
          <span className="text-[10px] font-medium text-ok bg-ok/10 px-2 py-0.5 rounded-full">
            Logged
          </span>
        )}
      </div>

      {hasCheckin ? (
        <div className="flex gap-4">
          {/* Energy */}
          <div className="flex items-center gap-1.5">
            <ZapIcon className="w-4 h-4 text-warn" />
            <div>
              <p className="text-xs text-muted-foreground">Energy</p>
              <p className="text-sm font-semibold text-foreground">
                {ENERGY_LABELS[checkin.energy] ?? '—'}
              </p>
            </div>
          </div>

          {/* Training */}
          <div className="flex items-center gap-1.5">
            <DumbbellIcon className="w-4 h-4 text-cat-dairy" />
            <div>
              <p className="text-xs text-muted-foreground">Training</p>
              <p className="text-sm font-semibold text-foreground capitalize">{checkin.training}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">How are you feeling?</p>
          <p className="text-xs text-muted-foreground">
            Log your energy and training for a personalised recommendation.
          </p>
        </div>
      )}

      <p className="text-xs text-accent font-medium">
        {hasCheckin ? 'Update check-in' : 'Log check-in →'}
      </p>
    </Link>
  );
}
