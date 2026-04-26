import { cn } from '@/components/ui/utils';

interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroRingProps {
  consumed: Macros;
  target: Macros;
  size?: number;
  className?: string;
}

/**
 * MacroRing — Apple-Activity-style three-ring with gradient fills and
 * animated count-up numerals.
 *
 * TODO: Plan 08 fills this in — leave the stub.
 */
export function MacroRing({ consumed, target, size = 120, className }: MacroRingProps) {
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
