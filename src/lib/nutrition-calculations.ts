import { WeeklyPlan, UserGoal, PlannedMeal, DayOfWeek } from '@/types/weekly-planner';

// Consolidated nutrition calculation types
export interface UnifiedNutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface DailyNutritionBreakdown {
  [day: string]: UnifiedNutritionData;
}

export interface WeeklyNutritionSummary {
  daily: DailyNutritionBreakdown;
  weeklyTotals: UnifiedNutritionData;
  dailyAverages: UnifiedNutritionData;
  goalComparison: {
    calories: { current: number; target: number; percentage: number; status: 'under' | 'on-track' | 'over' };
    protein: { current: number; target: number; percentage: number; status: 'under' | 'on-track' | 'over' };
    carbs: { current: number; target: number; percentage: number; status: 'under' | 'on-track' | 'over' };
    fat: { current: number; target: number; percentage: number; status: 'under' | 'on-track' | 'over' };
  };
  mealSources: {
    aiGenerated: number;
    chatInput: number;
    favorites: number;
    total: number;
  };
}

export interface MacroDistribution {
  name: string;
  value: number;
  percentage: number;
  color: string;
  target: number;
  targetPercentage: number;
}

/**
 * Extracts nutrition facts from a planned meal, handling all recipe sources
 * (AI generated, chat input, favorites) consistently
 */
export const extractMealNutrition = (meal: PlannedMeal): UnifiedNutritionData => {
  const defaultNutrition: UnifiedNutritionData = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  };

  // Check if meal has proper recipe details with nutritional facts
  if (!meal.recipeDetails?.nutritionalFacts) {
    return defaultNutrition;
  }

  const nutrition = meal.recipeDetails.nutritionalFacts;
  const servingMultiplier = meal.servings || 1;

  return {
    calories: (nutrition.calories || 0) * servingMultiplier,
    protein: (nutrition.protein || 0) * servingMultiplier,
    carbs: (nutrition.carbs || 0) * servingMultiplier,
    fat: (nutrition.fat || 0) * servingMultiplier,
    fiber: (nutrition.fiber || 0) * servingMultiplier,
    sugar: (nutrition.sugar || 0) * servingMultiplier,
    sodium: (nutrition.sodium || 0) * servingMultiplier
  };
};

/**
 * Identifies the source of a recipe based on its properties
 */
export const identifyRecipeSource = (meal: PlannedMeal): 'aiGenerated' | 'chatInput' | 'favorites' => {
  // Check goal alignment for AI generated recipes
  if (meal.recipeDetails?.goalAlignment) {
    return 'aiGenerated';
  }
  
  // Check if it came from chat input (usually has certain patterns)
  if (meal.recipeName?.toLowerCase().includes('nutrition entry') || 
      meal.recipeName?.toLowerCase().includes('quick meal') ||
      meal.recipeName?.toLowerCase().includes('parsed from')) {
    return 'chatInput';
  }
  
  // Check if it came from favorites (has certain metadata)
  if (meal.recipeDetails?.times && 
      (meal.recipeDetails.times.includes('favorite') ||
       meal.recipeDetails.times.includes('saved'))) {
    return 'favorites';
  }
  
  // Default to AI generated if unclear
  return 'aiGenerated';
};

/**
 * Calculates comprehensive weekly nutrition data from a weekly plan
 */
export const calculateWeeklyNutrition = (
  weeklyPlan: WeeklyPlan,
  activeGoal: UserGoal | null
): WeeklyNutritionSummary => {
  const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Initialize tracking variables
  const dailyBreakdown: DailyNutritionBreakdown = {};
  let weeklyTotals: UnifiedNutritionData = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  };
  
  let mealSources = {
    aiGenerated: 0,
    chatInput: 0,
    favorites: 0,
    total: 0
  };

  // Calculate nutrition for each day
  daysOfWeek.forEach(day => {
    const dayMeals = weeklyPlan.meals[day] || [];
    let dayTotals: UnifiedNutritionData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };

    // Process each meal
    dayMeals.forEach(meal => {
      const mealNutrition = extractMealNutrition(meal);
      
      // Add to day totals
      dayTotals.calories += mealNutrition.calories;
      dayTotals.protein += mealNutrition.protein;
      dayTotals.carbs += mealNutrition.carbs;
      dayTotals.fat += mealNutrition.fat;
      dayTotals.fiber += mealNutrition.fiber;
      dayTotals.sugar += mealNutrition.sugar;
      dayTotals.sodium += mealNutrition.sodium;
      
      // Track meal source
      const source = identifyRecipeSource(meal);
      mealSources[source]++;
      mealSources.total++;
    });

    dailyBreakdown[day] = dayTotals;
    
    // Add to weekly totals
    weeklyTotals.calories += dayTotals.calories;
    weeklyTotals.protein += dayTotals.protein;
    weeklyTotals.carbs += dayTotals.carbs;
    weeklyTotals.fat += dayTotals.fat;
    weeklyTotals.fiber += dayTotals.fiber;
    weeklyTotals.sugar += dayTotals.sugar;
    weeklyTotals.sodium += dayTotals.sodium;
  });

  // Calculate daily averages
  const dailyAverages: UnifiedNutritionData = {
    calories: weeklyTotals.calories / 7,
    protein: weeklyTotals.protein / 7,
    carbs: weeklyTotals.carbs / 7,
    fat: weeklyTotals.fat / 7,
    fiber: weeklyTotals.fiber / 7,
    sugar: weeklyTotals.sugar / 7,
    sodium: weeklyTotals.sodium / 7
  };

  // Calculate goal comparison
  const goalTargets = activeGoal?.macroTargets.daily || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65
  };

  const calculateMacroProgress = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    let status: 'under' | 'on-track' | 'over' = 'on-track';
    
    if (percentage < 85) status = 'under';
    else if (percentage > 115) status = 'over';
    
    return { current, target, percentage, status };
  };

  const goalComparison = {
    calories: calculateMacroProgress(dailyAverages.calories, goalTargets.calories || 2000),
    protein: calculateMacroProgress(dailyAverages.protein, goalTargets.protein || 150),
    carbs: calculateMacroProgress(dailyAverages.carbs, goalTargets.carbs || 200),
    fat: calculateMacroProgress(dailyAverages.fat, goalTargets.fat || 65)
  };

  return {
    daily: dailyBreakdown,
    weeklyTotals,
    dailyAverages,
    goalComparison,
    mealSources
  };
};

/**
 * Calculates macro distribution data for pie charts
 */
export const calculateMacroDistribution = (
  nutritionData: UnifiedNutritionData,
  goalTargets: any
): MacroDistribution[] => {
  const totalCals = nutritionData.calories;
  
  // Calculate calories from each macro
  const proteinCals = nutritionData.protein * 4;
  const carbsCals = nutritionData.carbs * 4;
  const fatCals = nutritionData.fat * 9;
  
  // Calculate target distribution
  const goalCalories = goalTargets?.calories || 2000;
  const goalProtein = goalTargets?.protein || 150;
  const goalCarbs = goalTargets?.carbs || 200;
  const goalFat = goalTargets?.fat || 65;
  
  const goalProteinCals = goalProtein * 4;
  const goalCarbsCals = goalCarbs * 4;
  const goalFatCals = goalFat * 9;

  return [
    {
      name: 'Protein',
      value: proteinCals,
      percentage: totalCals > 0 ? (proteinCals / totalCals) * 100 : 0,
      color: '#10b981', // emerald-500
      target: goalProteinCals,
      targetPercentage: (goalProteinCals / goalCalories) * 100
    },
    {
      name: 'Carbs',
      value: carbsCals,
      percentage: totalCals > 0 ? (carbsCals / totalCals) * 100 : 0,
      color: '#f59e0b', // amber-500
      target: goalCarbsCals,
      targetPercentage: (goalCarbsCals / goalCalories) * 100
    },
    {
      name: 'Fat',
      value: fatCals,
      percentage: totalCals > 0 ? (fatCals / totalCals) * 100 : 0,
      color: '#8b5cf6', // violet-500
      target: goalFatCals,
      targetPercentage: (goalFatCals / goalCalories) * 100
    }
  ];
};

/**
 * Generates insights and recommendations based on nutrition data
 */
export const generateNutritionInsights = (
  weeklyData: WeeklyNutritionSummary,
  weeklyPlan: WeeklyPlan
): string[] => {
  const insights: string[] = [];
  const { goalComparison, mealSources, dailyAverages } = weeklyData;
  
  // Calorie insights
  if (goalComparison.calories.status === 'under') {
    insights.push(`📈 You're ${Math.round(goalComparison.calories.target - goalComparison.calories.current)} calories below your daily target. Consider adding healthy snacks or increasing portions.`);
  } else if (goalComparison.calories.status === 'over') {
    insights.push(`⚠️ You're ${Math.round(goalComparison.calories.current - goalComparison.calories.target)} calories above your daily target. Consider lighter options or smaller portions.`);
  } else {
    insights.push(`✅ Your daily calorie intake is well-balanced with your goals!`);
  }
  
  // Protein insights
  if (goalComparison.protein.percentage > 120) {
    insights.push(`💪 Excellent protein intake - great for muscle building and satiety!`);
  } else if (goalComparison.protein.percentage < 80) {
    insights.push(`🥩 Consider increasing protein intake for better satiety and muscle support.`);
  }
  
  // Meal planning consistency
  const totalMeals = Object.values(weeklyPlan.meals).flat().length;
  if (totalMeals >= 20) {
    insights.push(`🎯 Excellent meal planning consistency with ${totalMeals} meals planned!`);
  } else if (totalMeals >= 15) {
    insights.push(`👍 Good meal planning with ${totalMeals} meals. Try adding a few more for complete coverage.`);
  } else {
    insights.push(`📝 Consider planning more meals for better nutrition tracking and consistency.`);
  }
  
  // Recipe source diversity
  if (mealSources.chatInput > 0 && mealSources.favorites > 0 && mealSources.aiGenerated > 0) {
    insights.push(`🌟 Great recipe variety using AI generated (${mealSources.aiGenerated}), favorites (${mealSources.favorites}), and chat input (${mealSources.chatInput}) meals!`);
  } else if (mealSources.total > 0) {
    const primarySource = mealSources.aiGenerated > mealSources.favorites && mealSources.aiGenerated > mealSources.chatInput ? 'AI generated' :
                         mealSources.favorites > mealSources.chatInput ? 'favorites' : 'chat input';
    insights.push(`📊 Most meals are from ${primarySource} recipes. Try exploring other recipe sources for more variety!`);
  }
  
  return insights;
}; 