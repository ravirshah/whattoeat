'use client';

import { Input } from '@/components/ui/input';
import { MealCard } from '@/components/ui/meal-card';
import type { Recipe } from '@/contracts/zod/recipe';
import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface SavedGridProps {
  recipes: Recipe[];
}

export function SavedGrid({ recipes }: SavedGridProps) {
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');

  const cuisines = [...new Set(recipes.map((r) => r.cuisine).filter(Boolean) as string[])].sort();

  const filtered = recipes.filter((r) => {
    const matchesQuery = query === '' || r.title.toLowerCase().includes(query.toLowerCase());
    const matchesCuisine = cuisine === '' || r.cuisine === cuisine;
    return matchesQuery && matchesCuisine;
  });

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-text">No saved recipes yet.</p>
        <p className="text-sm text-text-muted">Get a recommendation and save one you like.</p>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Get recommendations &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted"
          />
          <Input
            type="search"
            placeholder="Search recipes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {cuisines.length > 0 && (
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All cuisines</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      {(query || cuisine) && (
        <p className="text-xs text-text-muted">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">No recipes match your filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <MealCard
                title={recipe.title}
                oneLineWhy={recipe.description ?? ''}
                estMacros={{
                  kcal: recipe.macros.kcal,
                  protein: recipe.macros.protein_g,
                  carbs: recipe.macros.carbs_g,
                  fat: recipe.macros.fat_g,
                }}
                totalMinutes={recipe.total_minutes}
                pantryCoverage={1}
                missingItems={[]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
