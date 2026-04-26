import { SavedGrid } from '@/components/feature/recipes/SavedGrid';
import { listSavedRecipes } from '@/server/recipes/actions';

export const metadata = { title: 'Saved Recipes — WhatToEat' };

export default async function SavedPage() {
  const recipes = await listSavedRecipes();

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Saved</h1>
        <p className="text-sm text-text-muted mt-1">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your collection
        </p>
      </div>
      <SavedGrid recipes={recipes} />
    </main>
  );
}
