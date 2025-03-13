// src/app/recipes/results/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { saveRecipe } from '@/lib/db';
import AuthWrapper from '@/components/auth/AuthWrapper';
import MainLayout from '@/components/layout/MainLayout';

export default function RecipeResultsPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <RecipeResults />
      </MainLayout>
    </AuthWrapper>
  );
}

function RecipeResults() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  useEffect(() => {
    // Load recipes from session storage
    const storedRecipes = sessionStorage.getItem('generatedRecipes');
    if (storedRecipes) {
      try {
        const parsedRecipes = JSON.parse(storedRecipes);
        setRecipes(parsedRecipes);
        if (parsedRecipes.length > 0) {
          setSelectedRecipe(parsedRecipes[0]);
        }
      } catch (error) {
        console.error('Error parsing recipes:', error);
      }
    } else {
      router.push('/generate');
    }
  }, [router]);
  
  const handleSaveRecipe = async () => {
    if (!currentUser || !selectedRecipe) return;
    
    setSaving(true);
    
    try {
      await saveRecipe(currentUser.uid, selectedRecipe);
      setSaved(true);
      
      // Reset saved status after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Your Recipes
      </h1>
      
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-300">No recipes generated yet.</p>
          <button
            onClick={() => router.push('/generate')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
          >
            Generate Recipes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recipe Options</h2>
              <div className="space-y-2">
                {recipes.map((recipe, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedRecipe === recipe
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className="block font-medium">{recipe.name}</span>
                    <span className="block text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {recipe.times}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push('/generate')}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Generate More Recipes
                </button>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {selectedRecipe ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRecipe.name}</h2>
                    <button
                      onClick={handleSaveRecipe}
                      disabled={saving || saved}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md ${
                        saved
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'text-white bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Saved!
                        </>
                      ) : (
                        <>
                          <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          Save Recipe
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">{selectedRecipe.servings}</span>
                    <span>{selectedRecipe.times}</span>
                  </div>
                </div>
                
                <div className="px-6 py-5">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Ingredients</h3>
                  <ul className="list-disc pl-5 mb-6 space-y-1 text-gray-700 dark:text-gray-300">
                    {selectedRecipe.ingredients.map((ingredient: string, index: number) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                  
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Instructions</h3>
                  <ol className="list-decimal pl-5 mb-6 space-y-2 text-gray-700 dark:text-gray-300">
                    {selectedRecipe.instructions.map((instruction: string, index: number) => (
                      <li key={index} className="pl-2">{instruction}</li>
                    ))}
                  </ol>
                  
                  <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Nutritional Facts</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecipe.nutritionalFacts}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">Select a recipe to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}