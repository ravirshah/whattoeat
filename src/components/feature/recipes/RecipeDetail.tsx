import type { Recipe } from '@/contracts/zod/recipe';
import { ChefHatIcon, ClockIcon, UsersIcon } from 'lucide-react';
import { CookButton } from './CookButton';
import { IngredientsList } from './IngredientsList';
import { MacrosCard } from './MacrosCard';
import { StepsList } from './StepsList';

interface RecipeDetailProps {
  recipe: Recipe;
  pantryNames?: string[];
  targetKcal?: number;
}

/**
 * Cuisine → emoji glyph used in the hero. Falls back to a generic chef hat.
 * Kept lowercase-first so case differences from the engine don't miss the map.
 */
const CUISINE_GLYPH: Record<string, string> = {
  italian: '🍝',
  japanese: '🍣',
  mexican: '🌮',
  mediterranean: '🥙',
  indian: '🍛',
  thai: '🍜',
  chinese: '🥡',
  korean: '🍲',
  american: '🍔',
  french: '🥐',
  middle_eastern: '🥙',
  'middle eastern': '🥙',
  greek: '🥗',
  spanish: '🥘',
  vietnamese: '🍜',
};

export function RecipeDetail({ recipe, pantryNames }: RecipeDetailProps) {
  const cuisineKey = recipe.cuisine?.toLowerCase().trim() ?? '';
  const cuisineGlyph = CUISINE_GLYPH[cuisineKey];

  return (
    <div className="relative flex flex-col gap-7 pb-[calc(env(safe-area-inset-bottom)+140px)]">
      {/* ── Hero ── */}
      <header
        className="relative overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 shadow-1"
        style={{ viewTransitionName: `vt-recipe-${recipe.id}` } as React.CSSProperties}
      >
        {/* Decorative gradient — uses tokens so dark mode adapts. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 55%), radial-gradient(80% 60% at 0% 100%, color-mix(in srgb, var(--cat-produce) 14%, transparent) 0%, transparent 60%)',
          }}
        />

        <div className="relative flex flex-col gap-3">
          {recipe.cuisine && (
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-xl bg-surface text-lg shadow-1"
              >
                {cuisineGlyph ?? <ChefHatIcon strokeWidth={1.75} className="size-4" />}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                {recipe.cuisine}
              </span>
            </div>
          )}

          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text sm:text-3xl">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm leading-relaxed text-text-muted">{recipe.description}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <MetaPill icon={<ClockIcon strokeWidth={1.75} className="size-3.5" />}>
              {recipe.total_minutes} min
            </MetaPill>
            <MetaPill icon={<UsersIcon strokeWidth={1.75} className="size-3.5" />}>
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </MetaPill>
          </div>

          {recipe.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-text-muted ring-1 ring-inset ring-border/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Macros ── */}
      <MacrosCard macros={recipe.macros} servings={recipe.servings} />

      {/* ── Ingredients ── */}
      <section>
        <SectionHeader title="Ingredients" count={recipe.ingredients.length} />
        <IngredientsList
          ingredients={recipe.ingredients}
          defaultServings={recipe.servings}
          pantryNames={pantryNames}
        />
      </section>

      {/* ── Steps ── */}
      <section>
        <SectionHeader title="Method" count={recipe.steps.length} />
        <StepsList steps={recipe.steps} />
      </section>

      {/* Sticky cook button */}
      <CookButton recipeId={recipe.id} recipeTitle={recipe.title} />
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-muted">
        {count}
      </span>
    </div>
  );
}

function MetaPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text shadow-1 ring-1 ring-inset ring-border/60">
      <span className="text-text-muted">{icon}</span>
      {children}
    </span>
  );
}
