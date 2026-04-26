import { cn } from '@/components/ui/utils';
import type { CookedLogEntry } from '@/server/recipes/repo';
import { ChefHatIcon, ClockIcon } from 'lucide-react';
import Link from 'next/link';

interface LastCookedCardProps {
  entry: CookedLogEntry;
}

export function LastCookedCard({ entry }: LastCookedCardProps) {
  const cookedAt = entry.cooked_at
    ? new Date(entry.cooked_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const { recipe } = entry;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        'rounded-2xl border border-border bg-card p-5',
        'flex items-center gap-4',
        'transition-colors duration-150 hover:bg-muted/50',
      )}
    >
      {/* Icon placeholder */}
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <ChefHatIcon className="w-6 h-6 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{recipe.title}</p>
          {cookedAt && (
            <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
              <ClockIcon className="w-3 h-3" />
              {cookedAt}
            </div>
          )}
        </div>

        {/* Macro quick-stats */}
        {recipe.macros && (
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {Math.round(recipe.macros.kcal ?? 0)}
              </span>{' '}
              kcal
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-blue-500">
                {Math.round(recipe.macros.protein_g ?? 0)}g
              </span>{' '}
              protein
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-500">
                {Math.round(recipe.macros.carbs_g ?? 0)}g
              </span>{' '}
              carbs
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
