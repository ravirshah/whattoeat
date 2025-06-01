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
}

export interface GroceryList {
  id: string;
  userId: string;
  weeklyPlanId: string;
  items: GroceryItem[];
  userIngredients: string[]; // Ingredients user already has
  generatedAt: Timestamp;
  isCompleted: boolean;
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