'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { saveRecipe } from '@/lib/db';
import AuthWrapper from '@/components/auth/AuthWrapper';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Card, 
  CardContent, 
  Button, 
  Separator, 
  ScrollArea,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {toast} from 'sonner';
import { 
  Timer, 
  Users, 
  ChevronLeft, 
  BookmarkPlus, 
  CheckCircle2, 
  Info, 
  CookingPot 
} from 'lucide-react';

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
      
      toast.success("Recipe Saved", {
        description: "The recipe has been saved to your collection.",
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error saving recipe:', error);
      
      toast.error("Error", {
        description: "Failed to save the recipe. Please try again.",
        duration: 3000,
      });
      
    } finally {
      setSaving(false);
    }
  };
  
  if (recipes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <CookingPot className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-2xl font-bold mb-2">No Recipes Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find any recipes. Let's generate some new ones!
          </p>
          <Button onClick={() => router.push('/generate')}>
            Generate Recipes
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Your Recipes
          </h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/generate')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Generate More
          </Button>
        </div>
        
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Here are your generated recipes based on your ingredients. Select any recipe to view its details.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[70vh] lg:h-[60vh]">
                  <div className="p-4">
                    <h3 className="font-medium mb-4">Recipe Options</h3>
                    <div className="space-y-2">
                      {recipes.map((recipe, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedRecipe(recipe)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition ${
                            selectedRecipe === recipe
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          <span className="block font-medium">{recipe.name}</span>
                          <span className="block text-xs mt-1 text-gray-500 dark:text-gray-400">
                            {recipe.times}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {selectedRecipe ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedRecipe.name}
                      </h2>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{selectedRecipe.servings}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Timer className="h-4 w-4 mr-1" />
                          <span>{selectedRecipe.times}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      className="mt-4 lg:mt-0"
                      onClick={handleSaveRecipe}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                          Saved
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-4 w-4 mr-2" />
                          Save Recipe
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                      <ul className="space-y-2">
                        {selectedRecipe.ingredients.map((ingredient: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 mt-2 mr-2"></span>
                            <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                      <ol className="space-y-3">
                        {selectedRecipe.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800 text-sm font-medium text-gray-800 dark:text-gray-200 mr-3 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <Separator />
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h3 className="text-md font-semibold mb-2">Nutritional Facts</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedRecipe.nutritionalFacts}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[70vh] flex items-center justify-center">
                <CardContent className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a recipe to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}