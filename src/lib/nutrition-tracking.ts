import { PlannedMeal, UserGoal, MacroTarget, WeeklyPlan, DayOfWeek } from '@/types/weekly-planner';

// Enhanced nutritional information for goal-based recipes
export interface EnhancedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// Calculate total nutrition for a day
export const calculateDayNutrition = (meals: PlannedMeal[]): EnhancedNutrition => {
  return meals.reduce((total, meal) => {
    // In a full implementation, this would fetch actual recipe nutrition data
    // For now, we'll use estimated values based on meal type and servings
    const estimated = estimateMealNutrition(meal);
    
    return {
      calories: total.calories + estimated.calories,
      protein: total.protein + estimated.protein,
      carbs: total.carbs + estimated.carbs,
      fat: total.fat + estimated.fat,
      fiber: total.fiber + estimated.fiber,
      sugar: total.sugar + estimated.sugar,
      sodium: total.sodium + estimated.sodium
    };
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });
};

// Estimate nutrition for a planned meal (placeholder implementation)
export const estimateMealNutrition = (meal: PlannedMeal): EnhancedNutrition => {
  // Base nutrition estimates by meal type (these would come from actual recipe data)
  const baseNutrition = {
    'Breakfast': { calories: 350, protein: 15, carbs: 45, fat: 12, fiber: 5, sugar: 8, sodium: 400 },
    'Lunch': { calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 8, sugar: 6, sodium: 600 },
    'Dinner': { calories: 500, protein: 30, carbs: 35, fat: 22, fiber: 10, sugar: 5, sodium: 700 },
    'Snack': { calories: 200, protein: 8, carbs: 20, fat: 8, fiber: 3, sugar: 10, sodium: 200 }
  };

  const base = baseNutrition[meal.mealType];
  const servingMultiplier = meal.servings;

  return {
    calories: Math.round(base.calories * servingMultiplier),
    protein: Math.round(base.protein * servingMultiplier),
    carbs: Math.round(base.carbs * servingMultiplier),
    fat: Math.round(base.fat * servingMultiplier),
    fiber: Math.round(base.fiber * servingMultiplier),
    sugar: Math.round(base.sugar * servingMultiplier),
    sodium: Math.round(base.sodium * servingMultiplier)
  };
};

// Calculate goal progress for a specific macro
export const calculateMacroProgress = (
  actual: number,
  target: number | undefined
): { percentage: number; status: 'under' | 'on-track' | 'over' } => {
  if (!target) return { percentage: 0, status: 'on-track' };
  
  const percentage = (actual / target) * 100;
  
  let status: 'under' | 'on-track' | 'over';
  if (percentage < 80) status = 'under';
  else if (percentage <= 120) status = 'on-track';
  else status = 'over';
  
  return { percentage, status };
};

// Calculate weekly goal progress
export const calculateWeeklyProgress = (
  weeklyPlan: WeeklyPlan,
  goal: UserGoal
): {
  daily: { [key in DayOfWeek]: EnhancedNutrition };
  weekly: EnhancedNutrition;
  goalProgress: {
    calories: { percentage: number; status: 'under' | 'on-track' | 'over' };
    protein: { percentage: number; status: 'under' | 'on-track' | 'over' };
    carbs: { percentage: number; status: 'under' | 'on-track' | 'over' };
    fat: { percentage: number; status: 'under' | 'on-track' | 'over' };
  };
} => {
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Calculate nutrition for each day
  const daily = days.reduce((acc, day) => {
    acc[day] = calculateDayNutrition(weeklyPlan.meals[day] || []);
    return acc;
  }, {} as { [key in DayOfWeek]: EnhancedNutrition });
  
  // Calculate weekly totals
  const weekly = Object.values(daily).reduce((total, day) => ({
    calories: total.calories + day.calories,
    protein: total.protein + day.protein,
    carbs: total.carbs + day.carbs,
    fat: total.fat + day.fat,
    fiber: total.fiber + day.fiber,
    sugar: total.sugar + day.sugar,
    sodium: total.sodium + day.sodium
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });
  
  // Calculate goal progress
  const weeklyTarget = goal.macroTargets.daily;
  const goalProgress = {
    calories: calculateMacroProgress(weekly.calories / 7, weeklyTarget.calories),
    protein: calculateMacroProgress(weekly.protein / 7, weeklyTarget.protein),
    carbs: calculateMacroProgress(weekly.carbs / 7, weeklyTarget.carbs),
    fat: calculateMacroProgress(weekly.fat / 7, weeklyTarget.fat)
  };
  
  return { daily, weekly, goalProgress };
};

// Get color for macro progress status
export const getProgressColor = (status: 'under' | 'on-track' | 'over'): string => {
  switch (status) {
    case 'under': return 'text-yellow-600 dark:text-yellow-400';
    case 'on-track': return 'text-green-600 dark:text-green-400';
    case 'over': return 'text-red-600 dark:text-red-400';
  }
};

// Get background color for macro progress bars
export const getProgressBarColor = (status: 'under' | 'on-track' | 'over'): string => {
  switch (status) {
    case 'under': return 'bg-yellow-500';
    case 'on-track': return 'bg-green-500';
    case 'over': return 'bg-red-500';
  }
};

// Format nutrition value for display
export const formatNutritionValue = (value: number, unit: string): string => {
  if (unit === 'cal') return value.toString();
  return `${value}${unit}`;
};

// Calculate estimated grocery cost (placeholder)
export const estimateGroceryCost = (meals: PlannedMeal[]): number => {
  // This would integrate with actual pricing data
  const costPerMeal = {
    'Breakfast': 3.50,
    'Lunch': 5.00,
    'Dinner': 7.50,
    'Snack': 2.00
  };
  
  return meals.reduce((total, meal) => {
    return total + (costPerMeal[meal.mealType] * meal.servings);
  }, 0);
}; 