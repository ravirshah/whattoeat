'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { getUserPreferences, updateUserPreferences } from '@/lib/db';
import { 
  Button, 
  Badge
} from '@/components/ui';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Calendar,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  ChefHat,
  Target,
  Clock,
  Heart,
  Check,
  ArrowDown,
  Utensils,
  Brain,
  Zap,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const OnboardingFlow = ({ isOpen, onClose, onComplete }: OnboardingFlowProps) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (currentUser) {
        try {
          const prefs = await getUserPreferences(currentUser.uid);
          setHasSeenOnboarding(prefs?.hasSeenOnboarding || false);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }
    };

    checkOnboardingStatus();
  }, [currentUser]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (currentUser) {
      try {
        // Get current preferences
        const currentPrefs = await getUserPreferences(currentUser.uid);
        
        // Update to mark onboarding as seen
        await updateUserPreferences(currentUser.uid, {
          ingredients: currentPrefs?.ingredients || [],
          equipment: currentPrefs?.equipment || [],
          staples: currentPrefs?.staples || [],
          dietaryPrefs: currentPrefs?.dietaryPrefs || [],
          cuisinePrefs: currentPrefs?.cuisinePrefs || [],
          cookTimePreference: currentPrefs?.cookTimePreference,
          difficultyPreference: currentPrefs?.difficultyPreference,
          healthDataConsent: currentPrefs?.healthDataConsent || false,
          lastHealthDataSync: currentPrefs?.lastHealthDataSync,
          hasSeenOnboarding: true
        });

        toast.success('Welcome to WhatToEat!', {
          description: 'You\'re all set to start planning amazing meals.'
        });
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }

    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return {
          title: "Plan Your Perfect Week",
          subtitle: "Smart meal planning made effortless",
          content: (
            <div className="space-y-6">
              {/* Hero Animation */}
              <div className="relative flex justify-center">
                <div className="relative">
                  {/* Main Calendar Visual */}
                  <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-lg">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-600 dark:text-gray-300 p-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div key={i} className="aspect-square rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 relative">
                          {i === 1 && (
                            <div className="absolute inset-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-md flex items-center justify-center">
                              <Utensils className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                          {i === 3 && (
                            <div className="absolute inset-1 bg-blue-100 dark:bg-blue-900/50 rounded-md flex items-center justify-center">
                              <ChefHat className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          {i === 5 && (
                            <div className="absolute inset-1 bg-purple-100 dark:bg-purple-900/50 rounded-md flex items-center justify-center">
                              <Heart className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Floating Action Bubbles */}
                  <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-2 shadow-lg animate-pulse">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -left-2 bg-blue-500 rounded-full p-2 shadow-lg animate-bounce">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium">Weekly View</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Plan 7 days at once</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                    <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium">AI Powered</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Smart suggestions</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                    <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium">Goal Aligned</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Nutrition focused</p>
                </div>
              </div>
            </div>
          )
        };

      case 2:
        return {
          title: "Three Ways to Add Meals",
          subtitle: "Choose what works best for you",
          content: (
            <div className="space-y-6">
              {/* Tab Showcase */}
              <div className="space-y-4">
                {/* Generated Recipes Tab */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-emerald-500 rounded-lg p-2">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Generated Recipes</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">AI creates personalized recipes</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">High Protein</Badge>
                      <Badge variant="outline" className="text-xs">30 min</Badge>
                      <Badge variant="outline" className="text-xs">Medium</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">Honey Garlic Chicken Bowl</p>
                  </div>
                </div>

                {/* Favorites Tab */}
                <div className="bg-gradient-to-r from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/30 rounded-xl p-4 border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-pink-500 rounded-lg p-2">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-pink-900 dark:text-pink-100">Saved Favorites</h4>
                      <p className="text-sm text-pink-700 dark:text-pink-300">Your go-to recipes</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Mom's Spaghetti</p>
                      <div className="flex items-center gap-1">
                        <div className="text-yellow-400">★★★★★</div>
                        <span className="text-xs text-gray-500">12x cooked</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input Tab */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-500 rounded-lg p-2">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Chat Input</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Natural language parsing</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <div className="text-sm italic text-gray-600 dark:text-gray-400 mb-2">
                      "9 oz 2% milk + 2 scoops protein"
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-blue-600 dark:text-blue-400">Auto-parsed nutrition</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <ArrowDown className="h-5 w-5 mx-auto text-gray-400 animate-bounce" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Mix and match to build your perfect week
                </p>
              </div>
            </div>
          )
        };

      case 3:
        return {
          title: "Beyond Meal Planning",
          subtitle: "Everything you need for healthy eating",
          content: (
            <div className="space-y-6">
              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Smart Grocery Lists */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 space-y-3">
                  <div className="bg-orange-500 rounded-lg p-2 w-10 h-10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Smart Grocery Lists</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Auto-organized by store layout</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded">Produce</span>
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded">Dairy</span>
                      <div className="h-3 w-3 border border-gray-300 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Nutrition Tracking */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 space-y-3">
                  <div className="bg-green-500 rounded-lg p-2 w-10 h-10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Nutrition Analytics</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">Track macros & goals</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Protein</span>
                      <span className="text-green-600 dark:text-green-400">85%</span>
                    </div>
                    <div className="bg-green-200 dark:bg-green-900 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full w-4/5"></div>
                    </div>
                  </div>
                </div>

                {/* Meal Prep Planning */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="bg-purple-500 rounded-lg p-2 w-10 h-10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Meal Prep Planner</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Optimize prep sessions</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
                      Sunday: 2.5hrs
                    </div>
                    <div className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
                      Wednesday: 1hr
                    </div>
                  </div>
                </div>

                {/* Goal Setting */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="bg-blue-500 rounded-lg p-2 w-10 h-10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Smart Goals</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">AI-powered recommendations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Muscle Gain</Badge>
                    <Badge variant="outline" className="text-xs">2800 cal</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-4 text-white text-center">
                <h5 className="font-semibold mb-2">Ready to transform your meal planning?</h5>
                <p className="text-sm opacity-90">
                  Start creating your perfect weekly meal plan now!
                </p>
              </div>
            </div>
          )
        };

      default:
        return { title: '', subtitle: '', content: null };
    }
  };

  const stepData = getStepContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-emerald-600" />
              <span className="font-semibold text-emerald-600">WhatToEat</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-8 rounded-full transition-all duration-300 ${
                    step <= currentStep 
                      ? 'bg-emerald-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep} of 3
            </p>
          </div>

          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            {stepData.title}
          </DialogTitle>
          
          <p className="text-gray-600 dark:text-gray-400">
            {stepData.subtitle}
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="py-6">
          {stepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Skip tour
            </Button>
          </div>

          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
          >
            {currentStep === 3 ? (
              <>
                Get Started
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow; 