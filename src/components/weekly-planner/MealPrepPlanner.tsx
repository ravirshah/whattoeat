'use client';

import { useState, useEffect } from 'react';
import { MealPrepPlan, PrepSession, WeeklyPlan, PlannedMeal } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { ChefHat, X, Clock, Calendar, Plus, Play, Pause, CheckCircle, AlertCircle, Users, Timer } from 'lucide-react';
import { getMealPrepPlan, saveMealPrepPlan, updateMealPrepPlan } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';

interface MealPrepPlannerProps {
  userId: string;
  weeklyPlan: WeeklyPlan;
  onClose: () => void;
}

// Enhanced recipe analysis interfaces
interface RecipeAnalysis {
  meal: PlannedMeal;
  complexity: 'low' | 'medium' | 'high';
  cookingMethods: string[];
  mainIngredients: string[];
  proteins: string[];
  vegetables: string[];
  grains: string[];
  prepTechniques: string[];
  estimatedPrepTime: number;
  estimatedCookTime: number;
  shelfLife: number;
  canBatchCook: boolean;
  requiresFreshIngredients: boolean;
  source: 'ai_generated' | 'chat_input' | 'favorites' | 'unknown';
}

interface PrepGroup {
  id: string;
  name: string;
  recipes: RecipeAnalysis[];
  sharedIngredients: string[];
  totalPrepTime: number;
  prepDate: Date;
  priority: 'high' | 'medium' | 'low';
  batchOpportunities: string[];
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

  // Enhanced recipe analysis function
  const analyzeRecipe = (meal: PlannedMeal): RecipeAnalysis => {
    // Add safety checks for undefined meals and properties
    if (!meal || !meal.recipeName) {
      console.warn('Invalid meal object passed to analyzeRecipe:', meal);
      // Return a safe default analysis for invalid meals
      return {
        meal: meal || {} as PlannedMeal,
        complexity: 'low',
        cookingMethods: [],
        mainIngredients: [],
        proteins: [],
        vegetables: [],
        grains: [],
        prepTechniques: [],
        estimatedPrepTime: 15,
        estimatedCookTime: 20,
        shelfLife: 3,
        canBatchCook: false,
        requiresFreshIngredients: false,
        source: 'unknown'
      };
    }

    const ingredients = meal.recipeDetails?.ingredients || [];
    const instructions = meal.recipeDetails?.instructions || [];
    const recipeName = meal.recipeName.toLowerCase();
    
    // Determine source
    let source: RecipeAnalysis['source'] = 'unknown';
    if (meal.id.startsWith('chat_')) {
      source = 'chat_input';
    } else if (meal.recipeDetails?.goalAlignment?.macroFit === 'From your favorites' || 
               meal.recipeDetails?.goalAlignment?.macroFit === 'From your saved recipes') {
      source = 'favorites';
    } else if (meal.recipeDetails?.goalAlignment) {
      source = 'ai_generated';
    }

    // Analyze complexity based on ingredients, instructions, and cooking methods
    let complexity: RecipeAnalysis['complexity'] = 'medium';
    const complexityFactors = [
      ingredients.length > 8,
      instructions.length > 6,
      recipeName.includes('braised') || recipeName.includes('slow') || recipeName.includes('marinated'),
      instructions.some(step => step.toLowerCase().includes('marinate') || step.toLowerCase().includes('overnight')),
      ingredients.some(ing => ing.toLowerCase().includes('sauce') && ing.toLowerCase().includes('scratch'))
    ];
    
    const complexityScore = complexityFactors.filter(Boolean).length;
    if (complexityScore >= 3) complexity = 'high';
    else if (complexityScore <= 1) complexity = 'low';

    // Extract cooking methods
    const cookingMethods: string[] = [];
    const allText = [...ingredients, ...instructions, recipeName].join(' ').toLowerCase();
    
    const methodKeywords = {
      'sauté': ['sauté', 'sautéed', 'pan fry', 'stir fry'],
      'roast': ['roast', 'roasted', 'bake', 'baked'],
      'grill': ['grill', 'grilled', 'bbq'],
      'steam': ['steam', 'steamed'],
      'boil': ['boil', 'boiled', 'simmer', 'simmered'],
      'slow_cook': ['slow cook', 'braised', 'stew', 'crockpot'],
      'raw': ['raw', 'salad', 'fresh']
    };

    Object.entries(methodKeywords).forEach(([method, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        cookingMethods.push(method);
      }
    });

    // Categorize ingredients
    const proteins: string[] = [];
    const vegetables: string[] = [];
    const grains: string[] = [];
    const mainIngredients: string[] = [];

    const proteinKeywords = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 'tofu', 'tempeh', 'eggs', 'beans', 'lentils', 'chickpeas'];
    const vegetableKeywords = ['broccoli', 'spinach', 'kale', 'carrots', 'peppers', 'onions', 'tomatoes', 'zucchini', 'mushrooms', 'asparagus', 'cauliflower', 'lettuce'];
    const grainKeywords = ['rice', 'quinoa', 'pasta', 'bread', 'oats', 'barley', 'bulgur', 'couscous'];

    ingredients.forEach(ingredient => {
      const ing = ingredient.toLowerCase();
      
      if (proteinKeywords.some(keyword => ing.includes(keyword))) {
        proteins.push(ingredient);
        mainIngredients.push(ingredient);
      } else if (vegetableKeywords.some(keyword => ing.includes(keyword))) {
        vegetables.push(ingredient);
      } else if (grainKeywords.some(keyword => ing.includes(keyword))) {
        grains.push(ingredient);
        mainIngredients.push(ingredient);
      }
    });

    // Identify prep techniques
    const prepTechniques: string[] = [];
    const techniqueKeywords = {
      'chopping': ['chop', 'dice', 'mince', 'slice'],
      'marinating': ['marinate', 'season', 'rub'],
      'batch_cooking': ['bulk', 'large batch', 'double recipe'],
      'advance_prep': ['prepare ahead', 'make ahead', 'prep'],
      'washing': ['wash', 'rinse', 'clean']
    };

    Object.entries(techniqueKeywords).forEach(([technique, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        prepTechniques.push(technique);
      }
    });

    // Estimate times based on recipe analysis
    let estimatedPrepTime = 20; // Base prep time
    let estimatedCookTime = 25; // Base cook time

    // Adjust based on complexity and ingredients
    if (complexity === 'high') {
      estimatedPrepTime += 20;
      estimatedCookTime += 15;
    } else if (complexity === 'low') {
      estimatedPrepTime -= 5;
      estimatedCookTime -= 5;
    }

    // Adjust for cooking methods
    if (cookingMethods.includes('slow_cook')) estimatedCookTime += 60;
    if (cookingMethods.includes('roast')) estimatedCookTime += 10;
    if (cookingMethods.includes('raw')) estimatedCookTime = 0;

    // Adjust for batch size
    if (meal.servings > 4) {
      estimatedPrepTime += Math.floor((meal.servings - 4) * 3);
    }

    // Determine shelf life more intelligently
    let shelfLife = 4; // Default
    if (cookingMethods.includes('raw') || vegetables.length > proteins.length) {
      shelfLife = 2; // Fresh items don't last as long
    } else if (cookingMethods.includes('slow_cook') || proteins.length > 0) {
      shelfLife = 5; // Cooked proteins last longer
    }

    if (meal.mealType === 'Breakfast') shelfLife += 1; // Breakfast items tend to last longer

    // Determine batch cooking potential
    const canBatchCook = 
      !cookingMethods.includes('raw') && 
      meal.servings >= 2 && 
      !recipeName.includes('fresh') &&
      !recipeName.includes('daily');

    // Check if requires fresh ingredients
    const requiresFreshIngredients = 
      cookingMethods.includes('raw') ||
      vegetables.length > 3 ||
      recipeName.includes('salad') ||
      recipeName.includes('fresh');

    return {
      meal,
      complexity,
      cookingMethods,
      mainIngredients,
      proteins,
      vegetables,
      grains,
      prepTechniques,
      estimatedPrepTime,
      estimatedCookTime,
      shelfLife,
      canBatchCook,
      requiresFreshIngredients,
      source
    };
  };

  // Consolidate duplicate recipes and calculate optimal batch sizes
  const consolidateRecipes = (analyses: RecipeAnalysis[]): RecipeAnalysis[] => {
    const recipeMap = new Map<string, RecipeAnalysis>();
    
    analyses.forEach(analysis => {
      const recipeName = analysis.meal.recipeName;
      
      if (recipeMap.has(recipeName)) {
        // Combine servings for the same recipe
        const existing = recipeMap.get(recipeName)!;
        existing.meal.servings += analysis.meal.servings;
        
        // Update timing estimates for larger batch
        existing.estimatedPrepTime += Math.floor(analysis.estimatedPrepTime * 0.3); // 30% additional time for larger batch
        existing.estimatedCookTime += Math.floor(analysis.estimatedCookTime * 0.2); // 20% additional cook time
        
        // Take the shortest shelf life for safety
        existing.shelfLife = Math.min(existing.shelfLife, analysis.shelfLife);
        
        console.log(`Consolidated ${recipeName}: ${existing.meal.servings} total servings`);
      } else {
        // First occurrence of this recipe
        recipeMap.set(recipeName, { ...analysis });
      }
    });
    
    return Array.from(recipeMap.values());
  };

  // Get consumption schedule for each recipe
  const getRecipeConsumptionSchedule = (recipeName: string) => {
    const consumptionDays: number[] = [];
    
    Object.entries(weeklyPlan.meals).forEach(([day, meals]) => {
      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
      meals.forEach(meal => {
        if (meal.recipeName === recipeName) {
          consumptionDays.push(dayIndex);
        }
      });
    });
    
    return consumptionDays.sort((a, b) => a - b);
  };

  // Determine optimal prep day based on consumption schedule and shelf life
  const getOptimalPrepDay = (recipeName: string, shelfLife: number, weekStart: Date): Date => {
    const consumptionDays = getRecipeConsumptionSchedule(recipeName);
    
    if (consumptionDays.length === 0) {
      // Default to Sunday if no consumption days found
      const sunday = new Date(weekStart);
      sunday.setDate(weekStart.getDate() - 1);
      return sunday;
    }
    
    const firstConsumptionDay = consumptionDays[0];
    const lastConsumptionDay = consumptionDays[consumptionDays.length - 1];
    
    // Calculate how many days before first consumption we can prep
    const maxDaysBeforeConsumption = Math.min(shelfLife - 1, 2); // Max 2 days early, limited by shelf life
    
    // Optimal prep day is maxDaysBeforeConsumption before first consumption
    const optimalPrepDayIndex = Math.max(0, firstConsumptionDay - maxDaysBeforeConsumption);
    
    // Convert to actual date
    const prepDate = new Date(weekStart);
    if (optimalPrepDayIndex === 0) {
      // Sunday prep (day before Monday)
      prepDate.setDate(weekStart.getDate() - 1);
    } else {
      prepDate.setDate(weekStart.getDate() + optimalPrepDayIndex - 1);
    }
    
    console.log(`Recipe: ${recipeName}, Consumption days: ${consumptionDays}, Shelf life: ${shelfLife}d, Optimal prep: ${prepDate.toDateString()}`);
    
    return prepDate;
  };

  // Generate meaningful group names based on prep day and recipes
  const generateGroupName = (dayName: string, recipes: RecipeAnalysis[]): string => {
    const totalServings = recipes.reduce((sum, r) => sum + r.meal.servings, 0);
    const hasProteins = recipes.some(r => r.proteins.length > 0);
    const hasFreshItems = recipes.some(r => r.requiresFreshIngredients);
    const recipeCount = recipes.length;
    
    if (recipeCount === 1) {
      return `${dayName} - ${recipes[0].meal.recipeName} (${totalServings} servings)`;
    }
    
    if (hasProteins && hasFreshItems) {
      return `${dayName} - Protein & Fresh Prep (${recipeCount} recipes, ${totalServings} servings)`;
    } else if (hasProteins) {
      return `${dayName} - Protein Batch Prep (${recipeCount} recipes, ${totalServings} servings)`;
    } else if (hasFreshItems) {
      return `${dayName} - Fresh Ingredients (${recipeCount} recipes, ${totalServings} servings)`;
    } else {
      return `${dayName} - Meal Prep Session (${recipeCount} recipes, ${totalServings} servings)`;
    }
  };

  // Group recipes intelligently
  const groupRecipesForPrep = (analyses: RecipeAnalysis[]): PrepGroup[] => {
    const groups: PrepGroup[] = [];
    const weekStart = new Date(weeklyPlan.weekStartDate);
    
    // First, consolidate duplicate recipes
    const consolidatedRecipes = consolidateRecipes(analyses);
    
    console.log(`Consolidated ${analyses.length} individual recipes into ${consolidatedRecipes.length} unique recipes`);
    
    // Group recipes by optimal prep day
    const prepDayGroups = new Map<string, RecipeAnalysis[]>();
    
    consolidatedRecipes.forEach(analysis => {
      const optimalPrepDay = getOptimalPrepDay(analysis.meal.recipeName, analysis.shelfLife, weekStart);
      const prepDayKey = optimalPrepDay.toDateString();
      
      if (!prepDayGroups.has(prepDayKey)) {
        prepDayGroups.set(prepDayKey, []);
      }
      prepDayGroups.get(prepDayKey)!.push(analysis);
    });

        // Create prep groups from the organized prep day groups
    Array.from(prepDayGroups.entries()).forEach(([prepDayKey, dayRecipes], index) => {
      const prepDate = new Date(prepDayKey);
      const dayName = formatDate(prepDate).split(',')[0]; // Extract just the weekday part
      
      // Determine priority based on prep day and recipe characteristics
      let priority: 'high' | 'medium' | 'low' = 'medium';
      const hasProteins = dayRecipes.some(r => r.proteins.length > 0);
      const hasFreshItems = dayRecipes.some(r => r.requiresFreshIngredients);
      const totalServings = dayRecipes.reduce((sum, r) => sum + r.meal.servings, 0);
      
      if (hasProteins && totalServings >= 4) priority = 'high';
      else if (hasFreshItems || totalServings >= 6) priority = 'high';
      else if (totalServings >= 3) priority = 'medium';
      else priority = 'low';
      
      // Generate meaningful group name
      const groupName = generateGroupName(dayName, dayRecipes);
      
      groups.push({
        id: `prep_${prepDayKey.replace(/\s+/g, '_').toLowerCase()}`,
        name: groupName,
        recipes: dayRecipes,
        sharedIngredients: findSharedIngredients(dayRecipes),
        totalPrepTime: dayRecipes.reduce((sum, recipe) => sum + recipe.estimatedPrepTime + recipe.estimatedCookTime, 0),
        prepDate: prepDate,
        priority: priority,
        batchOpportunities: identifyBatchOpportunities(dayRecipes)
      });
    });

    return groups.filter(group => group.recipes.length > 0);
  };

  // Find shared ingredients between recipes
  const findSharedIngredients = (recipes: RecipeAnalysis[]): string[] => {
    if (recipes.length < 2) return [];
    
    const ingredientCounts = new Map<string, number>();
    
    recipes.forEach(recipe => {
      recipe.meal.recipeDetails?.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        ingredientCounts.set(normalizedIngredient, (ingredientCounts.get(normalizedIngredient) || 0) + 1);
      });
    });
    
    return Array.from(ingredientCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([ingredient, _]) => ingredient)
      .slice(0, 5); // Top 5 shared ingredients
  };

  // Identify batch cooking opportunities
  const identifyBatchOpportunities = (recipes: RecipeAnalysis[]): string[] => {
    const opportunities: string[] = [];
    
    // Group by cooking method
    const methodGroups = new Map<string, RecipeAnalysis[]>();
    recipes.forEach(recipe => {
      recipe.cookingMethods.forEach(method => {
        if (!methodGroups.has(method)) methodGroups.set(method, []);
        methodGroups.get(method)!.push(recipe);
      });
    });
    
    methodGroups.forEach((methodRecipes, method) => {
      if (methodRecipes.length >= 2) {
        opportunities.push(`Batch ${method} multiple proteins together`);
      }
    });
    
    // Group by main ingredients
    const proteinGroups = new Map<string, RecipeAnalysis[]>();
    recipes.forEach(recipe => {
      recipe.proteins.forEach(protein => {
        const proteinType = protein.toLowerCase().includes('chicken') ? 'chicken' :
                           protein.toLowerCase().includes('beef') ? 'beef' :
                           protein.toLowerCase().includes('fish') ? 'fish' : protein;
        
        if (!proteinGroups.has(proteinType)) proteinGroups.set(proteinType, []);
        proteinGroups.get(proteinType)!.push(recipe);
      });
    });
    
    proteinGroups.forEach((proteinRecipes, protein) => {
      if (proteinRecipes.length >= 2) {
        opportunities.push(`Prep ${protein} for multiple recipes`);
      }
    });
    
    // Vegetable prep opportunities
    const vegetableCount = recipes.reduce((sum, recipe) => sum + recipe.vegetables.length, 0);
    if (vegetableCount >= 3) {
      opportunities.push('Batch wash and chop all vegetables');
    }
    
    return opportunities.slice(0, 3); // Top 3 opportunities
  };

  // Generate detailed prep steps based on recipe analysis
  const generateIntelligentPrepSteps = (group: PrepGroup): string[] => {
    const steps: string[] = [];
    
    // Pre-prep organization with serving counts
    const recipeDetails = group.recipes.map(r => `${r.meal.recipeName} (${r.meal.servings} servings)`);
    steps.push(`📋 Review ${group.recipes.length} recipes: ${recipeDetails.join(', ')}`);
    
    if (group.sharedIngredients.length > 0) {
      steps.push(`🛒 Gather shared ingredients: ${group.sharedIngredients.slice(0, 3).join(', ')}`);
    }
    
    // Batch opportunities
    group.batchOpportunities.forEach(opportunity => {
      steps.push(`⚡ ${opportunity}`);
    });
    
    // Specific prep by cooking method
    const methodGroups = new Map<string, RecipeAnalysis[]>();
    group.recipes.forEach(recipe => {
      recipe.cookingMethods.forEach(method => {
        if (!methodGroups.has(method)) methodGroups.set(method, []);
        methodGroups.get(method)!.push(recipe);
      });
    });
    
    // Vegetable prep
    const allVegetables = [...new Set(group.recipes.flatMap(r => r.vegetables))];
    if (allVegetables.length > 0) {
      steps.push(`🥕 Wash and prep vegetables: ${allVegetables.slice(0, 3).join(', ')}`);
    }
    
    // Protein prep
    const allProteins = [...new Set(group.recipes.flatMap(r => r.proteins))];
    if (allProteins.length > 0) {
      steps.push(`🍗 Prepare proteins: ${allProteins.slice(0, 2).join(', ')}`);
    }
    
    // Cooking method specific steps
    if (methodGroups.has('roast')) {
      steps.push('🔥 Preheat oven for roasting items');
    }
    
    if (methodGroups.has('slow_cook')) {
      steps.push('🍲 Start slow cooker items first');
    }
    
    // Individual recipe prep
    group.recipes.forEach(recipe => {
      if (recipe.complexity === 'high') {
        steps.push(`👨‍🍳 Complete prep for ${recipe.meal.recipeName} (${recipe.estimatedPrepTime + recipe.estimatedCookTime} min)`);
      }
    });
    
    // Storage and labeling
    steps.push('📦 Portion into appropriate containers');
    steps.push('🏷️ Label with recipe name, date, and reheating instructions');
    
    return steps;
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

      // Filter out any undefined/null meals and analyze valid recipes
      const validMeals = allMeals.filter(meal => meal && meal.recipeName);
      
      if (validMeals.length === 0) {
        toast.error('No valid meals found to generate prep plan');
        return;
      }

      console.log(`Analyzing ${validMeals.length} valid meals out of ${allMeals.length} total meals`);

      // Analyze all valid recipes
      const recipeAnalyses = validMeals.map(analyzeRecipe);
      
      // Group recipes intelligently
      const prepGroups = groupRecipesForPrep(recipeAnalyses);
      
      if (prepGroups.length === 0) {
        toast.error('No meal prep needed for current plan');
        return;
      }

      // Convert groups to prep sessions
      const prepSessions: PrepSession[] = prepGroups.map(group => ({
        id: group.id,
        date: group.prepDate,
        recipes: group.recipes.map(analysis => ({
          recipeName: analysis.meal.recipeName,
          servings: analysis.meal.servings,
          prepSteps: generateIntelligentPrepSteps({ ...group, recipes: [analysis] }),
          storageInstructions: getIntelligentStorageInstructions(analysis),
          shelfLife: analysis.shelfLife,
          reheatingInstructions: getIntelligentReheatingInstructions(analysis)
        })),
        estimatedTime: group.totalPrepTime,
        priority: group.priority,
        status: 'planned',
        notes: `${group.name} - ${group.batchOpportunities.length} batch opportunities identified`
      }));

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
      toast.success(`Intelligent meal prep plan generated! ${prepSessions.length} optimized sessions created.`);
    } catch (error) {
      console.error('Error generating meal prep plan:', error);
      toast.error('Failed to generate meal prep plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced storage instructions based on recipe analysis
  const getIntelligentStorageInstructions = (analysis: RecipeAnalysis): string => {
    let instructions = 'Store in airtight containers in refrigerator.';
    
    if (analysis.vegetables.length > analysis.proteins.length) {
      instructions += ' Keep vegetables and proteins in separate containers to maintain freshness.';
    }
    
    if (analysis.cookingMethods.includes('raw')) {
      instructions += ' Consume within 1-2 days for best quality.';
    }
    
    if (analysis.grains.length > 0) {
      instructions += ' Store grains separately and combine when reheating.';
    }
    
    return instructions;
  };

  // Enhanced reheating instructions based on cooking methods
  const getIntelligentReheatingInstructions = (analysis: RecipeAnalysis): string => {
    if (analysis.cookingMethods.includes('raw')) {
      return 'Serve cold. Add dressing or toppings fresh before serving.';
    }
    
    if (analysis.cookingMethods.includes('roast')) {
      return 'Reheat in oven at 350°F for 10-12 minutes to restore crispness, or microwave for 1-2 minutes.';
    }
    
    if (analysis.cookingMethods.includes('slow_cook')) {
      return 'Microwave for 2-3 minutes, stirring halfway. Add liquid if needed.';
    }
    
    if (analysis.grains.length > 0) {
      return 'Microwave for 1-2 minutes. Add a splash of water to grains if dry.';
    }
    
    return 'Microwave for 1-2 minutes or heat in oven at 350°F for 8-10 minutes.';
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

  const formatDate = (date: Date | any) => {
    // Handle both Date objects and Firestore Timestamps
    let actualDate: Date;
    
    if (date && typeof date === 'object' && date.toDate) {
      // It's a Firestore Timestamp
      actualDate = date.toDate();
    } else if (date instanceof Date) {
      // It's already a Date object
      actualDate = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      // It's a string or number that can be converted to a Date
      actualDate = new Date(date);
    } else {
      // Fallback to current date if date is invalid
      console.warn('Invalid date passed to formatDate:', date);
      actualDate = new Date();
    }
    
    return actualDate.toLocaleDateString('en-US', {
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
              Smart Meal Prep Planner
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered meal prep optimization with intelligent grouping
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
              {isGenerating ? (
                <>
                  <Timer className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Recipes...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Smart Plan
                </>
              )}
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
            Generate an intelligent meal prep plan that analyzes your recipes, groups similar items, and optimizes prep timing
          </p>
          <Button onClick={generateMealPrepPlan} disabled={isGenerating}>
            <Plus className="h-4 w-4 mr-2" />
            {isGenerating ? 'Analyzing Recipes...' : 'Generate Smart Meal Prep Plan'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {mealPrepPlan.prepSessions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Smart Sessions</div>
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
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mealPrepPlan.prepSessions.reduce((sum, session) => 
                  sum + (session.notes?.match(/\d+/)?.[0] ? parseInt(session.notes.match(/\d+/)![0]) : 0), 0
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Batch Opportunities</div>
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
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {recipe.servings}
                          </Badge>
                          <Badge variant="outline">
                            <Timer className="h-3 w-3 mr-1" />
                            {recipe.shelfLife}d
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Storage:</strong> {recipe.storageInstructions}
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Reheating:</strong> {recipe.reheatingInstructions}
                      </div>

                      {/* Prep Steps */}
                      <div className="mt-3">
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                            View Prep Steps ({recipe.prepSteps.length})
                          </summary>
                          <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                            <ul className="space-y-1">
                              {recipe.prepSteps.map((step, stepIndex) => (
                                <li key={stepIndex} className="text-sm text-gray-600 dark:text-gray-400">
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
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