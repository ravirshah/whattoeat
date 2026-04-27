'use client';

import { cn } from '@/components/ui/utils';
import type { Ingredient } from '@/contracts/zod/recipe';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';

interface IngredientsListProps {
  ingredients: Ingredient[];
  defaultServings: number;
  pantryNames?: string[]; // lowercased names of items in pantry
}

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3] as const;

export function IngredientsList({
  ingredients,
  defaultServings,
  pantryNames = [],
}: IngredientsListProps) {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const pantrySet = new Set(pantryNames.map((n) => n.toLowerCase()));

  function toggleChecked(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const servings = defaultServings * multiplier;
  const inPantryCount = ingredients.filter((ing) => pantrySet.has(ing.name.toLowerCase())).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Servings stepper */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
            Servings
          </span>
          <span className="font-mono text-base font-semibold text-text">
            {servings % 1 === 0 ? servings : servings.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMultiplier(m)}
              aria-pressed={multiplier === m}
              className={cn(
                'min-w-[44px] rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all duration-snap',
                multiplier === m
                  ? 'bg-accent text-accent-fg shadow-1'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {m % 1 === 0 ? `${m}×` : `${m}×`}
            </button>
          ))}
        </div>
      </div>

      {pantryNames.length > 0 && inPantryCount > 0 && (
        <p className="text-xs text-text-muted">
          <span className="font-semibold text-ok">{inPantryCount}</span> of {ingredients.length}{' '}
          already in your pantry
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {ingredients.map((ing, i) => {
          const inPantry = pantrySet.has(ing.name.toLowerCase());
          const scaled = ing.qty != null ? ing.qty * multiplier : null;
          const qty = scaled != null ? formatQty(scaled) : null;
          const isDone = checked.has(i);

          return (
            <li key={`${ing.name}-${i}`}>
              <button
                type="button"
                onClick={() => toggleChecked(i)}
                aria-pressed={isDone}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  isDone ? 'bg-transparent' : 'hover:bg-surface-elevated',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-snap',
                    isDone
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-border bg-surface group-hover:border-accent/40',
                  )}
                >
                  {isDone && <CheckIcon strokeWidth={3} className="size-3" />}
                </span>
                <div
                  className={cn(
                    'flex flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 transition-opacity',
                    isDone && 'opacity-40',
                  )}
                >
                  {qty != null && (
                    <span
                      className={cn(
                        'shrink-0 font-mono text-sm font-semibold text-text tabular-nums',
                        isDone && 'line-through',
                      )}
                    >
                      {qty}
                      {ing.unit ? ` ${ing.unit}` : ''}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-sm text-text',
                      isDone && 'line-through decoration-text-muted/60',
                    )}
                  >
                    {ing.name}
                  </span>
                  {ing.note && <span className="text-xs text-text-muted">· {ing.note}</span>}
                </div>
                {inPantry && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">
                    <CheckIcon strokeWidth={3} className="size-3" />
                    in pantry
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Render quantity as a clean string. Whole numbers stay integer; otherwise
 * one decimal. Common fractions (0.25, 0.5, 0.75) render as ¼, ½, ¾ to match
 * U.S. recipe conventions.
 */
function formatQty(n: number): string {
  if (n % 1 === 0) return String(n);
  const whole = Math.floor(n);
  const frac = n - whole;
  const fracMap: Record<string, string> = {
    '0.25': '¼',
    '0.33': '⅓',
    '0.5': '½',
    '0.67': '⅔',
    '0.75': '¾',
  };
  const key = frac.toFixed(2);
  if (fracMap[key]) {
    return whole > 0 ? `${whole} ${fracMap[key]}` : fracMap[key];
  }
  return n.toFixed(1).replace(/\.0$/, '');
}
