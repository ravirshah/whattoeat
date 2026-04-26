import { RecipeDetail } from '@/components/feature/recipes/RecipeDetail';
import { getRecipe } from '@/server/recipes/actions';
import { notFound } from 'next/navigation';

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  // TODO: fetch user's pantry names for coverage chips once T5 (pantry) is merged.
  // const pantryNames = await listPantryNames();
  // TODO: fetch user's targetKcal from profile once T6 (profile) is merged.

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <RecipeDetail recipe={recipe} />
    </main>
  );
}

export async function generateMetadata({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return {
    title: recipe ? `${recipe.title} — WhatToEat` : 'Recipe not found',
  };
}
