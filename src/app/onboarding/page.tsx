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
  AlertDescription,
  Input
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
  AlertTriangle,
  Plus,
  X
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

const COMMON_CUISINES = [
  'American', 'Italian', 'Chinese', 'Thai', 'Indian', 
  'Japanese', 'Mexican', 'Mediterranean', 'French', 'Korean'
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
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>([]);
  const [cookTimePreference, setCookTimePreference] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // New state for input fields
  const [newIngredient, setNewIngredient] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newStaple, setNewStaple] = useState('');
  const [newDietaryPref, setNewDietaryPref] = useState('');
  const [newCuisinePref, setNewCuisinePref] = useState('');
  
  // Toggle selection of an item
  const toggleItem = (item: string, category: 'ingredients' | 'equipment' | 'staples' | 'dietary' | 'cuisine') => {
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
      case 'cuisine':
        setCuisinePrefs(prev => 
          prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
        );
        break;
    }
  };
  
  // Add item functions
  const addIngredient = () => {
    if (newIngredient.trim() !== '' && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };
  
  const addEquipment = () => {
    if (newEquipment.trim() !== '' && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };
  
  const addStaple = () => {
    if (newStaple.trim() !== '' && !staples.includes(newStaple.trim())) {
      setStaples([...staples, newStaple.trim()]);
      setNewStaple('');
    }
  };
  
  const addDietaryPref = () => {
    if (newDietaryPref.trim() !== '' && !dietaryPrefs.includes(newDietaryPref.trim())) {
      setDietaryPrefs([...dietaryPrefs, newDietaryPref.trim()]);
      setNewDietaryPref('');
    }
  };
  
  const addCuisinePref = () => {
    if (newCuisinePref.trim() !== '' && !cuisinePrefs.includes(newCuisinePref.trim())) {
      setCuisinePrefs([...cuisinePrefs, newCuisinePref.trim()]);
      setNewCuisinePref('');
    }
  };
  
  // Remove item functions
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  
  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };
  
  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };
  
  const removeCuisinePref = (index: number) => {
    setCuisinePrefs(cuisinePrefs.filter((_, i) => i !== index));
  };
  
  // Navigation functions
  const nextStep = () => {
    if (step < 6) {
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
        dietaryPrefs,
        cuisinePrefs,
        cookTimePreference
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
      case 6:
        return {
          title: "Select Your Cuisine Preferences",
          description: "What types of cuisine do you enjoy? Select all that apply.",
          icon: <UtensilsCrossed className="h-8 w-8 text-emerald-600" />
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
  
  // Get current step content details for the UI
  const getCurrentStepContent = () => {
    switch (step) {
      case 2:
        return {
          items: ingredients,
          commonItems: COMMON_INGREDIENTS,
          category: 'ingredients',
          inputValue: newIngredient,
          setInputValue: setNewIngredient,
          addItem: addIngredient,
          removeItem: removeIngredient,
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-700",
          darkBgColor: "dark:bg-emerald-900/20",
          darkTextColor: "dark:text-emerald-300",
          buttonBgColor: "bg-emerald-100 dark:bg-emerald-900/50"
        };
      case 3:
        return {
          items: equipment,
          commonItems: COMMON_EQUIPMENT,
          category: 'equipment',
          inputValue: newEquipment,
          setInputValue: setNewEquipment,
          addItem: addEquipment,
          removeItem: removeEquipment,
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          darkBgColor: "dark:bg-blue-900/20",
          darkTextColor: "dark:text-blue-300",
          buttonBgColor: "bg-blue-100 dark:bg-blue-900/50"
        };
      case 4:
        return {
          items: staples,
          commonItems: COMMON_STAPLES,
          category: 'staples',
          inputValue: newStaple,
          setInputValue: setNewStaple,
          addItem: addStaple,
          removeItem: removeStaple,
          bgColor: "bg-amber-50",
          textColor: "text-amber-700",
          darkBgColor: "dark:bg-amber-900/20",
          darkTextColor: "dark:text-amber-300",
          buttonBgColor: "bg-amber-100 dark:bg-amber-900/50"
        };
      case 5:
        return {
          items: dietaryPrefs,
          commonItems: COMMON_DIETARY_PREFS,
          category: 'dietary',
          inputValue: newDietaryPref,
          setInputValue: setNewDietaryPref,
          addItem: addDietaryPref,
          removeItem: removeDietaryPref,
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          darkBgColor: "dark:bg-purple-900/20",
          darkTextColor: "dark:text-purple-300",
          buttonBgColor: "bg-purple-100 dark:bg-purple-900/50"
        };
      case 6:
        return {
          items: cuisinePrefs,
          commonItems: COMMON_CUISINES,
          category: 'cuisine',
          inputValue: newCuisinePref,
          setInputValue: setNewCuisinePref,
          addItem: addCuisinePref,
          removeItem: removeCuisinePref,
          bgColor: "bg-pink-50",
          textColor: "text-pink-700",
          darkBgColor: "dark:bg-pink-900/20",
          darkTextColor: "dark:text-pink-300",
          buttonBgColor: "bg-pink-100 dark:bg-pink-900/50"
        };
      default:
        return null;
    }
  };
  
  const stepContent = getCurrentStepContent();
  
  // Enhanced rendering of selection options with common items
  const renderSelectionOptions = () => {
    if (!stepContent) return null;
    
    return (
      <div className="space-y-6">
        {/* Manual input section */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={stepContent.inputValue}
            onChange={(e) => stepContent.setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && stepContent.addItem()}
            placeholder={`Add ${step === 2 ? 'an ingredient' : step === 3 ? 'equipment' : step === 4 ? 'a staple' : step === 5 ? 'a dietary preference' : 'a cuisine preference'}...`}
            className="flex-1"
          />
          <Button onClick={stepContent.addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        
        {/* Common items section */}
        <div>
          <h4 className="text-sm font-medium mb-3">Common {step === 2 ? 'Ingredients' : step === 3 ? 'Equipment' : step === 4 ? 'Staples' : step === 5 ? 'Dietary Preferences' : 'Cuisines'}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stepContent.commonItems.map((item) => (
              <Button
                key={item}
                variant="outline"
                size="sm"
                onClick={() => toggleItem(item, stepContent.category as any)}
                className={`text-left justify-start px-3 py-2 h-auto ${
                  stepContent.items.includes(item) 
                    ? `${stepContent.buttonBgColor} border-transparent font-medium`
                    : ''
                }`}
              >
                {stepContent.items.includes(item) && (
                  <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                )}
                <span className="truncate">{item}</span>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Selected items */}
        <div>
          <h4 className="text-sm font-medium mb-2">Selected Items ({stepContent.items.length})</h4>
          <div className="flex flex-wrap gap-2">
            {stepContent.items.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No items selected yet</p>
            ) : (
              stepContent.items.map((item, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`${stepContent.bgColor} ${stepContent.textColor} ${stepContent.darkBgColor} ${stepContent.darkTextColor}`}
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => stepContent.removeItem(index)}
                    className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {item}</span>
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
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
                Step {step} of 6
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
            
            {step < 6 ? (
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