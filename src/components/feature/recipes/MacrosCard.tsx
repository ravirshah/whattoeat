import { cn } from '@/components/ui/utils';
import type { Macros } from '@/contracts/zod/recipe';

interface MacrosCardProps {
  macros: Macros;
  servings?: number;
  className?: string;
}

/**
 * MacrosCard — per-serving macro summary.
 *
 * The big kcal number anchors the card; the four macro chips below it line up
 * in a 4-column grid with subtle category dots so each macro is visually keyed
 * to a color without a heavy background.
 */
export function MacrosCard({ macros, servings, className }: MacrosCardProps) {
  const macroRows: { label: string; value: number; suffix: string; tone: string }[] = [
    {
      label: 'Protein',
      value: macros.protein_g,
      suffix: 'g',
      tone: 'bg-cat-protein',
    },
    {
      label: 'Carbs',
      value: macros.carbs_g,
      suffix: 'g',
      tone: 'bg-cat-grain',
    },
    {
      label: 'Fat',
      value: macros.fat_g,
      suffix: 'g',
      tone: 'bg-warn',
    },
  ];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface-elevated p-5 shadow-1',
        className,
      )}
    >
      {/* Soft accent wash anchored top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-accent/10 blur-2xl"
      />

      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-text-muted">
            {servings && servings > 1 ? `Per serving · serves ${servings}` : 'Per serving'}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-semibold tracking-tight text-text">
              {macros.kcal}
            </span>
            <span className="text-sm font-medium text-text-muted">cal</span>
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        {macroRows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 rounded-xl border border-border/60 bg-surface px-3 py-2.5"
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', row.tone)} aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                {row.label}
              </span>
            </div>
            <span className="font-mono text-lg font-semibold leading-none text-text">
              {row.value}
              <span className="ml-0.5 text-xs font-normal text-text-muted">{row.suffix}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
