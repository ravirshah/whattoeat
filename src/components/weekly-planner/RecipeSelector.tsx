'use client';

import { useState, useEffect } from 'react';
import { UserGoal, DayOfWeek, MealType, PlannedMeal } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { X, Sparkles, Clock, Users, Target, Plus, Check, Heart, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { addToFavorites, isFavoriteRecipe, removeFromFavorites, getUserFavorites } from '@/lib/weekly-planner-db';
import { getSavedRecipes } from '@/lib/db';
import { useAuth } from '@/lib/context/AuthContext';
import ChatInput from './ChatInput';

type ModalMode = 'add' | 'view' | 'edit';

interface RecipeSelectorProps {
  selectedDay: DayOfWeek;
  activeGoal: UserGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onRecipeSelect: (meal: PlannedMeal) => void;
  existingMeal?: PlannedMeal | null;
  mode?: ModalMode;
}

interface GoalRecipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  nutritionalFacts: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  servings: string;
  times: string;
  goalAlignment: {
    macroFit: string;
    calorieTarget: string;
    nutritionalBenefits?: string;
  };
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const CARB_BASE_OPTIONS = [
  'White Rice', 'Brown Rice', 'Quinoa', 'Sweet Potato', 'Regular Potato',
  'Pasta', 'Bread', 'Oats', 'Barley', 'Cauliflower Rice'
];

export default function RecipeSelector({
  selectedDay,
  activeGoal,
  isOpen,
  onClose,
  onRecipeSelect,
  existingMeal,
  mode = 'add'
}: RecipeSelectorProps) {
  // Explicitly type mode to fix TypeScript inference
  const typedMode: ModalMode = mode || 'add';
  const { currentUser } = useAuth();
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedCarbBase, setSelectedCarbBase] = useState<string>('');
  const [customPreferences, setCustomPreferences] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GoalRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<GoalRecipe | null>(null);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);
  
  // New state for saved recipes and favorites
  const [favoriteRecipes, setFavoriteRecipes] = useState<any[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Initialize state from existing meal if in view/edit mode
  useEffect(() => {
    if (existingMeal && (typedMode === 'view' || typedMode === 'edit')) {
      setSelectedMealType(existingMeal.mealType);
      setSelectedServings(existingMeal.servings);
      setSelectedCarbBase(existingMeal.carbBase || '');
      setCustomPreferences(existingMeal.notes || ''); // Use notes field for custom preferences
      
      // If we have recipe details, show them
      if (existingMeal.recipeDetails) {
        const existingRecipe: GoalRecipe = {
          name: existingMeal.recipeName,
          ingredients: existingMeal.recipeDetails.ingredients,
          instructions: existingMeal.recipeDetails.instructions,
          nutritionalFacts: existingMeal.recipeDetails.nutritionalFacts,
          servings: existingMeal.servings.toString(),
          times: existingMeal.recipeDetails.times,
          goalAlignment: existingMeal.recipeDetails.goalAlignment || {
            macroFit: 'Previously selected recipe',
            calorieTarget: 'N/A'
          }
        };
        setGeneratedRecipes([existingRecipe]);
        setSelectedRecipe(existingRecipe);
      }
    } else {
      // Reset for add mode
      setGeneratedRecipes([]);
      setSelectedRecipe(null);
      setCustomPreferences('');
    }
      }, [existingMeal, typedMode, isOpen]);

  // Load saved recipes and check favorite status
  useEffect(() => {
    if (isOpen && currentUser) {
      console.log('RecipeSelector opened, loading unified recipes...');
      loadUnifiedRecipes();
    }
  }, [isOpen, currentUser]);

  // Separate effect for checking favorite status after recipes are loaded
  useEffect(() => {
    if (generatedRecipes.length > 0 && currentUser) {
      console.log('Generated recipes loaded, checking favorite status...');
      checkFavoriteStatus();
    }
  }, [generatedRecipes, currentUser]);

  const loadUnifiedRecipes = async () => {
    if (!currentUser) return;
    
    setIsLoadingFavorites(true);
    try {
      // Load both favorites and saved recipes, then unify them
      const [favorites, savedRecipes] = await Promise.all([
        getUserFavorites(currentUser.uid),
        getSavedRecipes(currentUser.uid)
      ]);

      console.log('Loaded saved recipes:', savedRecipes.length);
      console.log('Loaded favorites:', favorites.length);

      // Auto-migrate saved recipes if any exist and not already in favorites
      if (savedRecipes.length > 0) {
        const unmigrated = [];
        for (const recipe of savedRecipes) {
          const isAlreadyFavorite = favorites.find(fav => fav.recipeName === recipe.name);
          if (!isAlreadyFavorite) {
            unmigrated.push(recipe);
          }
        }
        
        if (unmigrated.length > 0) {
          console.log(`Auto-migrating ${unmigrated.length} saved recipes to favorites...`);
          await migrateSavedRecipesToFavorites(unmigrated);
          // Reload favorites after migration
          const updatedFavorites = await getUserFavorites(currentUser.uid);
          setFavoriteRecipes(updatedFavorites);
          return; // Exit early since we'll reload after migration
        }
      }

      // Convert saved recipes to favorite format for display (for any that weren't migrated)
      const convertedSavedRecipes = savedRecipes.map((recipe, index) => ({
        id: `saved_${index}`,
        userId: currentUser.uid,
        recipeName: recipe.name,
        recipeDetails: {
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          nutritionalFacts: parseNutritionalFacts(recipe.nutritionalFacts),
          times: recipe.times
        },
        rating: 5,
        timesCooked: 0,
        addedAt: recipe.savedAt || Timestamp.now(),
        isFromSavedRecipes: true // Flag to identify source
      }));

      console.log('Converted saved recipes:', convertedSavedRecipes.length);

      // Combine and deduplicate by recipe name
      const allRecipes = [...favorites, ...convertedSavedRecipes];
      const uniqueRecipes = allRecipes.filter((recipe, index, array) => 
        array.findIndex(r => r.recipeName === recipe.recipeName) === index
      );

      // Sort by most recent first
      uniqueRecipes.sort((a, b) => {
        const getDate = (timestamp: any): Date => {
          if (timestamp?.toDate) return timestamp.toDate();
          if (timestamp instanceof Date) return timestamp;
          if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
          return new Date(timestamp);
        };
        
        const aDate = getDate(a.addedAt);
        const bDate = getDate(b.addedAt);
        return bDate.getTime() - aDate.getTime();
      });

      setFavoriteRecipes(uniqueRecipes);
    } catch (error) {
      console.error('Error loading unified recipes:', error);
      toast.error('Failed to load saved recipes');
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // Function to migrate saved recipes to favorites for better integration
  const migrateSavedRecipesToFavorites = async (savedRecipes: any[]) => {
    if (!currentUser || savedRecipes.length === 0) return;

    try {
      console.log('Starting migration of', savedRecipes.length, 'saved recipes to favorites...');
      let migratedCount = 0;
      
      for (const recipe of savedRecipes) {
        try {
          // Check if this recipe is already in favorites
          const isAlreadyFavorite = await isFavoriteRecipe(currentUser.uid, recipe.name);
          
          if (!isAlreadyFavorite) {
            console.log('Migrating recipe to favorites:', recipe.name);
            
            const favoriteData = {
              userId: currentUser.uid,
              recipeName: recipe.name,
              recipeDetails: {
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                nutritionalFacts: parseNutritionalFacts(recipe.nutritionalFacts),
                times: recipe.times
              },
              rating: 5,
              timesCooked: 0,
              addedAt: recipe.savedAt || Timestamp.now(),
              tags: ['migrated-from-saved']
            };
            
            await addToFavorites(favoriteData);
            migratedCount++;
            console.log(`Successfully migrated "${recipe.name}" to favorites`);
          } else {
            console.log(`Recipe "${recipe.name}" already exists in favorites, skipping`);
          }
        } catch (recipeError) {
          console.error(`Error migrating recipe "${recipe.name}":`, recipeError);
        }
      }
      
      console.log(`Migration completed: ${migratedCount} recipes migrated successfully`);
      if (migratedCount > 0) {
        toast.success(`Successfully migrated ${migratedCount} saved recipes to favorites!`);
      }
    } catch (error) {
      console.error('Error during migration process:', error);
      toast.error('Some recipes could not be migrated');
    }
  };

  const checkFavoriteStatus = async () => {
    if (!currentUser) return;

    try {
      // Check favorites for generated recipes
      const statusChecks = generatedRecipes.map(async (recipe) => {
        const isFav = await isFavoriteRecipe(currentUser.uid, recipe.name);
        return { recipeName: recipe.name, isFavorite: isFav };
      });

      const statuses = await Promise.all(statusChecks);
      const statusMap = statuses.reduce((acc, status) => {
        acc[status.recipeName] = status.isFavorite;
        return acc;
      }, {} as Record<string, boolean>);

      setFavoriteStatus(statusMap);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async (recipe: GoalRecipe) => {
    if (!currentUser) {
      toast.error('Please sign in to favorite recipes');
      return;
    }

    const isCurrentlyFavorite = favoriteStatus[recipe.name];
    
    try {
      if (isCurrentlyFavorite) {
        // Remove from favorites - need to find the favorite ID
        const favorites = await getUserFavorites(currentUser.uid);
        const favoriteToRemove = favorites.find(fav => fav.recipeName === recipe.name);
        if (favoriteToRemove) {
          await removeFromFavorites(favoriteToRemove.id);
          setFavoriteStatus(prev => ({ ...prev, [recipe.name]: false }));
          toast.success('Removed from favorites');
        }
      } else {
        // Add to favorites
        const favoriteData = {
          userId: currentUser.uid,
          recipeName: recipe.name,
          recipeDetails: {
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            nutritionalFacts: recipe.nutritionalFacts,
            times: recipe.times
          },
          rating: 5,
          timesCooked: 0,
          addedAt: Timestamp.now()
        };
        
        await addToFavorites(favoriteData);
        setFavoriteStatus(prev => ({ ...prev, [recipe.name]: true }));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleSelectSavedRecipe = (favoriteRecipe: any) => {
    // Convert unified favorite recipe to our format with proper scaling
    const originalServings = extractServingsFromFavoriteRecipe(favoriteRecipe);
    const scalingFactor = selectedServings / originalServings;
    
    const recipe: GoalRecipe = {
      name: favoriteRecipe.recipeName,
      ingredients: scaleIngredients(favoriteRecipe.recipeDetails.ingredients, scalingFactor),
      instructions: scaleInstructions(favoriteRecipe.recipeDetails.instructions, scalingFactor),
      nutritionalFacts: scaleNutritionalFacts(favoriteRecipe.recipeDetails.nutritionalFacts, scalingFactor),
      servings: selectedServings.toString(),
      times: favoriteRecipe.recipeDetails.times,
      goalAlignment: {
        macroFit: favoriteRecipe.isFromSavedRecipes ? 'From your saved recipes' : 'From your favorites',
        calorieTarget: 'Personal preference'
      }
    };

    handleRecipeSelect(recipe);
  };

  const extractServingsFromFavoriteRecipe = (favoriteRecipe: any): number => {
    // Try to extract from recipe details times field
    if (favoriteRecipe.recipeDetails?.times) {
      const servesMatch = favoriteRecipe.recipeDetails.times.match(/serves?\s+(\d+)/i);
      if (servesMatch) return parseInt(servesMatch[1]);
      
      const servingsMatch = favoriteRecipe.recipeDetails.times.match(/(\d+)\s+servings?/i);
      if (servingsMatch) return parseInt(servingsMatch[1]);
    }
    
    return 1; // Default
  };

  const scaleIngredients = (ingredients: string[], scalingFactor: number): string[] => {
    if (scalingFactor === 1) return ingredients;
    
    return ingredients.map(ingredient => {
      // Pattern to match numbers (including fractions) at the start of ingredients
      const numberPattern = /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.+)/;
      const match = ingredient.match(numberPattern);
      
      if (match) {
        const originalAmount = parseFloat(match[1]);
        const restOfIngredient = match[2];
        const scaledAmount = originalAmount * scalingFactor;
        
        // Format the scaled amount nicely
        let formattedAmount: string;
        if (scaledAmount % 1 === 0) {
          formattedAmount = scaledAmount.toString();
        } else if (scaledAmount < 1) {
          // Convert to fraction for small amounts
          if (scaledAmount === 0.5) formattedAmount = '1/2';
          else if (scaledAmount === 0.25) formattedAmount = '1/4';
          else if (scaledAmount === 0.75) formattedAmount = '3/4';
          else formattedAmount = scaledAmount.toFixed(2);
        } else {
          formattedAmount = scaledAmount.toFixed(1).replace('.0', '');
        }
        
        return `${formattedAmount} ${restOfIngredient}`;
      }
      
      return ingredient; // Return unchanged if no number found
    });
  };

  const scaleInstructions = (instructions: string[], scalingFactor: number): string[] => {
    if (scalingFactor === 1) return instructions;
    
    return instructions.map(instruction => {
      // Scale any numbers in cooking instructions (like "cook for 20 minutes")
      return instruction.replace(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)/gi, (match, num, unit) => {
        const scaledTime = parseFloat(num) * Math.sqrt(scalingFactor); // Square root scaling for cooking times
        return `${scaledTime.toFixed(0)} ${unit}`;
      });
    });
  };

  const scaleNutritionalFacts = (facts: any, scalingFactor: number) => {
    return {
      ...facts,
      calories: Math.round(facts.calories * scalingFactor),
      protein: Math.round(facts.protein * scalingFactor),
      carbs: Math.round(facts.carbs * scalingFactor),
      fat: Math.round(facts.fat * scalingFactor),
      fiber: Math.round(facts.fiber * scalingFactor),
      sugar: Math.round(facts.sugar * scalingFactor),
      sodium: Math.round(facts.sodium * scalingFactor)
    };
  };

  const parseNutritionalFacts = (factString: string) => {
    // If it's already an object, return it
    if (typeof factString === 'object') {
      return factString;
    }

    // Try to parse nutritional facts from string format
    const defaults = {
      calories: 300,
      protein: 20,
      carbs: 30,
      fat: 15,
      fiber: 5,
      sugar: 10,
      sodium: 500
    };

    try {
      console.log('Parsing nutritional facts:', factString);
      
      // Look for patterns like "Calories: 300" in the string
      const caloriesMatch = factString.match(/calories?:?\s*[~]?(\d+)/i);
      const proteinMatch = factString.match(/protein:?\s*(\d+)/i);
      const carbsMatch = factString.match(/carbs?:?\s*(\d+)/i);
      const fatMatch = factString.match(/fat:?\s*(\d+)/i);
      const fiberMatch = factString.match(/fiber:?\s*(\d+)/i);
      const sugarMatch = factString.match(/sugar:?\s*(\d+)/i);
      const sodiumMatch = factString.match(/sodium:?\s*(\d+)/i);
      
      const result = {
        ...defaults,
        calories: caloriesMatch ? parseInt(caloriesMatch[1]) : defaults.calories,
        protein: proteinMatch ? parseInt(proteinMatch[1]) : defaults.protein,
        carbs: carbsMatch ? parseInt(carbsMatch[1]) : defaults.carbs,
        fat: fatMatch ? parseInt(fatMatch[1]) : defaults.fat,
        fiber: fiberMatch ? parseInt(fiberMatch[1]) : defaults.fiber,
        sugar: sugarMatch ? parseInt(sugarMatch[1]) : defaults.sugar,
        sodium: sodiumMatch ? parseInt(sodiumMatch[1]) : defaults.sodium
      };
      
      console.log('Parsed nutritional facts:', result);
      return result;
    } catch (error) {
      console.error('Error parsing nutritional facts:', error);
      return defaults;
    }
  };

  const generateGoalBasedRecipes = async () => {
    if (!activeGoal) {
      toast.error('Please set a goal first to generate tailored recipes');
      return;
    }

    setIsGenerating(true);
    try {
      // Get auth token
      const user = (await import('firebase/auth')).getAuth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      const response = await fetch('/whattoeat/api/generate-goal-recipes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goalData: activeGoal,
          mealType: selectedMealType,
          servings: selectedServings,
          carbBase: selectedCarbBase || undefined,
          customPreferences: customPreferences.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const data = await response.json();
      
      if (data.recipes && data.recipes.length > 0) {
        setGeneratedRecipes(data.recipes);
        toast.success(`Generated ${data.recipes.length} recipes for your ${activeGoal.goalType.replace('_', ' ')} goal!`);
        
        // Check favorite status for newly generated recipes
        setTimeout(() => checkFavoriteStatus(), 100);
      } else {
        throw new Error('No recipes generated');
      }
    } catch (error) {
      console.error('Error generating goal-based recipes:', error);
      toast.error('Failed to generate recipes. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecipeSelect = (recipe: GoalRecipe) => {
    // Create meal with the selected recipe and current form values
    const meal: PlannedMeal = {
      id: `meal_${Date.now()}`,
      recipeName: recipe.name,
      mealType: selectedMealType,
      servings: selectedServings,
      carbBase: selectedCarbBase || undefined,
      notes: customPreferences.trim() || undefined,
      plannedAt: Timestamp.now(),
      recipeDetails: {
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutritionalFacts: recipe.nutritionalFacts,
        times: recipe.times,
        goalAlignment: recipe.goalAlignment
      }
    };

    onRecipeSelect(meal);
    onClose();
  };

  // Handler specifically for ChatInput which already provides a complete PlannedMeal object
  const handleChatRecipeSelect = (meal: PlannedMeal) => {
    onRecipeSelect(meal);
    onClose();
  };

  const handleChatFavorite = async (chatResult: any) => {
    if (!currentUser) {
      toast.error('Please sign in to save favorites');
      return;
    }

    try {
      if (chatResult.recipe) {
        // Handle recipe from chat
        const favoriteData = {
          userId: currentUser.uid,
          recipeName: chatResult.recipe.name,
          recipeDetails: {
            ingredients: chatResult.recipe.ingredients,
            instructions: chatResult.recipe.instructions,
            nutritionalFacts: chatResult.recipe.nutritionalFacts,
            times: chatResult.recipe.times
          },
          rating: 5,
          timesCooked: 0,
          addedAt: Timestamp.now(),
          tags: ['from-chat']
        };
        
        await addToFavorites(favoriteData);
        toast.success(`Added "${chatResult.recipe.name}" to favorites!`);
      } else if (chatResult.nutritionEntry) {
        // Handle nutrition entry from chat
        const mealName = chatResult.nutritionEntry.items.map((item: any) => 
          `${item.amount} ${item.name}`).join(' + ');
          
        const favoriteData = {
          userId: currentUser.uid,
          recipeName: mealName || 'Nutrition Entry',
          recipeDetails: {
            ingredients: chatResult.nutritionEntry.items.map((item: any) => 
              `${item.amount} ${item.name}`),
            instructions: ['Log nutrition as consumed'],
            nutritionalFacts: chatResult.nutritionEntry.totalNutrition,
            times: 'Immediate'
          },
          rating: 5,
          timesCooked: 0,
          addedAt: Timestamp.now(),
          tags: ['from-chat', 'nutrition-entry']
        };
        
        await addToFavorites(favoriteData);
        toast.success('Added nutrition entry to favorites!');
      }
      
      // Reload favorites to show the new addition
      await loadUnifiedRecipes();
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('Failed to add to favorites');
    }
  };

  const getMacroBarWidth = (value: number, goal: number) => {
    if (!goal) return 0;
    return Math.min((value / goal) * 100, 100);
  };

  const getMacroColor = (value: number, goal: number) => {
    const percentage = (value / goal) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full h-full sm:max-w-4xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                {typedMode === 'view' ? `View Recipe - ${selectedDay}` : 
                 typedMode === 'edit' ? `Edit Meal - ${selectedDay}` :
                 `Add Meal to ${selectedDay}`}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                {typedMode === 'view' ? `Recipe details for ${existingMeal?.recipeName}` :
                 activeGoal ? `Recipes tailored for your ${activeGoal.name} goal` : 'Select a recipe for your meal plan'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0 ml-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content - Mobile Optimized */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                     {/* Left Panel - Controls (Hidden in view mode on mobile) */}
           {(typedMode === 'add' || typedMode === 'edit') && (
            <div className="lg:w-1/3 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 flex-shrink-0 lg:overflow-y-auto">
              <div className="space-y-4 sm:space-y-6">
                {/* Meal Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Meal Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.map(type => (
                      <Button
                        key={type}
                        variant={selectedMealType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMealType(type)}
                        className="text-xs"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Servings */}
                <div>
                  <label className="block text-sm font-medium mb-2">Servings</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedServings(Math.max(1, selectedServings - 1))}
                      disabled={selectedServings <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{selectedServings}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedServings(Math.min(8, selectedServings + 1))}
                      disabled={selectedServings >= 8}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Carb Base (Optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Carb Base (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCarbBase}
                      onChange={(e) => setSelectedCarbBase(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors duration-200 appearance-none cursor-pointer shadow-sm hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      <option value="" className="text-gray-500">Select a carb base...</option>
                      {CARB_BASE_OPTIONS.map(base => (
                        <option key={base} value={base} className="text-gray-900 dark:text-white">
                          {base}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Custom Preferences */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Custom Preferences
                  </label>
                  <textarea
                    value={customPreferences}
                    onChange={(e) => setCustomPreferences(e.target.value)}
                    placeholder="e.g., Mediterranean cuisine, extra spicy, high protein (>50g), vegetarian, low sodium, etc."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors duration-200 resize-none shadow-sm hover:border-gray-400 dark:hover:border-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Specify cuisine type, spice level, protein goals, dietary preferences, or any other requirements
                  </p>
                </div>

                {/* Goal Info */}
                {activeGoal && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-900 dark:text-emerald-100">
                        {activeGoal.name}
                      </span>
                    </div>
                    {activeGoal.macroTargets.perMeal && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                        {activeGoal.macroTargets.perMeal.calories && (
                          <div>Target: {activeGoal.macroTargets.perMeal.calories} cal</div>
                        )}
                        {activeGoal.macroTargets.perMeal.protein && (
                          <div>Protein: {activeGoal.macroTargets.perMeal.protein}g</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={generateGoalBasedRecipes}
                  disabled={isGenerating || !activeGoal}
                  className="w-full"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Goal-Based Recipes
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Right Panel - Recipe Results */}
          <div className={`${typedMode === 'view' ? 'w-full' : 'lg:w-2/3'} flex flex-col min-h-0 flex-1`}>
                         {/* Tab Navigation - Only show in non-view mode */}
             {(typedMode === 'add' || typedMode === 'edit') && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex space-x-1 overflow-x-auto">
                  <Button
                    variant={!showFavorites && !showChatInput ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setShowFavorites(false);
                      setShowChatInput(false);
                    }}
                    className="whitespace-nowrap"
                  >
                    Generated Recipes ({generatedRecipes.length})
                  </Button>
                  <Button
                    variant={showFavorites && !showChatInput ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setShowFavorites(true);
                      setShowChatInput(false);
                    }}
                    className="whitespace-nowrap"
                  >
                    My Favorite Recipes ({favoriteRecipes.length})
                  </Button>
                  <Button
                    variant={showChatInput ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setShowFavorites(false);
                      setShowChatInput(true);
                    }}
                    className="whitespace-nowrap"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Input by Chat
                  </Button>
                </div>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* View Mode - Show Existing Meal Details */}
              {typedMode === 'view' && existingMeal && (
                <div className="p-4 sm:p-6">
                  <div className="max-w-none">
                    {/* Recipe Header */}
                    <div className="mb-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {existingMeal.recipeName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{existingMeal.servings} servings</span>
                        </div>
                        {existingMeal.recipeDetails?.times && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{existingMeal.recipeDetails.times}</span>
                          </div>
                        )}
                        <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 rounded-full text-xs font-medium">
                          {existingMeal.mealType}
                        </div>
                      </div>
                    </div>

                    {/* Nutritional Facts */}
                    {existingMeal.recipeDetails?.nutritionalFacts && (
                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Nutritional Information</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded text-xs">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {existingMeal.recipeDetails.nutritionalFacts.calories}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">calories</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded text-xs">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {existingMeal.recipeDetails.nutritionalFacts.protein}g
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">protein</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded text-xs">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {existingMeal.recipeDetails.nutritionalFacts.carbs}g
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">carbs</div>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded text-xs">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {existingMeal.recipeDetails.nutritionalFacts.fat}g
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">fat</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ingredients Section */}
                    {existingMeal.recipeDetails?.ingredients && (
                      <div className="mb-6">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 mr-2"></span>
                          Ingredients
                        </h3>
                        <div className="space-y-2">
                          {existingMeal.recipeDetails.ingredients.map((ingredient, index) => (
                            <div key={index} className="flex items-start py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 mt-2 mr-3 flex-shrink-0"></span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{ingredient}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instructions Section */}
                    {existingMeal.recipeDetails?.instructions && (
                      <div className="mb-6">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                          Instructions
                        </h3>
                        <div className="space-y-3">
                          {existingMeal.recipeDetails.instructions.map((instruction, index) => (
                            <div key={index} className="flex items-start py-3 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-medium text-blue-800 dark:text-blue-200 mr-3 flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{instruction}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal Alignment (if available) */}
                    {existingMeal.recipeDetails?.goalAlignment && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <h3 className="text-sm font-semibold mb-2 text-emerald-900 dark:text-emerald-100">Goal Alignment</h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          {existingMeal.recipeDetails.goalAlignment.macroFit}
                        </p>
                        {existingMeal.recipeDetails.goalAlignment.nutritionalBenefits && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                            {existingMeal.recipeDetails.goalAlignment.nutritionalBenefits}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Additional spacing for mobile safe area */}
                    <div className="h-4 sm:h-0"></div>
                  </div>
                </div>
              )}

                             {/* Non-View Mode Content */}
               {(typedMode === 'add' || typedMode === 'edit') && (
                <>
                  {/* Content based on active tab */}
                  {showFavorites ? (
                    // Saved Recipes Tab
                    <div className="p-4 sm:p-6">
                      {isLoadingFavorites ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                      ) : favoriteRecipes.length === 0 ? (
                        <div className="text-center py-8">
                          <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Favorite Recipes Yet
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Heart recipes here or save them from the Generate page to see them in your favorites
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Your Favorite Recipes
                          </h4>
                          {favoriteRecipes.map((favoriteRecipe, index) => (
                            <div
                              key={favoriteRecipe.id || index}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                                    {favoriteRecipe.recipeName}
                                  </h5>
                                  <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {favoriteRecipe.recipeDetails.times}
                                    </div>
                                    {favoriteRecipe.rating && (
                                      <div className="flex items-center">
                                        <span className="text-yellow-500">★</span>
                                        <span className="ml-1">{favoriteRecipe.rating}/5</span>
                                      </div>
                                    )}
                                    {favoriteRecipe.isFromSavedRecipes && (
                                      <span className="text-blue-500 text-xs">From Generate</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleSelectSavedRecipe(favoriteRecipe)}
                                  className="ml-4 flex-shrink-0"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>

                              {/* Ingredients preview */}
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {favoriteRecipe.recipeDetails.ingredients.slice(0, 3).map((ingredient: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {ingredient.split(' ').slice(0, 2).join(' ')}
                                    </Badge>
                                  ))}
                                  {favoriteRecipe.recipeDetails.ingredients.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{favoriteRecipe.recipeDetails.ingredients.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : showChatInput ? (
                    // Chat Input Tab
                    <ChatInput 
                      mealType={selectedMealType}
                      servings={selectedServings}
                      onRecipeSelect={handleChatRecipeSelect}
                      onFavorite={handleChatFavorite}
                    />
                  ) : (
                    // Generated Recipes Tab
                    generatedRecipes.length === 0 ? (
                      <div className="p-8 text-center">
                        <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {activeGoal ? 'Generate Recipes for Your Goal' : 'Set a Goal First'}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {activeGoal 
                            ? 'Click "Generate Goal-Based Recipes" to get personalized meal suggestions'
                            : 'Please set a dietary goal to get personalized recipe recommendations'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6 space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Generated Recipes ({generatedRecipes.length})
                        </h4>
                        
                        {generatedRecipes.map((recipe, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                                  {recipe.name}
                                </h5>
                                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {recipe.times}
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="h-3 w-3 mr-1" />
                                    {recipe.servings}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleFavorite(recipe)}
                                  className={`p-2 ${favoriteStatus[recipe.name] ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <Heart className={`h-4 w-4 ${favoriteStatus[recipe.name] ? 'fill-current' : ''}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRecipeSelect(recipe)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>

                            {/* Nutrition Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {recipe.nutritionalFacts.calories}
                                </div>
                                <div className="text-gray-500">cal</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {recipe.nutritionalFacts.protein}g
                                </div>
                                <div className="text-gray-500">protein</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {recipe.nutritionalFacts.carbs}g
                                </div>
                                <div className="text-gray-500">carbs</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {recipe.nutritionalFacts.fat}g
                                </div>
                                <div className="text-gray-500">fat</div>
                              </div>
                            </div>

                            {/* Goal Alignment */}
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-xs">
                                Goal Alignment: {recipe.goalAlignment.macroFit}
                              </Badge>
                              
                              {/* Macro Progress Bars */}
                              {activeGoal?.macroTargets.perMeal && (
                                <div className="space-y-1">
                                  {activeGoal.macroTargets.perMeal.calories && (
                                    <div className="flex items-center space-x-2 text-xs">
                                      <span className="w-12">Cal:</span>
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                        <div 
                                          className={`h-1 rounded-full ${getMacroColor(recipe.nutritionalFacts.calories, activeGoal.macroTargets.perMeal.calories)}`}
                                          style={{
                                            width: `${getMacroBarWidth(recipe.nutritionalFacts.calories, activeGoal.macroTargets.perMeal.calories)}%`
                                          }}
                                        />
                                      </div>
                                      <span className="text-gray-500">
                                        {recipe.nutritionalFacts.calories}/{activeGoal.macroTargets.perMeal.calories}
                                      </span>
                                    </div>
                                  )}
                                  {activeGoal.macroTargets.perMeal.protein && (
                                    <div className="flex items-center space-x-2 text-xs">
                                      <span className="w-12">Pro:</span>
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                        <div 
                                          className={`h-1 rounded-full ${getMacroColor(recipe.nutritionalFacts.protein, activeGoal.macroTargets.perMeal.protein)}`}
                                          style={{
                                            width: `${getMacroBarWidth(recipe.nutritionalFacts.protein, activeGoal.macroTargets.perMeal.protein)}%`
                                          }}
                                        />
                                      </div>
                                      <span className="text-gray-500">
                                        {recipe.nutritionalFacts.protein}g/{activeGoal.macroTargets.perMeal.protein}g
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Expandable ingredients/instructions - Mobile Optimized */}
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRecipe(selectedRecipe?.name === recipe.name ? null : recipe)}
                                className="text-xs"
                              >
                                {selectedRecipe?.name === recipe.name ? 'Hide Details' : 'View Recipe Details'}
                              </Button>
                              
                              {selectedRecipe?.name === recipe.name && (
                                <div className="mt-3 space-y-4 text-sm border-t pt-3 border-gray-200 dark:border-gray-600">
                                  <div>
                                    <h6 className="font-medium mb-2 text-gray-900 dark:text-white">Ingredients:</h6>
                                    <div className="space-y-1">
                                      {recipe.ingredients.map((ingredient, idx) => (
                                        <div key={idx} className="flex items-start py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                          <span className="inline-block h-1 w-1 rounded-full bg-emerald-600 mt-1.5 mr-2 flex-shrink-0"></span>
                                          <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{ingredient}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <h6 className="font-medium mb-2 text-gray-900 dark:text-white">Instructions:</h6>
                                    <div className="space-y-2">
                                      {recipe.instructions.map((step, idx) => (
                                        <div key={idx} className="flex items-start py-2 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-medium text-blue-800 dark:text-blue-200 mr-2 flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                          </span>
                                          <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{step}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Additional spacing for mobile safe area */}
                        <div className="h-4 sm:h-0"></div>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 