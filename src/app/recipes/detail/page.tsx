'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { 
  Card, 
  CardContent, 
  Button, 
  Separator,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { 
  Timer, 
  Users, 
  ChevronLeft, 
  Info, 
  MessageSquare,
  UtensilsCrossed,
  Share2,
  Printer
} from 'lucide-react';

export default function RecipeDetailPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <RecipeDetail />
      </MainLayout>
    </AuthWrapper>
  );
}

function RecipeDetail() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<any>(null);
  
  useEffect(() => {
    // Load recipe from session storage
    const storedRecipe = sessionStorage.getItem('recipeToView');
    if (storedRecipe) {
      try {
        const parsedRecipe = JSON.parse(storedRecipe);
        setRecipe(parsedRecipe);
      } catch (error) {
        console.error('Error parsing recipe:', error);
        router.push('/recipes');
      }
    } else {
      router.push('/recipes');
    }
  }, [router]);
  
  const handleChatWithRecipe = () => {
    router.push('/recipes/chat');
  };
  
  const handlePrintRecipe = () => {
    window.print();
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: recipe?.name || 'Shared Recipe',
        text: `Check out this recipe: ${recipe?.name}`,
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`Recipe: ${recipe?.name}\n\nIngredients:\n${recipe?.ingredients.join('\n')}\n\nInstructions:\n${recipe?.instructions.join('\n')}`);
      alert('Recipe copied to clipboard!');
    }
  };
  
  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <p>Loading recipe...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 print:py-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.push('/recipes')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Recipes
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrintRecipe}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleChatWithRecipe}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">
              {recipe.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 mr-1" />
                <span>{recipe.servings}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Timer className="h-4 w-4 mr-1" />
                <span>{recipe.times}</span>
              </div>
            </div>
            
            <Alert className="mb-6 print:hidden">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Want to modify this recipe? Try the chat feature to make adjustments or ask questions.
              </AlertDescription>
            </Alert>
            
            <Separator className="my-6" />
            
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                  <UtensilsCrossed className="h-5 w-5 mr-2 text-emerald-600" />
                  Ingredients
                </h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 mt-2 mr-2"></span>
                      <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </section>
              
              <Separator />
              
              <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Instructions
                </h2>
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-sm font-medium text-emerald-800 dark:text-emerald-200 mr-3 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </section>
              
              <Separator />
              
              <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  Nutritional Facts
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {recipe.nutritionalFacts}
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}