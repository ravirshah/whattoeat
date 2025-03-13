'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { updateUserPreferences } from '@/lib/db';
import MainLayout from '@/components/layout/MainLayout';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button, 
  Progress,
  Badge,
  Separator,
  Alert,
  AlertDescription
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Info,
  RefreshCw,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';

// Common preset options
const COMMON_INGREDIENTS = [
  'Chicken', 'Rice', 'Pasta', 'Potatoes', 'Onions', 'Garlic', 
  'Tomatoes', 'Eggs', 'Beef', 'Pork', 'Carrots', 'Bell Peppers', 
  'Broccoli', 'Spinach', 'Mushrooms', 'Beans', 'Cheese', 'Milk', 
  'Yogurt', 'Apples', 'Bananas', 'Lemon', 'Bread'
];

const COMMON_EQUIPMENT = [
  'Oven', 'Stovetop', 'Microwave', 'Blender', 'Food Processor', 
  'Slow Cooker', 'Air Fryer', 'Pressure Cooker', 'Grill', 
  'Toaster', 'Hand Mixer', 'Stand Mixer', 'Dutch Oven', 
  'Cast Iron Pan', 'Non-Stick Pan', 'Baking Sheet'
];

const COMMON_STAPLES = [
  'Salt', 'Pepper', 'Olive Oil', 'Vegetable Oil', 'Flour', 
  'Sugar', 'Brown Sugar', 'Butter', 'Soy Sauce', 'Vinegar', 
  'Rice Vinegar', 'Honey', 'Maple Syrup', 'Pasta Sauce', 
  'Canned Tomatoes', 'Canned Beans', 'Broth', 'Spices', 
  'Hot Sauce', 'Mustard', 'Ketchup', 'Mayonnaise'
];

const COMMON_DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Low-Carb', 'Keto', 'Paleo', 'Nut-Free', 'Low-Sugar',
  'Low-Sodium', 'Pescatarian', 'High-Protein', 'Halal',
  'Kosher', 'No Pork', 'No Shellfish', 'No Red Meat'
];

export default function OnboardingPage() {
  return (
    <AuthWrapper>
      <MainLayout showFooter={false}>
        <Onboarding />
      </MainLayout>
    </AuthWrapper>
  );
}

function Onboarding() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [staples, setStaples] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Toggle selection of an item
  const toggleItem = (item: string, category: 'ingredients' | 'equipment' | 'staples' | 'dietary') => {
    switch (category) {
      case 'ingredients':
        setIngredients(prev => 
          prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
        );
        break;
      case 'equipment':
        setEquipment(prev => 
          prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
        );
        break;
      case 'staples':
        setStaples(prev => 
          prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
        );
        break;
      case 'dietary':
        setDietaryPrefs(prev => 
          prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
        );
        break;
    }
  };
  
  // Navigation functions
  const nextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Complete onboarding and save preferences
  const completeOnboarding = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      // Save preferences to user profile
      await updateUserPreferences(currentUser.uid, {
        ingredients,
        equipment,
        staples,
        dietaryPrefs
      });
      
      toast.success('Preferences saved', {
        description: 'Your cooking profile has been set up.'
      });
      
      // Redirect to generate page
      router.push('/generate');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      toast.error('Failed to save preferences', {
        description: 'Please try again.'
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  // Skip onboarding
  const skipOnboarding = () => {
    toast.info('Onboarding skipped', {
      description: 'You can set up your preferences later in your profile.'
    });
    router.push('/generate');
  };
  
  // Get step title and description
  const getStepInfo = () => {
    switch (step) {
      case 1:
        return {
          title: "Welcome to WhatToEat!",
          description: "Let's set up your cooking profile for personalized recipe recommendations. This will only take a minute.",
          icon: <ChefHat className="h-8 w-8 text-emerald-600" />
        };
      case 2:
        return {
          title: "Select Your Common Ingredients",
          description: "What ingredients do you usually have available? Select all that apply.",
          icon: <ShoppingBag className="h-8 w-8 text-emerald-600" />
        };
      case 3:
        return {
          title: "Select Your Kitchen Equipment",
          description: "What cooking equipment do you have? Select all that apply.",
          icon: <UtensilsCrossed className="h-8 w-8 text-emerald-600" />
        };
      case 4:
        return {
          title: "Select Your Pantry Staples",
          description: "What staple items do you usually keep in your pantry? Select all that apply.",
          icon: <ShoppingBag className="h-8 w-8 text-emerald-600" />
        };
      case 5:
        return {
          title: "Select Your Dietary Preferences",
          description: "Do you have any dietary preferences or restrictions? Select all that apply.",
          icon: <AlertTriangle className="h-8 w-8 text-emerald-600" />
        };
      default:
        return {
          title: "",
          description: "",
          icon: null
        };
    }
  };
  
  const stepInfo = getStepInfo();
  
  // Render selection options for the current step
  const renderSelectionOptions = () => {
    let options: string[] = [];
    let category: 'ingredients' | 'equipment' | 'staples' | 'dietary' = 'ingredients';
    let selectedItems: string[] = [];
    let bgColor = "bg-emerald-50";
    let textColor = "text-emerald-700";
    let darkBgColor = "dark:bg-emerald-900/20";
    let darkTextColor = "dark:text-emerald-300";
    
    switch (step) {
      case 2:
        options = COMMON_INGREDIENTS;
        category = 'ingredients';
        selectedItems = ingredients;
        break;
      case 3:
        options = COMMON_EQUIPMENT;
        category = 'equipment';
        selectedItems = equipment;
        bgColor = "bg-blue-50";
        textColor = "text-blue-700";
        darkBgColor = "dark:bg-blue-900/20";
        darkTextColor = "dark:text-blue-300";
        break;
      case 4:
        options = COMMON_STAPLES;
        category = 'staples';
        selectedItems = staples;
        bgColor = "bg-amber-50";
        textColor = "text-amber-700";
        darkBgColor = "dark:bg-amber-900/20";
        darkTextColor = "dark:text-amber-300";
        break;
      case 5:
        options = COMMON_DIETARY_PREFS;
        category = 'dietary';
        selectedItems = dietaryPrefs;
        bgColor = "bg-purple-50";
        textColor = "text-purple-700";
        darkBgColor = "dark:bg-purple-900/20";
        darkTextColor = "dark:text-purple-300";
        break;
      default:
        return null;
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 my-4">
        {options.map((item) => (
          <button
            key={item}
            onClick={() => toggleItem(item, category)}
            className={`flex items-center justify-between px-3 py-2 rounded-md border ${
              selectedItems.includes(item)
                ? `${bgColor} ${textColor} ${darkBgColor} ${darkTextColor} border-transparent`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            } hover:shadow-sm transition-all`}
          >
            <span>{item}</span>
            {selectedItems.includes(item) && (
              <Check className="h-4 w-4 ml-2 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Card className="border-2 border-emerald-100 dark:border-emerald-900">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {stepInfo.icon}
            </div>
            <CardTitle className="text-2xl">{stepInfo.title}</CardTitle>
            <CardDescription className="text-base">{stepInfo.description}</CardDescription>
            
            <div className="mt-4">
              <Progress value={step * 20} className="h-2" />
              <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
                Step {step} of 5
              </p>
            </div>
          </CardHeader>
          
          <CardContent>
            {step === 1 ? (
              <div className="space-y-6 py-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Setting up your preferences helps us generate recipes tailored to your kitchen setup and dietary needs.
                  </AlertDescription>
                </Alert>
                
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm">Select your common ingredients</p>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm">Choose your kitchen equipment</p>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm">Set your pantry staples</p>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mr-3 mt-0.5 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm">Note any dietary preferences</p>
                  </div>
                </div>
              </div>
            ) : (
              renderSelectionOptions()
            )}
            
            {step > 1 && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selected: {step === 2 ? ingredients.length : step === 3 ? equipment.length : step === 4 ? staples.length : dietaryPrefs.length} items
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-6">
            {step === 1 ? (
              <Button variant="outline" onClick={skipOnboarding}>
                Skip
              </Button>
            ) : (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {step < 5 ? (
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={completeOnboarding}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete
                    <Check className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}