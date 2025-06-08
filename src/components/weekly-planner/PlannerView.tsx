'use client';

import { useState } from 'react';
import { WeeklyPlan, UserGoal, PlannerViewState, DayOfWeek, PlannedMeal, MealType } from '@/types/weekly-planner';
import { Button } from '@/components/ui';
import { Plus, Calendar, ChevronLeft, ChevronRight, Target, Clock, User, Edit2, Trash2, Eye, Copy, History, Heart, BarChart3, ChefHat } from 'lucide-react';
import { addMealToPlan, removeMealFromPlan, updateWeeklyPlan } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import RecipeSelector from './RecipeSelector';
import RecipeHistory from './RecipeHistory';
import Favorites from './Favorites';

interface PlannerViewProps {
  weeklyPlan: WeeklyPlan;
  activeGoal: UserGoal | null;
  plannerState: PlannerViewState;
  onStateUpdate: (updates: Partial<PlannerViewState>) => void;
  onPlanUpdate: (updatedPlan: WeeklyPlan) => void;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

const formatDate = (baseDate: Date, dayOffset: number) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Enhanced helper function to remove undefined values from objects before saving to Firestore
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined && item !== null)
      .map(cleanUndefinedValues);
  }
  
  if (obj instanceof Date || obj instanceof Object && obj.constructor === Date) {
    return obj;
  }
  
  // Handle Firestore Timestamp objects
  if (obj && typeof obj === 'object' && obj.toDate) {
    return obj;
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanUndefinedValues(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

export default function PlannerView({
  weeklyPlan,
  activeGoal,
  plannerState,
  onStateUpdate,
  onPlanUpdate,
  onNavigateWeek
}: PlannerViewProps) {
  const [draggedMeal, setDraggedMeal] = useState<{ meal: PlannedMeal; sourceDay: DayOfWeek } | null>(null);
  const [copyMode, setCopyMode] = useState<{ meal: PlannedMeal; sourceDay: DayOfWeek } | null>(null);

  // Handle different date types (Date object or Firestore Timestamp)
  const getDateFromValue = (dateValue: any): Date => {
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate();
    } else if (dateValue instanceof Date) {
      return dateValue;
    } else {
      return new Date(dateValue);
    }
  };
  
  const weekStartDate = getDateFromValue(weeklyPlan.weekStartDate);

  const formatDateRange = () => {
    // Handle both Date objects and Firestore Timestamps
    const getDateFromValue = (dateValue: any): Date => {
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        return dateValue.toDate();
      } else if (dateValue instanceof Date) {
        return dateValue;
      } else {
        return new Date(dateValue);
      }
    };
    
    const start = getDateFromValue(weeklyPlan.weekStartDate);
    const end = getDateFromValue(weeklyPlan.weekEndDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleAddMeal = (day: DayOfWeek) => {
    // If in copy mode, copy the meal to this day
    if (copyMode) {
      copyMealToDay(day);
      return;
    }

    onStateUpdate({
      selectedDay: day,
      isAddingMeal: true,
      modalMode: 'add'
    });
  };

  const handleRecipeSelect = async (meal: PlannedMeal) => {
    try {
      let updatedPlan;
      
      if (plannerState.modalMode === 'edit' && plannerState.selectedMeal) {
        // Update existing meal
        const dayMeals = weeklyPlan.meals[plannerState.selectedDay!];
        const updatedMeals = dayMeals.map(m => m.id === plannerState.selectedMeal!.id ? meal : m);
        
        updatedPlan = {
          ...weeklyPlan,
          meals: {
            ...weeklyPlan.meals,
            [plannerState.selectedDay!]: updatedMeals
          },
          updatedAt: Timestamp.now()
        };
      } else {
        // Add new meal
        updatedPlan = {
          ...weeklyPlan,
          meals: {
            ...weeklyPlan.meals,
            [plannerState.selectedDay!]: [
              ...weeklyPlan.meals[plannerState.selectedDay!],
              meal
            ]
          },
          updatedAt: Timestamp.now()
        };
      }

      // Update in database
      await updateWeeklyPlan(weeklyPlan.id, {
        meals: cleanUndefinedValues(updatedPlan.meals),
        updatedAt: updatedPlan.updatedAt
      });

      onPlanUpdate(updatedPlan);
      onStateUpdate({ 
        isAddingMeal: false, 
        selectedDay: null,
        selectedMeal: null,
        modalMode: undefined
      });

      const action = plannerState.modalMode === 'edit' ? 'Updated' : 'Added';
      toast.success(`${action} "${meal.recipeName}" ${plannerState.modalMode === 'edit' ? 'in' : 'to'} ${plannerState.selectedDay}`);
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal. Please try again.');
    }
  };

  const handleMealEdit = (day: DayOfWeek, meal: PlannedMeal) => {
    onStateUpdate({
      selectedDay: day,
      selectedMeal: meal,
      isAddingMeal: true,
      modalMode: 'edit'
    });
  };

  const handleMealView = (day: DayOfWeek, meal: PlannedMeal) => {
    onStateUpdate({
      selectedDay: day,
      selectedMeal: meal,
      isAddingMeal: true,
      modalMode: 'view'
    });
  };

  const handleMealCopy = (day: DayOfWeek, meal: PlannedMeal) => {
    setCopyMode({ meal, sourceDay: day });
    toast.info(`Click on any day to copy "${meal.recipeName}" there. Click elsewhere to cancel.`);
  };

  const copyMealToDay = async (targetDay: DayOfWeek) => {
    if (!copyMode) return;

    try {
      // Create a copy of the meal with a new ID
      const copiedMeal: PlannedMeal = {
        ...copyMode.meal,
        id: `meal_${Date.now()}`,
        plannedAt: Timestamp.now()
      };

      // Add to target day
      const updatedPlan = {
        ...weeklyPlan,
        meals: {
          ...weeklyPlan.meals,
          [targetDay]: [...weeklyPlan.meals[targetDay], copiedMeal]
        },
        updatedAt: Timestamp.now()
      };

      // Update in database
      await updateWeeklyPlan(weeklyPlan.id, {
        meals: cleanUndefinedValues(updatedPlan.meals),
        updatedAt: updatedPlan.updatedAt
      });

      onPlanUpdate(updatedPlan);
      setCopyMode(null);
      toast.success(`Copied "${copiedMeal.recipeName}" to ${targetDay}`);
    } catch (error) {
      console.error('Error copying meal:', error);
      toast.error('Failed to copy meal. Please try again.');
    }
  };

  const handleMealDelete = async (day: DayOfWeek, mealId: string) => {
    try {
      const updatedMeals = weeklyPlan.meals[day].filter(meal => meal.id !== mealId);
      const updatedPlan = {
        ...weeklyPlan,
        meals: {
          ...weeklyPlan.meals,
          [day]: updatedMeals
        },
        updatedAt: Timestamp.now()
      };

      // Update in database
      await updateWeeklyPlan(weeklyPlan.id, {
        meals: cleanUndefinedValues(updatedPlan.meals),
        updatedAt: updatedPlan.updatedAt
      });

      onPlanUpdate(updatedPlan);
      toast.success('Meal removed successfully');
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to remove meal. Please try again.');
    }
  };

  const handleDragStart = (meal: PlannedMeal, sourceDay: DayOfWeek) => {
    setDraggedMeal({ meal, sourceDay });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDay: DayOfWeek) => {
    e.preventDefault();
    
    if (!draggedMeal) return;
    
    const { meal, sourceDay } = draggedMeal;
    
    if (sourceDay === targetDay) {
      setDraggedMeal(null);
      return;
    }

    try {
      // Remove from source day
      const sourceMeals = weeklyPlan.meals[sourceDay].filter(m => m.id !== meal.id);
      
      // Add to target day
      const targetMeals = [...weeklyPlan.meals[targetDay], meal];
      
      const updatedPlan = {
        ...weeklyPlan,
        meals: {
          ...weeklyPlan.meals,
          [sourceDay]: sourceMeals,
          [targetDay]: targetMeals
        },
        updatedAt: Timestamp.now()
      };

      // Update in database
      await updateWeeklyPlan(weeklyPlan.id, {
        meals: cleanUndefinedValues(updatedPlan.meals),
        updatedAt: updatedPlan.updatedAt
      });

      onPlanUpdate(updatedPlan);
      toast.success(`Moved "${meal.recipeName}" from ${sourceDay} to ${targetDay}`);
    } catch (error) {
      console.error('Error moving meal:', error);
      toast.error('Failed to move meal. Please try again.');
    } finally {
      setDraggedMeal(null);
    }
  };

  const handleMealTypeChange = async (draggedMealData: { meal: PlannedMeal; sourceDay: DayOfWeek }, targetDay: DayOfWeek, newMealType: MealType) => {
    if (!draggedMealData) return;
    
    const { meal, sourceDay } = draggedMealData;
    
    try {
      // Create updated meal with new meal type
      const updatedMeal = {
        ...meal,
        mealType: newMealType
      };

      let updatedPlan;
      
      if (sourceDay === targetDay) {
        // Same day, just changing meal type
        const dayMeals = weeklyPlan.meals[sourceDay];
        const updatedMeals = dayMeals.map(m => m.id === meal.id ? updatedMeal : m);
        
        updatedPlan = {
          ...weeklyPlan,
          meals: {
            ...weeklyPlan.meals,
            [sourceDay]: updatedMeals
          },
          updatedAt: Timestamp.now()
        };
      } else {
        // Different day, move and change meal type
        const sourceMeals = weeklyPlan.meals[sourceDay].filter(m => m.id !== meal.id);
        const targetMeals = [...weeklyPlan.meals[targetDay], updatedMeal];
        
        updatedPlan = {
          ...weeklyPlan,
          meals: {
            ...weeklyPlan.meals,
            [sourceDay]: sourceMeals,
            [targetDay]: targetMeals
          },
          updatedAt: Timestamp.now()
        };
      }

      // Update in database
      await updateWeeklyPlan(weeklyPlan.id, {
        meals: cleanUndefinedValues(updatedPlan.meals),
        updatedAt: updatedPlan.updatedAt
      });

      onPlanUpdate(updatedPlan);
      
      if (sourceDay === targetDay) {
        toast.success(`Changed "${meal.recipeName}" to ${newMealType}`);
      } else {
        toast.success(`Moved "${meal.recipeName}" from ${sourceDay} to ${targetDay} as ${newMealType}`);
      }
    } catch (error) {
      console.error('Error changing meal type:', error);
      toast.error('Failed to change meal type. Please try again.');
    } finally {
      setDraggedMeal(null);
    }
  };

  const getTotalMealsForDay = (day: DayOfWeek) => {
    return weeklyPlan.meals[day]?.length || 0;
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'Breakfast': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Lunch': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Dinner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Snack': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Cancel copy mode when clicking outside
  const handleCancelCopy = () => {
    if (copyMode) {
      setCopyMode(null);
      toast.info('Copy cancelled');
    }
  };

  return (
    <div className="space-y-6" onClick={handleCancelCopy}>
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatDateRange()}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigateWeek?.('previous')}
            disabled={!onNavigateWeek}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigateWeek?.('next')}
            disabled={!onNavigateWeek}
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Copy Mode Banner */}
      {copyMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Copy className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Copy Mode Active
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Click on any day to copy "{copyMode.meal.recipeName}" there
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleCancelCopy();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayMeals = weeklyPlan.meals[day] || [];
          const isCopyTarget = copyMode && copyMode.sourceDay !== day;

          // Group meals by type for better organization
          const mealsByType = {
            Breakfast: dayMeals.filter(meal => meal.mealType === 'Breakfast'),
            Lunch: dayMeals.filter(meal => meal.mealType === 'Lunch'),
            Dinner: dayMeals.filter(meal => meal.mealType === 'Dinner'),
            Snack: dayMeals.filter(meal => meal.mealType === 'Snack')
          };

          return (
            <div
              key={day}
              className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[400px] flex flex-col ${
                isCopyTarget ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/10 shadow-md' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              onClick={(e) => {
                if (copyMode) {
                  e.stopPropagation();
                  copyMealToDay(day);
                }
              }}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {day}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(weekStartDate, index)}
                  </p>
                  {isCopyTarget && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Click to copy here
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddMeal(day);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Meals organized by type */}
              <div className="flex-1 space-y-4 p-4">
                {Object.entries(mealsByType).map(([mealType, meals]) => (
                  <div key={mealType} className="space-y-2">
                    {/* Meal Type Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {mealType} {meals.length > 0 && `(${meals.length})`}
                      </h4>
                    </div>

                    {/* Meal Type Drop Zone */}
                    <div 
                      className={`min-h-[60px] rounded-lg border-2 border-dashed transition-all ${
                        draggedMeal ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedMeal) {
                          handleMealTypeChange(draggedMeal, day, mealType as any);
                        }
                      }}
                    >
                      {meals.length === 0 ? (
                        <div className="flex items-center justify-center h-full p-4">
                          <p className="text-xs text-gray-400 text-center">
                            {draggedMeal ? `Drop to change to ${mealType}` : `No ${mealType.toLowerCase()} planned`}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 p-2">
                          {meals.map((meal) => (
                            <div
                              key={meal.id}
                              draggable
                              onDragStart={() => handleDragStart(meal, day)}
                              className="group bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all cursor-move relative"
                            >
                              {/* Recipe Name - with proper text wrapping */}
                              <div className="mb-2">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-tight break-words">
                                  {meal.recipeName}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                  {meal.servings > 1 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {meal.servings}x servings
                                    </span>
                                  )}
                                  {meal.carbBase && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      with {meal.carbBase}
                                    </span>
                                  )}
                                </div>
                                {meal.notes && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic break-words">
                                    {meal.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Action Buttons - positioned at bottom and properly spaced */}
                              <div className="flex items-center justify-end space-x-1 pt-2 border-t border-gray-200 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMealView(day, meal);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                  title="View Recipe"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMealEdit(day, meal);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                                  title="Edit Meal"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMealCopy(day, meal);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900"
                                  title="Copy Meal"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMealDelete(day, meal.id);
                                  }}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                                  title="Delete Meal"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add Meal Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddMeal(day);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meal
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-emerald-600">
            {Object.values(weeklyPlan.meals).flat().length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Meals Planned</div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {DAYS_OF_WEEK.filter(day => weeklyPlan.meals[day]?.length > 0).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Days with Meals</div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-purple-600">
            {Object.values(weeklyPlan.meals).flat().filter(meal => meal.mealType === 'Breakfast').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Breakfasts</div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">
            {Object.values(weeklyPlan.meals).flat().filter(meal => meal.mealType === 'Dinner').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Dinners</div>
        </div>
      </div>

      {/* Goal Progress Summary */}
      {activeGoal && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
          <h3 className="font-medium text-emerald-900 dark:text-emerald-100 mb-4">
            Weekly Goal Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {DAYS_OF_WEEK.reduce((sum, day) => sum + (weeklyPlan.meals[day] || []).length, 0)}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Meals Planned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {DAYS_OF_WEEK.filter(day => (weeklyPlan.meals[day] || []).length > 0).length}/7
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Days Planned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {activeGoal.goalType.replace('_', ' ')}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Goal Type</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {activeGoal.macroTargets.daily?.calories || '?'}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Daily Target (cal)</div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Selector Modal */}
      <RecipeSelector
        selectedDay={plannerState.selectedDay!}
        activeGoal={activeGoal}
        isOpen={plannerState.isAddingMeal}
        onClose={() => onStateUpdate({ isAddingMeal: false, selectedDay: null, selectedMeal: null, modalMode: undefined })}
        onRecipeSelect={handleRecipeSelect}
        existingMeal={plannerState.selectedMeal}
        mode={plannerState.modalMode || 'add'}
      />
    </div>
  );
} 