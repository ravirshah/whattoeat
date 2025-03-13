'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getSavedRecipes, deleteSavedRecipe } from '@/lib/db';
import AuthWrapper from '@/components/auth/AuthWrapper';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle, 
  CardDescription,
  CardFooter,
  Button, 
  Input,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Trash2, 
  MessageSquare,
  ChevronRight, 
  PlusCircle, 
  Info, 
  Loader2 
} from 'lucide-react';

export default function MyRecipesPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <MyRecipes />
      </MainLayout>
    </AuthWrapper>
  );
}

function MyRecipes() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!currentUser) return;
      
      try {
        const savedRecipes = await getSavedRecipes(currentUser.uid);
        setRecipes(savedRecipes);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        toast.error('Failed to load your recipes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecipes();
  }, [currentUser]);
  
  const handleDeleteRecipe = async (index: number) => {
    if (!currentUser) return;
    
    setDeleting(index);
    
    try {
      await deleteSavedRecipe(currentUser.uid, index);
      
      // Update the local state
      setRecipes(recipes.filter((_, i) => i !== index));
      
      toast.success('Recipe deleted successfully');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Failed to delete recipe');
    } finally {
      setDeleting(null);
    }
  };
  
  const handleChatWithRecipe = (recipe: any) => {
    // Store the recipe in sessionStorage to access it on the chat page
    sessionStorage.setItem('recipeToChat', JSON.stringify(recipe));
    router.push('/recipes/chat');
  };
  
  const handleViewRecipe = (recipe: any) => {
    // Store the recipe in sessionStorage to access it on the detail page
    sessionStorage.setItem('recipeToView', JSON.stringify(recipe));
    router.push('/recipes/detail');
  };
  
  // Filter recipes based on search query
  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.ingredients.some((ing: string) => ing.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Recipes
          </h1>
          <Button onClick={() => router.push('/generate')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Generate New Recipe
          </Button>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search recipes by name or ingredient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Saved Recipes</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                You haven't saved any recipes yet. Generate a new recipe and save your favorites!
              </p>
              <Button onClick={() => router.push('/generate')}>
                Generate Your First Recipe
              </Button>
            </CardContent>
          </Card>
        ) : filteredRecipes.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No recipes match your search query. Try a different search term.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{recipe.name}</CardTitle>
                  <CardDescription>
                    Saved on {formatDate(recipe.savedAt)}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-3">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {recipe.ingredients.slice(0, 3).map((ingredient: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {ingredient.split(' ').slice(0, 2).join(' ')}
                      </Badge>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        +{recipe.ingredients.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{recipe.times}</span>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-1 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleChatWithRecipe(recipe)}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteRecipe(index)}
                      disabled={deleting === index}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 dark:text-red-400"
                    >
                      {deleting === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button variant="default" size="sm" onClick={() => handleViewRecipe(recipe)}>
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}