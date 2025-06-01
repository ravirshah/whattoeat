'use client';

import { useState, useEffect } from 'react';
import { UserGoal, DayOfWeek, MealType, PlannedMeal } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { X, Sparkles, Clock, Users, Target, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface RecipeSelectorProps {
  selectedDay: DayOfWeek;
  activeGoal: UserGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onRecipeSelect: (meal: PlannedMeal) => void;
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
  onRecipeSelect
}: RecipeSelectorProps) {
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedCarbBase, setSelectedCarbBase] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GoalRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<GoalRecipe | null>(null);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);

  useEffect(() => {
    if (isOpen && activeGoal) {
      // Auto-generate recipes when opened if we have a goal
      generateGoalBasedRecipes();
    }
  }, [isOpen, activeGoal, selectedMealType]);

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
          carbBase: selectedCarbBase || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const data = await response.json();
      
      if (data.recipes && data.recipes.length > 0) {
        setGeneratedRecipes(data.recipes);
        toast.success(`Generated ${data.recipes.length} recipes for your ${activeGoal.goalType.replace('_', ' ')} goal!`);
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
    const newMeal: PlannedMeal = {
      id: `meal_${Date.now()}`,
      recipeName: recipe.name,
      mealType: selectedMealType,
      servings: selectedServings,
      notes: '',
      carbBase: selectedCarbBase || undefined,
      plannedAt: Timestamp.now()
    };

    onRecipeSelect(newMeal);
    onClose();
    toast.success(`Added "${recipe.name}" to ${selectedDay}`);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Add Meal to {selectedDay}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeGoal ? `Recipes tailored for your ${activeGoal.name} goal` : 'Select a recipe for your meal plan'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Left Panel - Controls */}
          <div className="lg:w-1/3 p-6 border-r border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
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
                <label className="block text-sm font-medium mb-2">Carb Base (Optional)</label>
                <select
                  value={selectedCarbBase}
                  onChange={(e) => setSelectedCarbBase(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No preference</option>
                  {CARB_BASE_OPTIONS.map(base => (
                    <option key={base} value={base}>{base}</option>
                  ))}
                </select>
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

          {/* Right Panel - Recipe Results */}
          <div className="lg:w-2/3 overflow-y-auto">
            {generatedRecipes.length === 0 ? (
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
              <div className="p-6 space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Generated Recipes ({generatedRecipes.length})
                </h4>
                
                {generatedRecipes.map((recipe, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                          {recipe.name}
                        </h5>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
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
                      <Button
                        size="sm"
                        onClick={() => handleRecipeSelect(recipe)}
                        className="ml-4"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>

                    {/* Nutrition Summary */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
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

                    {/* Expandable ingredients/instructions */}
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
                        <div className="mt-3 space-y-3 text-sm">
                          <div>
                            <h6 className="font-medium mb-1">Ingredients:</h6>
                            <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                              {recipe.ingredients.map((ingredient, idx) => (
                                <li key={idx}>• {ingredient}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h6 className="font-medium mb-1">Instructions:</h6>
                            <ol className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                              {recipe.instructions.map((step, idx) => (
                                <li key={idx}>{idx + 1}. {step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 