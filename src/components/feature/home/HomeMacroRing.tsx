'use client';

import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import type { CheckinDTO } from '@/server/checkin/actions';

interface HomeMacroRingProps {
  profile: Partial<Profile> | null;
  checkin: CheckinDTO | null;
  /** Override ring diameter in px (default 200) */
  size?: number;
}

interface MacroArc {
  label: string;
  consumed: number;
  target: number;
  colorClass: string;
  unit: string;
}

export function HomeMacroRing({ profile, checkin, size = 200 }: HomeMacroRingProps) {
  const hasData = !!checkin;

  const arcs: MacroArc[] = [
    {
      label: 'Protein',
      consumed: 0, // Checkin tracks energy/training/hunger, not macros — show target only
      target: profile?.targets?.protein_g ?? 150,
      colorClass: 'stroke-blue-500',
      unit: 'g target',
    },
    {
      label: 'Carbs',
      consumed: 0,
      target: profile?.targets?.carbs_g ?? 200,
      colorClass: 'stroke-amber-500',
      unit: 'g target',
    },
    {
      label: 'Fat',
      consumed: 0,
      target: profile?.targets?.fat_g ?? 65,
      colorClass: 'stroke-orange-400',
      unit: 'g target',
    },
  ];

  const kcalTarget = profile?.targets?.kcal ?? 2000;

  const cx = size / 2;
  const cy = size / 2;
  const radii = [size / 2 - 12, size / 2 - 26, size / 2 - 40];
  const strokeWidth = 8;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG donut — shows target macro breakdown */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Macro targets ring"
        >
          {arcs.map((arc, idx) => {
            const r = radii[idx] ?? radii[0] ?? 36;
            const circumference = 2 * Math.PI * r;
            // Show full rings since we don't track per-macro intake in check-in
            const filled = circumference * 0.75;
            const empty = circumference - filled;

            return (
              <g key={arc.label}>
                {/* Background track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  className="stroke-border"
                  strokeWidth={strokeWidth}
                />
                {/* Target arc (75% fill to indicate it's a target, not consumed) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  className={cn(arc.colorClass, 'opacity-40 transition-all duration-700 ease-out')}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${empty}`}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              </g>
            );
          })}
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-foreground">{kcalTarget}</span>
          <span className="text-xs text-muted-foreground">kcal / day</span>
          {hasData && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-1">
              Checked in ✓
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-[140px]">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block w-2.5 h-2.5 rounded-full',
                    arc.colorClass.replace('stroke-', 'bg-'),
                  )}
                />
                <span className="text-xs text-muted-foreground">{arc.label}</span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {arc.target}g
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden w-full">
              <div
                className={cn(
                  'h-full rounded-full w-3/4',
                  arc.colorClass.replace('stroke-', 'bg-'),
                  'opacity-40',
                )}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-1">
          {hasData ? 'Today logged ✓' : 'Log meals in Check-in'}
        </p>
      </div>
    </div>
  );
}
