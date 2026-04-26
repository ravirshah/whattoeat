import type { Recipe } from '@/contracts/zod/recipe';
import { ClockIcon, TagIcon } from 'lucide-react';
import { CookButton } from './CookButton';
import { IngredientsList } from './IngredientsList';
import { MacrosCard } from './MacrosCard';
import { StepsList } from './StepsList';

interface RecipeDetailProps {
  recipe: Recipe;
  pantryNames?: string[];
  targetKcal?: number;
}

export function RecipeDetail({ recipe, pantryNames, targetKcal }: RecipeDetailProps) {
  return (
    <div className="relative flex flex-col gap-8 pb-32">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-text leading-snug">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-sm text-text-muted leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
          <span className="flex items-center gap-1">
            <ClockIcon strokeWidth={1.75} className="size-3.5" />
            {recipe.total_minutes} min
          </span>
          {recipe.cuisine && (
            <span className="flex items-center gap-1">
              <TagIcon strokeWidth={1.75} className="size-3.5" />
              {recipe.cuisine}
            </span>
          )}
          <span>
            {recipe.servings} serving{recipe.servings > 1 ? 's' : ''}
          </span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Macros */}
      <MacrosCard macros={recipe.macros} targetKcal={targetKcal} />

      {/* Ingredients */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text">Ingredients</h2>
        <IngredientsList
          ingredients={recipe.ingredients}
          defaultServings={recipe.servings}
          pantryNames={pantryNames}
        />
      </section>

      {/* Steps */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text">Method</h2>
        <StepsList steps={recipe.steps} />
      </section>

      {/* Sticky cook button */}
      <CookButton recipeId={recipe.id} recipeTitle={recipe.title} />
    </div>
  );
}
