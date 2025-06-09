'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
// Import real components - will implement these next
import PlannerView from '@/components/weekly-planner/PlannerView';
import GoalSetter from '@/components/weekly-planner/GoalSetter';
import GroceryList from '@/components/weekly-planner/GroceryList';
import Favorites from '@/components/weekly-planner/Favorites';
import NutritionTracker from '@/components/weekly-planner/NutritionTracker';
import MealPrepPlanner from '@/components/weekly-planner/MealPrepPlanner';
import NutritionDashboard from '@/components/weekly-planner/NutritionDashboard';
import OnboardingFlow from '@/components/weekly-planner/OnboardingFlow';
import { Button } from '@/components/ui';
import { 
  Calendar, 
  Target, 
  ShoppingCart, 
  Plus,
  Settings,
  Download,
  User,
  X,
  Heart,
  BarChart3,
  ChefHat,
  Activity
} from 'lucide-react';
import { 
  getCurrentWeeklyPlan, 
  createWeeklyPlan, 
  getActiveUserGoal,
  getCurrentWeekDates,
  getWeekStartAndEnd,
  getWeeklyPlan,
  updateWeeklyPlan,
  getWeeklyPlanByDateRange
} from '@/lib/weekly-planner-db';
import { getUserPreferences } from '@/lib/db';
import { WeeklyPlan, UserGoal, DayOfWeek, PlannerViewState } from '@/types/weekly-planner';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// Helper function to clean undefined values from objects before saving to Firestore
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

export default function WeeklyMealPlannerPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  // State management
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [activeGoal, setActiveGoal] = useState<UserGoal | null>(null);
  const [plannerState, setPlannerState] = useState<PlannerViewState>({
    selectedDay: null,
    selectedMeal: null,
    isAddingMeal: false,
    isEditingGoals: false,
    showGroceryList: false,
    draggedMeal: null,
    // New UI states for enhanced features
    showNutritionTracker: false,
    showRecipeHistory: false,
    showFavorites: false,
    showMealPrepPlanner: false,
    showStoreLayoutEditor: false,
    selectedNutritionDate: undefined,
    showNutritionDashboard: false
  });
  const [isLoading, setIsLoading] = useState(true);
  // Keep test user option for development, but don't default to it
  const [useTestUser, setUseTestUser] = useState(false);
  // State for weekly navigation
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getCurrentWeekDates().start);
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);

  // Test user for development purposes
  const testUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  // Get effective user (real user or test user)
  const effectiveUser = useTestUser ? testUser : currentUser;

  // Initialize page data
  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading
    
    if (!currentUser && !useTestUser) {
      // Redirect to signin if no user and not using test mode
      router.push('/signin');
      return;
    }

    if (effectiveUser) {
      loadInitialData();
    }
  }, [currentUser, loading, router, useTestUser, effectiveUser]);

  const loadInitialData = async () => {
    try {
      console.log("Loading initial data for user:", effectiveUser?.uid);
      
      // Load the current week initially using the robust weekly plan system
      const currentWeekDates = getCurrentWeekDates();
      setCurrentWeekStart(currentWeekDates.start);
      await loadWeeklyPlan(currentWeekDates.start);
      
      // Load active goal (only once during initial load)
      if (!activeGoal && !useTestUser) {
        console.log("Loading active goal...");
        const goal = await getActiveUserGoal(effectiveUser!.uid);
        if (goal) {
          console.log("Found active goal:", goal.id, goal.name);
          setActiveGoal(goal);
        } else {
          console.log("No active goal found");
        }
      }

      // Check if user should see onboarding (only for real users, not test users)
      if (!useTestUser) {
        try {
          const prefs = await getUserPreferences(effectiveUser!.uid);
          const hasSeenOnboarding = prefs?.hasSeenOnboarding || false;
          if (!hasSeenOnboarding) {
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          // If we can't check, don't show onboarding to avoid interrupting the user
        }
      }
      
      console.log("Initial data loaded successfully");
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      
      // More specific error messaging
      let errorMessage = 'Failed to load meal planner data';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your authentication.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = `Error loading data: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleStateUpdate = (updates: Partial<PlannerViewState>) => {
    setPlannerState(prev => ({ ...prev, ...updates }));
  };

  const handlePlanUpdate = async (updatedPlan: WeeklyPlan) => {
    try {
      console.log("Updating plan in database:", updatedPlan.id);
      
      // Update local state immediately for responsive UI
      setCurrentPlan(updatedPlan);
      
      // Save to database if not using test user
      if (!useTestUser) {
        await updateWeeklyPlan(updatedPlan.id, {
          meals: updatedPlan.meals,
          updatedAt: Timestamp.now()
        });
        console.log("Plan successfully saved to database");
      }
    } catch (error: any) {
      console.error("Error saving plan update:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  };

  const handleGoalUpdate = (updatedGoal: UserGoal | null) => {
    setActiveGoal(updatedGoal);
  };

  const handleWeekNavigation = async (direction: 'previous' | 'next') => {
    try {
      // CRITICAL: Ensure current plan is saved before navigating
      if (currentPlan && !useTestUser) {
        console.log("Ensuring current plan is saved before navigation");
        
        // Clean the meals data to remove undefined values
        const cleanedMeals = cleanUndefinedValues(currentPlan.meals);
        
        // Only update if we have valid data
        if (cleanedMeals && Object.keys(cleanedMeals).length > 0) {
          await updateWeeklyPlan(currentPlan.id, {
            meals: cleanedMeals,
            updatedAt: Timestamp.now()
          });
        }
      }
      
      const weekOffset = direction === 'next' ? 7 : -7;
      const newWeekStart = new Date(currentWeekStart);
      newWeekStart.setDate(newWeekStart.getDate() + weekOffset);
      
      console.log(`Navigating ${direction} from ${currentWeekStart.toLocaleDateString()} to ${newWeekStart.toLocaleDateString()}`);
      
      setCurrentWeekStart(newWeekStart);
      
      // Close grocery list when navigating to avoid confusion
      if (plannerState.showGroceryList) {
        handleStateUpdate({ showGroceryList: false });
      }
      
      await loadWeeklyPlan(newWeekStart);
    } catch (error: any) {
      console.error("Error during week navigation:", error);
      
      // More specific error handling
      let errorMessage = "Failed to navigate weeks. Please try again.";
      if (error?.message?.includes("permission")) {
        errorMessage = "Permission error. Please refresh the page and try again.";
      } else if (error?.message?.includes("undefined")) {
        errorMessage = "Data error during navigation. Refreshing page...";
        setTimeout(() => window.location.reload(), 2000);
      }
      
      toast.error(errorMessage);
    }
  };

  const loadWeeklyPlan = async (weekStartDate: Date) => {
    try {
      setIsLoading(true);
      console.log("Loading weekly plan for week starting:", weekStartDate.toLocaleDateString());
      
      if (useTestUser) {
        // For test user, create mock data without database operations
        console.log("Using test user - creating mock data");
        
        const { start, end } = getWeekStartAndEnd(weekStartDate);
        const mockPlan: WeeklyPlan = {
          id: `test-plan-${start.getTime()}`,
          userId: effectiveUser!.uid,
          weekStartDate: start,
          weekEndDate: end,
          meals: {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isActive: true
        };
        
        setCurrentPlan(mockPlan);
        console.log("Mock data loaded successfully");
        toast.success(`Loaded week of ${start.toLocaleDateString()}`);
        return;
      }
      
      // Real user data loading - ROBUST PERSISTENCE LOGIC
      const { start, end } = getWeekStartAndEnd(weekStartDate);
      const isCurrentWeek = start.getTime() === getCurrentWeekDates().start.getTime();
      
      console.log("Week details:", {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
        isCurrentWeek
      });
      
      // STEP 1: Always check for existing plan for this specific week first
      let plan = await getWeeklyPlanByDateRange(effectiveUser!.uid, weekStartDate);
      
      if (plan) {
        console.log("Found existing plan for this week:", plan.id, "with", Object.values(plan.meals).flat().length, "meals");
        
        // If this is the current week and the plan isn't marked as active, activate it
        if (isCurrentWeek && !plan.isActive) {
          console.log("Activating plan for current week");
          await updateWeeklyPlan(plan.id, { isActive: true });
          plan.isActive = true;
        }
        
        setCurrentPlan(plan);
        toast.success(`Loaded week of ${start.toLocaleDateString()} (${Object.values(plan.meals).flat().length} meals)`);
        return;
      }
      
      // STEP 2: No existing plan found - create a new one
      console.log("No existing plan found for this week, creating new one");
      
      // If this is current week, deactivate any other active plans first
      if (isCurrentWeek) {
        const currentActivePlan = await getCurrentWeeklyPlan(effectiveUser!.uid);
        if (currentActivePlan && new Date(currentActivePlan.weekStartDate).getTime() !== start.getTime()) {
          console.log("Deactivating old current week plan:", currentActivePlan.id);
          await updateWeeklyPlan(currentActivePlan.id, { isActive: false });
        }
      }
      
      const newPlanData = {
        userId: effectiveUser!.uid,
        weekStartDate: start,
        weekEndDate: end,
        meals: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: isCurrentWeek // Only mark as active if this is current week
      };
      
      const planId = await createWeeklyPlan(newPlanData);
      plan = { id: planId, ...newPlanData };
      
      console.log("Created new plan:", planId, "for week", start.toLocaleDateString());
      setCurrentPlan(plan);
      toast.success(`Created new plan for week of ${start.toLocaleDateString()}`);
      
    } catch (error: any) {
      console.error("Error loading weekly plan:", error);
      toast.error(`Failed to load week: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTestUser = () => {
    setUseTestUser(true);
    toast.info("Using test user for development");
  };

  const handleSignIn = () => {
    router.push('/signin');
  };

  if (loading || isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your meal planner...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show authentication options if no user is authenticated
  if (!effectiveUser) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <Calendar className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Weekly Meal Planner
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Plan your meals, track your goals, and generate grocery lists. 
                Sign in to access your personal meal planner or try the demo.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={handleSignIn}
                  className="w-full"
                  size="lg"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In to Your Account
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400">
                      Or try the demo
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleUseTestUser}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Demo Weekly Planner
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                Demo mode uses test data and won't save your changes
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Weekly Meal Planner
                {useTestUser && (
                  <span className="ml-2 text-sm font-normal text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-1 rounded">
                    Demo Mode
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Plan your meals, track your goals, and generate grocery lists
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Core Features */}
              <Button
                variant={plannerState.isEditingGoals ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ isEditingGoals: !plannerState.isEditingGoals })}
              >
                <Target className="h-4 w-4 mr-2" />
                {activeGoal ? 'Edit Goals' : 'Set Goals'}
              </Button>
              
              <Button
                variant={plannerState.showGroceryList ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ showGroceryList: !plannerState.showGroceryList })}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Grocery List
              </Button>

              {/* Phase 1 Features */}
              <Button
                variant={plannerState.showFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ showFavorites: !plannerState.showFavorites })}
              >
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </Button>

              <Button
                variant={plannerState.showNutritionTracker ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ showNutritionTracker: !plannerState.showNutritionTracker })}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Weekly Nutrition Info
              </Button>

              <Button
                variant={plannerState.showNutritionDashboard ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ showNutritionDashboard: !plannerState.showNutritionDashboard })}
              >
                <Activity className="h-4 w-4 mr-2" />
                Analytics Dashboard
              </Button>

              <Button
                variant={plannerState.showMealPrepPlanner ? "default" : "outline"}
                size="sm"
                onClick={() => handleStateUpdate({ showMealPrepPlanner: !plannerState.showMealPrepPlanner })}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Meal Prep
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement export functionality
                  toast.info('Export feature coming soon!');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {/* Testing/Demo Button for Onboarding */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOnboarding(true)}
                className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Tour
              </Button>
            </div>
          </div>
          
          {/* Active Goal Display */}
          {activeGoal && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-emerald-900 dark:text-emerald-100">
                    Active Goal: {activeGoal.name}
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {activeGoal.description || `${activeGoal.goalType.replace('_', ' ')} goal`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStateUpdate({ isEditingGoals: true })}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Goal Setter Modal/Panel */}
        {plannerState.isEditingGoals && (
          <div className="mb-6">
            <GoalSetter
              currentGoal={activeGoal}
              userId={effectiveUser.uid}
              onGoalUpdate={handleGoalUpdate}
              onClose={() => handleStateUpdate({ isEditingGoals: false })}
            />
          </div>
        )}

        {/* Grocery List Panel */}
        {plannerState.showGroceryList && currentPlan && (
          <div className="mb-6">
            <GroceryList
              weeklyPlan={currentPlan}
              userId={effectiveUser.uid}
              onClose={() => handleStateUpdate({ showGroceryList: false })}
            />
          </div>
        )}



        {/* Favorites Panel */}
        {plannerState.showFavorites && (
          <div className="mb-6">
            <Favorites
              userId={effectiveUser.uid}
              onClose={() => handleStateUpdate({ showFavorites: false })}
              onSelectRecipe={(recipe) => {
                // TODO: Implement adding favorite recipe to current plan
                toast.info(`Adding "${recipe.recipeName}" to your meal plan`);
                handleStateUpdate({ showFavorites: false });
              }}
            />
          </div>
        )}

        {/* Meal Prep Planner Panel */}
        {plannerState.showMealPrepPlanner && currentPlan && (
          <div className="mb-6">
            <MealPrepPlanner
              userId={effectiveUser.uid}
              weeklyPlan={currentPlan}
              onClose={() => handleStateUpdate({ showMealPrepPlanner: false })}
            />
          </div>
        )}

        {/* Nutrition Tracker Panel */}
        {plannerState.showNutritionTracker && currentPlan && (
          <div className="mb-6">
            <NutritionTracker
              userId={effectiveUser.uid}
              activeGoal={activeGoal}
              weeklyPlan={currentPlan}
              onClose={() => handleStateUpdate({ showNutritionTracker: false })}
            />
          </div>
        )}

        {/* Nutrition Dashboard Modal */}
        {plannerState.showNutritionDashboard && currentPlan && (
          <NutritionDashboard
            userId={effectiveUser.uid}
            activeGoal={activeGoal}
            weeklyPlan={currentPlan}
            onClose={() => handleStateUpdate({ showNutritionDashboard: false })}
          />
        )}

        {/* Main Planner View */}
        {currentPlan && (
          <PlannerView
            weeklyPlan={currentPlan}
            activeGoal={activeGoal}
            plannerState={plannerState}
            onStateUpdate={handleStateUpdate}
            onPlanUpdate={handlePlanUpdate}
            onNavigateWeek={handleWeekNavigation}
          />
        )}

        {/* Empty State */}
        {!currentPlan && !isLoading && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No meal plan found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first weekly meal plan to get started
            </p>
            <Button onClick={loadInitialData}>
              <Plus className="h-4 w-4 mr-2" />
              Create Meal Plan
            </Button>
          </div>
        )}

        {/* Onboarding Flow */}
        <OnboardingFlow
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={() => {
            setShowOnboarding(false);
            toast.success('Welcome to WhatToEat! Start planning your perfect week.');
          }}
        />
      </div>
    </MainLayout>
  );
} 