import { cn } from '@/components/ui/utils';

interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface KcalCircleProps {
  consumed: Macros;
  target: Macros;
  size?: number;
  className?: string;
}

/**
 * KcalCircle — a circle badge showing consumed / target kcal.
 *
 * Named to match what it actually renders: a single bordered circle
 * with a kcal fraction inside. The three-ring Apple Activity design
 * is deferred until a food-log feature is implemented.
 */
export function KcalCircle({ consumed, target, size = 120, className }: KcalCircleProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="flex items-center justify-center rounded-full border-4 border-accent/30 bg-surface-elevated"
        style={{ width: size, height: size }}
      >
        <span className="font-mono text-sm font-semibold text-text-muted">
          {consumed.kcal}
          <span className="text-xs font-normal"> / {target.kcal}</span>
        </span>
      </div>
      <p className="text-xs text-text-muted">kcal</p>
    </div>
  );
}

/** @deprecated Use KcalCircle instead. */
export const MacroRing = KcalCircle;
