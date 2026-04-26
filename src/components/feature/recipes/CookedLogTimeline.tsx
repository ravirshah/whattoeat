'use client';

import { MealCard } from '@/components/ui/meal-card';
import type { CookedLogEntry } from '@/server/recipes/repo';
import Link from 'next/link';

interface CookedLogTimelineProps {
  entries: CookedLogEntry[];
}

function formatDateHeader(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(entries: CookedLogEntry[]): Map<string, CookedLogEntry[]> {
  const map = new Map<string, CookedLogEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.cooked_at).toDateString();
    const group = map.get(key) ?? [];
    group.push(entry);
    map.set(key, group);
  }
  return map;
}

export function CookedLogTimeline({ entries }: CookedLogTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-text">No cooks logged yet.</p>
        <p className="text-sm text-text-muted">Cook a recipe and it'll show up here.</p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Find something to cook &rarr;
        </Link>
      </div>
    );
  }

  const grouped = groupByDate(entries);

  return (
    <div className="flex flex-col gap-6">
      {[...grouped.entries()].map(([dateKey, group]) => (
        <section key={dateKey} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted px-1">
            {formatDateHeader(group[0].cooked_at)}
          </h2>
          <div className="flex flex-col gap-3">
            {group.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <Link href={`/recipes/${entry.recipe_id}`}>
                  <MealCard
                    title={entry.recipe.title}
                    oneLineWhy={entry.note ?? ''}
                    estMacros={{
                      kcal: entry.recipe.macros.kcal,
                      protein: entry.recipe.macros.protein_g,
                      carbs: entry.recipe.macros.carbs_g,
                      fat: entry.recipe.macros.fat_g,
                    }}
                    totalMinutes={entry.recipe.total_minutes}
                    pantryCoverage={1}
                    missingItems={[]}
                  />
                </Link>
                <div className="flex items-center justify-between px-1">
                  {entry.rating != null && (
                    <span className="text-xs text-text-muted">
                      {'★'.repeat(entry.rating)}
                      {'☆'.repeat(5 - entry.rating)}
                    </span>
                  )}
                  <Link
                    href={`/recipes/${entry.recipe_id}`}
                    className="ml-auto text-xs font-medium text-accent hover:underline"
                  >
                    Cook again &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
