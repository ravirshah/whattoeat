'use client';

import { cn } from '@/components/ui/utils';
import type { Ingredient } from '@/contracts/zod/recipe';
import { useState } from 'react';

interface IngredientsListProps {
  ingredients: Ingredient[];
  defaultServings: number;
  pantryNames?: string[]; // lowercased names of items in pantry
}

const MULTIPLIERS = [0.5, 1, 2, 3, 4] as const;

export function IngredientsList({
  ingredients,
  defaultServings,
  pantryNames = [],
}: IngredientsListProps) {
  const [multiplier, setMultiplier] = useState(1);
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

  return (
    <div className="flex flex-col gap-4">
      {/* Serving multiplier */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Servings:</span>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMultiplier(m)}
              className={cn(
                'rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-snap',
                multiplier === m
                  ? 'bg-accent text-accent-fg shadow-1'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {defaultServings * m}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-muted">
          ({servings} {servings === 1 ? 'serving' : 'servings'})
        </span>
      </div>

      {/* TODO: swipe-to-check gesture — requires @use-gesture/react, not yet a dep.
          Currently a tap/click checkbox toggle. */}
      <ul className="flex flex-col divide-y divide-border">
        {ingredients.map((ing, i) => {
          const inPantry = pantrySet.has(ing.name.toLowerCase());
          const qty =
            ing.qty != null ? (ing.qty * multiplier).toFixed(ing.qty % 1 === 0 ? 0 : 1) : null;
          const isDone = checked.has(i);

          return (
            <li key={`${ing.name}-${i}`}>
              <button
                type="button"
                onClick={() => toggleChecked(i)}
                aria-pressed={isDone}
                className={cn(
                  'flex w-full items-center gap-3 py-3 cursor-pointer select-none text-left',
                  isDone && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-snap',
                    isDone ? 'border-accent bg-accent' : 'border-border bg-surface',
                  )}
                />
                <div className="flex flex-1 items-baseline gap-1.5 min-w-0">
                  {qty != null && (
                    <span className="font-mono text-sm font-semibold text-text shrink-0">
                      {qty}
                      {ing.unit ? ` ${ing.unit}` : ''}
                    </span>
                  )}
                  <span className="text-sm text-text truncate">{ing.name}</span>
                  {ing.note && (
                    <span className="text-xs text-text-muted shrink-0">({ing.note})</span>
                  )}
                </div>
                {inPantry && (
                  <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">
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
