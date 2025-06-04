'use client';

import { useState, useEffect } from 'react';
import { MealPrepPlan, PrepSession, WeeklyPlan, PlannedMeal } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { ChefHat, X, Clock, Calendar, Plus, Play, Pause, CheckCircle, AlertCircle } from 'lucide-react';
import { getMealPrepPlan, saveMealPrepPlan, updateMealPrepPlan } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';

interface MealPrepPlannerProps {
  userId: string;
  weeklyPlan: WeeklyPlan;
  onClose: () => void;
}

export default function MealPrepPlanner({
  userId,
  weeklyPlan,
  onClose
}: MealPrepPlannerProps) {
  const [mealPrepPlan, setMealPrepPlan] = useState<MealPrepPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadMealPrepPlan();
  }, [weeklyPlan.id]);

  const loadMealPrepPlan = async () => {
    try {
      setIsLoading(true);
      const plan = await getMealPrepPlan(weeklyPlan.id);
      setMealPrepPlan(plan);
    } catch (error) {
      console.error('Error loading meal prep plan:', error);
      toast.error('Failed to load meal prep plan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMealPrepPlan = async () => {
    setIsGenerating(true);
    try {
      // Get all planned meals
      const allMeals = Object.values(weeklyPlan.meals).flat();
      
      if (allMeals.length === 0) {
        toast.error('No meals planned for this week');
        return;
      }

      // Group meals by prep requirements and create prep sessions
      const prepSessions: PrepSession[] = [];
      
      // Sunday prep session for the week
      const sundayPrep: PrepSession = {
        id: 'sunday_prep',
        date: getWeekendDate(weeklyPlan.weekStartDate, 0), // Sunday before the week
        recipes: [],
        estimatedTime: 0,
        priority: 'high',
        status: 'planned',
        notes: 'Weekly meal prep session'
      };

      // Wednesday mid-week prep
      const wednesdayPrep: PrepSession = {
        id: 'wednesday_prep',
        date: getWeekDate(weeklyPlan.weekStartDate, 2), // Wednesday
        recipes: [],
        estimatedTime: 0,
        priority: 'medium',
        status: 'planned',
        notes: 'Mid-week fresh prep'
      };

      // Analyze meals and distribute prep tasks
      allMeals.forEach((meal, index) => {
        const prepRecipe = {
          recipeName: meal.recipeName,
          servings: meal.servings,
          prepSteps: generatePrepSteps(meal),
          storageInstructions: getStorageInstructions(meal),
          shelfLife: getShelfLife(meal),
          reheatingInstructions: getReheatingInstructions(meal)
        };

        // Assign to prep session based on meal timing and type
        if (index < allMeals.length / 2) {
          sundayPrep.recipes.push(prepRecipe);
          sundayPrep.estimatedTime += estimatePrepTime(meal);
        } else {
          wednesdayPrep.recipes.push(prepRecipe);
          wednesdayPrep.estimatedTime += estimatePrepTime(meal);
        }
      });

      // Only add sessions that have recipes
      if (sundayPrep.recipes.length > 0) prepSessions.push(sundayPrep);
      if (wednesdayPrep.recipes.length > 0) prepSessions.push(wednesdayPrep);

      const newPlan: Omit<MealPrepPlan, 'id'> = {
        userId,
        weeklyPlanId: weeklyPlan.id,
        prepSessions,
        totalPrepTime: prepSessions.reduce((sum, session) => sum + session.estimatedTime, 0),
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };

      const planId = await saveMealPrepPlan(newPlan);
      setMealPrepPlan({ id: planId, ...newPlan });
      toast.success('Meal prep plan generated successfully!');
    } catch (error) {
      console.error('Error generating meal prep plan:', error);
      toast.error('Failed to generate meal prep plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper functions
  const getWeekDate = (startDate: Date, dayOffset: number): Date => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    return date;
  };

  const getWeekendDate = (startDate: Date, dayOffset: number): Date => {
    const date = new Date(startDate);
    date.setDate(date.getDate() - 1 + dayOffset); // Sunday before the week
    return date;
  };

  const generatePrepSteps = (meal: PlannedMeal): string[] => {
    const steps = [
      `Gather ingredients for ${meal.recipeName}`,
      'Wash and prep vegetables',
      'Pre-cook proteins if needed',
      'Prepare base ingredients'
    ];

    if (meal.carbBase) {
      steps.push(`Cook ${meal.carbBase} in bulk`);
    }

    steps.push('Portion into containers', 'Label with date and reheating instructions');
    return steps;
  };

  const getStorageInstructions = (meal: PlannedMeal): string => {
    return `Store in airtight containers in refrigerator. Keep proteins and vegetables separate if possible.`;
  };

  const getShelfLife = (meal: PlannedMeal): number => {
    // Default to 4 days for most meal preps
    if (meal.mealType === 'Breakfast') return 5; // Breakfast items last longer
    if (meal.recipeName.toLowerCase().includes('salad')) return 2; // Salads don't last as long
    return 4;
  };

  const getReheatingInstructions = (meal: PlannedMeal): string => {
    return `Microwave for 1-2 minutes or heat in oven at 350°F for 10-15 minutes. Add fresh herbs or sauce before serving.`;
  };

  const estimatePrepTime = (meal: PlannedMeal): number => {
    // Estimate prep time based on meal complexity
    let baseTime = 30; // 30 minutes base
    
    if (meal.mealType === 'Breakfast') baseTime = 20;
    if (meal.mealType === 'Dinner') baseTime = 45;
    if (meal.servings > 4) baseTime += 15; // Extra time for larger batches
    
    return baseTime;
  };

  const updateSessionStatus = async (sessionId: string, status: PrepSession['status']) => {
    if (!mealPrepPlan) return;

    const updatedSessions = mealPrepPlan.prepSessions.map(session =>
      session.id === sessionId ? { ...session, status } : session
    );

    const updatedPlan = { ...mealPrepPlan, prepSessions: updatedSessions };
    setMealPrepPlan(updatedPlan);

    try {
      await updateMealPrepPlan(mealPrepPlan.id, { prepSessions: updatedSessions });
      toast.success(`Prep session ${status}`);
    } catch (error) {
      console.error('Error updating prep session:', error);
      toast.error('Failed to update prep session');
    }
  };

  const getStatusIcon = (status: PrepSession['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'planned': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: PrepSession['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'in-progress': return 'bg-blue-50 border-blue-200';
      case 'planned': return 'bg-gray-50 border-gray-200';
      default: return 'bg-yellow-50 border-yellow-200';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChefHat className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Meal Prep Planner
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Optimize your meal prep with smart scheduling
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!mealPrepPlan && (
            <Button
              onClick={generateMealPrepPlan}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!mealPrepPlan ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No meal prep plan yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a smart meal prep plan based on your weekly meals
          </p>
          <Button onClick={generateMealPrepPlan} disabled={isGenerating}>
            <Plus className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating Plan...' : 'Generate Meal Prep Plan'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {mealPrepPlan.prepSessions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Prep Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(mealPrepPlan.totalPrepTime)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {mealPrepPlan.prepSessions.reduce((sum, session) => sum + session.recipes.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Recipes</div>
            </div>
          </div>

          {/* Prep Sessions */}
          <div className="space-y-4">
            {mealPrepPlan.prepSessions.map((session) => (
              <div
                key={session.id}
                className={`border rounded-lg p-4 ${getStatusColor(session.status)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {formatDate(session.date)}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(session.estimatedTime)} • {session.recipes.length} recipes
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={session.priority === 'high' ? 'default' : 'secondary'}>
                      {session.priority}
                    </Badge>
                    
                    {session.status === 'planned' && (
                      <Button
                        size="sm"
                        onClick={() => updateSessionStatus(session.id, 'in-progress')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {session.status === 'in-progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateSessionStatus(session.id, 'completed')}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recipe List */}
                <div className="space-y-3">
                  {session.recipes.map((recipe, index) => (
                    <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {recipe.recipeName}
                        </h5>
                        <Badge variant="outline">
                          {recipe.servings} servings
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Storage:</strong> {recipe.storageInstructions}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Shelf Life:</strong> {recipe.shelfLife} days
                      </div>
                    </div>
                  ))}
                </div>

                {session.notes && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Notes:</strong> {session.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 