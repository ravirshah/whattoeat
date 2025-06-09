import { Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface PlannedMeal {
  id: string;
  recipeId?: string; // Reference to existing recipe
  recipeName: string;
  mealType: MealType;
  servings: number;
  notes?: string;
  carbBase?: string; // For flexible carb substitutions (e.g., "rice", "quinoa")
  modifications?: string[]; // Array of modifications like "extra protein", "no dairy"
  plannedAt: Timestamp;
  // Add full recipe details for viewing saved recipes
  recipeDetails?: {
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
    times: string;
    goalAlignment?: {
      macroFit: string;
      calorieTarget: string;
      nutritionalBenefits?: string;
    };
  };
  // New fields for enhanced features
  isFavorite?: boolean;
  rating?: number; // 1-5 star rating
  lastCooked?: Timestamp;
  timesCooked?: number;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[]; // e.g., ['quick', 'healthy', 'comfort-food']
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: Date; // Monday of the week
  weekEndDate: Date;   // Sunday of the week
  meals: {
    [key in DayOfWeek]: PlannedMeal[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean; // Whether this is the current active plan
}

export interface MacroTarget {
  calories?: number;
  protein?: number; // in grams
  carbs?: number;   // in grams
  fat?: number;     // in grams
  fiber?: number;   // in grams
}

export interface UserGoal {
  id: string;
  userId: string;
  goalType: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'custom';
  name: string;
  description?: string;
  macroTargets: {
    daily: MacroTarget;
    perMeal?: MacroTarget; // Optional per-meal targets
  };
  dietaryRestrictions: string[]; // e.g., ["low_carb", "high_protein", "vegetarian"]
  // New: Health document integration
  healthDocumentIds?: string[]; // References to health documents
  healthBasedAdjustments?: {
    avoidIngredients?: string[]; // Based on health conditions
    recommendIngredients?: string[]; // Based on deficiencies
    macroModifications?: string[]; // AI recommendations from health data
    supplementSuggestions?: string[];
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string; // e.g., "2 cups", "1 lb", "3 pieces"
  category: string; // e.g., "Produce", "Meat", "Dairy", "Pantry"
  fromRecipes: string[]; // Array of recipe names that require this ingredient
  isChecked: boolean;
  estimatedCost?: number;
  // Enhanced fields for smart grocery system
  storeSection?: string; // More specific than category
  aisle?: number;
  priority?: 'high' | 'medium' | 'low'; // For meal prep planning
  shelfLife?: number; // days until expiration
  storageInstructions?: string;
  // New intelligent features
  baseIngredient?: string; // Normalized ingredient name for matching
  unit?: string; // Standardized unit
  totalQuantityNeeded?: number; // Consolidated quantity across recipes
  nutritionalValue?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  seasonality?: 'year-round' | 'spring' | 'summer' | 'fall' | 'winter';
  organic?: boolean;
  localAvailable?: boolean;
  alternatives?: string[]; // Alternative ingredients/brands
}

export interface GroceryList {
  id: string;
  userId: string;
  weeklyPlanId: string;
  items: GroceryItem[];
  userIngredients: string[]; // Ingredients user already has
  generatedAt: Timestamp;
  isCompleted: boolean;
  // Enhanced grocery list features
  totalEstimatedCost?: number;
  estimatedShoppingTime?: number; // minutes
  preferredStore?: string;
  optimizedForStore?: boolean;
  sustainabilityScore?: number; // 0-100 score based on local/organic choices
  dietaryFilters?: string[]; // Applied dietary restrictions
  generationMethod?: 'basic' | 'smart' | 'ai-optimized';
  lastOptimized?: Timestamp;
}

export interface MealPlanSettings {
  userId: string;
  defaultMealTypes: MealType[]; // Which meal types to show by default
  carbBaseOptions: string[]; // User's preferred carb base options
  defaultServings: number;
  autoGenerateGroceryList: boolean;
  weekStartsOn: DayOfWeek; // Customizable week start (default Monday)
}

// For UI state management
export interface PlannerViewState {
  selectedDay: DayOfWeek | null;
  selectedMeal: PlannedMeal | null;
  isAddingMeal: boolean;
  isEditingGoals: boolean;
  showGroceryList: boolean;
  draggedMeal: PlannedMeal | null;
  modalMode?: 'add' | 'edit' | 'view'; // Track the mode of the recipe selector modal
  // New UI states for enhanced features
  showNutritionTracker: boolean;
  showRecipeHistory: boolean;
  showFavorites: boolean;
  showMealPrepPlanner: boolean;
  showStoreLayoutEditor: boolean;
  selectedNutritionDate?: Date;
  showNutritionDashboard: boolean;
}

// For recipe selection modal
export interface RecipeForPlanning {
  id: string;
  name: string;
  ingredients: string[];
  servings: string;
  cookTime: string;
  difficulty?: string;
  tags?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

// New interface for recipe history
export interface RecipeHistory {
  id: string;
  userId: string;
  recipeId: string;
  recipeName: string;
  cookedAt: Timestamp;
  rating?: number;
  notes?: string;
  modifications?: string[];
  servings: number;
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

// New interface for favorite recipes
export interface FavoriteRecipe {
  id: string;
  userId: string;
  recipeName: string;
  recipeDetails: {
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
    times: string;
  };
  tags?: string[];
  rating: number;
  addedAt: Timestamp;
  lastCooked?: Timestamp;
  timesCooked: number;
  averageCookTime?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

// New interface for store layout customization
export interface StoreLayout {
  id: string;
  userId: string;
  storeName: string;
  isDefault: boolean;
  sections: StoreSection[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StoreSection {
  id: string;
  name: string;
  aisle?: number;
  order: number; // for custom ordering
  categories: string[]; // which categories belong to this section
}

// New interface for nutrition tracking
export interface NutritionEntry {
  id: string;
  userId: string;
  date: Date;
  meals: {
    breakfast: MacroTarget;
    lunch: MacroTarget;
    dinner: MacroTarget;
    snacks: MacroTarget;
  };
  dailyTotals: MacroTarget;
  goalTargets: MacroTarget;
  waterIntake?: number; // in oz
  notes?: string;
}

// New interface for meal prep planning
export interface MealPrepPlan {
  id: string;
  userId: string;
  weeklyPlanId: string;
  prepSessions: PrepSession[];
  totalPrepTime: number; // estimated minutes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PrepSession {
  id: string;
  date: Date;
  recipes: PrepRecipe[];
  estimatedTime: number; // minutes
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'completed';
  actualTime?: number; // actual time taken
  notes?: string;
}

export interface PrepRecipe {
  recipeName: string;
  servings: number;
  prepSteps: string[];
  storageInstructions: string;
  shelfLife: number; // days
  reheatingInstructions?: string;
}

// New interface for health documents
export interface HealthDocument {
  id: string;
  userId: string;
  fileName: string;
  fileType: 'blood_panel' | 'inbody_scan' | 'dexascan' | 'medical_report' | 'other';
  uploadedAt: Timestamp;
  parsedData: {
    // Blood panel data
    cholesterolTotal?: number;
    cholesterolLDL?: number;
    cholesterolHDL?: number;
    triglycerides?: number;
    glucose?: number;
    hemoglobinA1c?: number;
    vitaminD?: number;
    vitaminB12?: number;
    iron?: number;
    ferritin?: number;
    tsh?: number;
    creatinine?: number;
    // InBody scan data
    bodyFatPercentage?: number;
    muscleMass?: number;
    bodyWeight?: number;
    BMI?: number;
    visceralFat?: number;
    basalMetabolicRate?: number;
    // General health indicators
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    restingHeartRate?: number;
    // Dietary recommendations from documents
    dietaryRecommendations?: string[];
    healthConcerns?: string[];
    rawExtractedText?: string;
    abnormalValues?: string[];
  };
  aiSummary?: string; // AI-generated summary of health insights
  isActive: boolean; // Whether to use this document for meal planning
  // Security enhancements
  fileHash?: string; // SHA256 hash for file integrity verification
  originalFileName?: string; // Original filename before sanitization
}

// Enhanced user preferences to include health documents
export interface UserPreferences {
  ingredients: string[];
  equipment: string[];
  staples: string[];
  dietaryPrefs: string[];
  cuisinePrefs: string[];
  cookTimePreference?: string;
  difficultyPreference?: string;
  // New: Health document management
  healthDocuments?: HealthDocument[];
  healthDataConsent: boolean; // User consent for health data usage
  lastHealthDataSync?: Timestamp;
  // Onboarding tracking
  hasSeenOnboarding?: boolean;
}

// New interface for ingredient intelligence
export interface IngredientIntelligence {
  baseIngredient: string;
  aliases: string[]; // Common variations and names
  category: string;
  subCategory?: string;
  standardUnit: string;
  conversionRates: Record<string, number>; // unit conversions
  averageCost: number; // per standard unit
  seasonality: {
    peak: string[]; // months when best/cheapest
    available: string[]; // months when available
  };
  shelfLife: number; // days
  storageType: 'pantry' | 'fridge' | 'freezer' | 'room-temp';
  nutritionalProfile: {
    calories: number; // per 100g
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  commonPreparations: string[]; // diced, chopped, etc.
  substitutes: string[]; // alternative ingredients
  pairings: string[]; // commonly used with
}

// Enhanced store layout with more intelligence
export interface SmartStoreLayout {
  id: string;
  userId: string;
  storeName: string;
  storeChain?: string;
  location?: string;
  isDefault: boolean;
  sections: SmartStoreSection[];
  averageShoppingTime: number; // minutes
  efficiency: number; // 0-100 score
  lastOptimized: Timestamp;
  crowdedTimes?: string[]; // peak hours to avoid
  bestTimes?: string[]; // optimal shopping times
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SmartStoreSection {
  id: string;
  name: string;
  displayName: string; // User-friendly name
  aisle?: number;
  order: number; // for optimal shopping flow
  categories: string[]; // which grocery categories belong here
  estimatedTime?: number; // average time spent in section (minutes)
  tipForShopping?: string; // helpful shopping tip
  alternativeNames?: string[]; // how different stores might name this section
}

// Shopping optimization features
export interface ShoppingOptimization {
  routeOptimization: boolean; // optimize path through store
  timeOptimization: boolean; // suggest best shopping times
  budgetOptimization: boolean; // suggest cheaper alternatives
  nutritionOptimization: boolean; // prefer healthier options
  sustainabilityOptimization: boolean; // prefer local/organic
  bulkBuyingOptimization: boolean; // suggest bulk purchases
}

// Shopping list generation preferences
export interface GroceryPreferences {
  preferredStores: string[];
  dietaryRestrictions: string[];
  budgetLimit?: number;
  preferOrganic: boolean;
  preferLocal: boolean;
  avoidBrands?: string[];
  preferredBrands?: string[];
  shoppingStyle: 'quick' | 'thorough' | 'budget-conscious' | 'health-focused';
  consolidationLevel: 'minimal' | 'moderate' | 'aggressive'; // how much to consolidate similar items
}

// Analytics for grocery shopping
export interface GroceryAnalytics {
  weeklySpend: number[];
  categoryBreakdown: Record<string, number>;
  shoppingFrequency: number; // times per week
  averageShoppingTime: number; // minutes
  wasteEstimate: number; // percentage of food wasted
  sustainabilityMetrics: {
    organicPercentage: number;
    localPercentage: number;
    packagingScore: number;
  };
  efficiencyScore: number; // 0-100
  budgetAdherence: number; // percentage of budget used
} 