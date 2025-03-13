'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getUserPreferences, updateUserPreferences, incrementRecipesGenerated } from '@/lib/db';
import axios from 'axios';
import MainLayout from '@/components/layout/MainLayout';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Alert,
  AlertDescription,
  Badge,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger, 
  TabsContent
} from '@/components/ui';
import { 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Mic, 
  CookingPot,
  Utensils,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';

// Common preset options - moved to the top for reusability
const COMMON_INGREDIENTS = [
  'Chicken', 'Rice', 'Pasta', 'Potatoes', 'Onions', 'Garlic', 
  'Tomatoes', 'Eggs', 'Beef', 'Pork', 'Carrots', 'Bell Peppers', 
  'Broccoli', 'Spinach', 'Mushrooms', 'Beans', 'Cheese'
];

const COMMON_EQUIPMENT = [
  'Oven', 'Stovetop', 'Microwave', 'Blender', 'Slow Cooker', 
  'Air Fryer', 'Pressure Cooker', 'Grill', 'Toaster',
  'Cast Iron Pan', 'Non-Stick Pan', 'Baking Sheet'
];

const COMMON_STAPLES = [
  'Salt', 'Pepper', 'Olive Oil', 'Vegetable Oil', 'Flour', 
  'Sugar', 'Butter', 'Soy Sauce', 'Vinegar', 'Honey',
  'Pasta Sauce', 'Canned Tomatoes', 'Spices'
];

const COMMON_DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Low-Carb', 'Keto', 'Paleo', 'Nut-Free', 'Low-Sugar'
];

export default function GenerateRecipesPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <GenerateRecipes />
      </MainLayout>
    </AuthWrapper>
  );
}

function GenerateRecipes() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [staples, setStaples] = useState<string[]>([]);
  const [newStaple, setNewStaple] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [newDietaryPref, setNewDietaryPref] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  // State to track preferences loading
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(false);
  
  // Voice recognition state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (currentUser) {
        setLoadingPreferences(true);
        try {
          const prefs = await getUserPreferences(currentUser.uid);
          if (prefs) {
            console.log("Loaded user preferences:", prefs);
            setIngredients(prefs.ingredients || []);
            setEquipment(prefs.equipment || []);
            setStaples(prefs.staples || []);
            setDietaryPrefs(prefs.dietaryPrefs || []);
          } else {
            console.log("No user preferences found");
          }
        } catch (error) {
          console.error('Error loading preferences:', error);
          setPreferencesError(true);
        } finally {
          setLoadingPreferences(false);
        }
      } else {
        setLoadingPreferences(false);
      }
    };
    
    if (!authLoading) {
      loadUserPreferences();
    }
  }, [currentUser, authLoading]);
  
  const addIngredient = () => {
    if (newIngredient.trim() !== '' && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };
  
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  const addEquipment = () => {
    if (newEquipment.trim() !== '' && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };
  
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  
  const addStaple = () => {
    if (newStaple.trim() !== '' && !staples.includes(newStaple.trim())) {
      setStaples([...staples, newStaple.trim()]);
      setNewStaple('');
    }
  };
  
  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };
  
  const addDietaryPref = () => {
    if (newDietaryPref.trim() !== '' && !dietaryPrefs.includes(newDietaryPref.trim())) {
      setDietaryPrefs([...dietaryPrefs, newDietaryPref.trim()]);
      setNewDietaryPref('');
    }
  };
  
  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };

  // New function to add common preset items
  const addCommonItem = (item: string, category: 'ingredients' | 'equipment' | 'staples' | 'dietary') => {
    switch (category) {
      case 'ingredients':
        if (!ingredients.includes(item)) {
          setIngredients([...ingredients, item]);
        }
        break;
      case 'equipment':
        if (!equipment.includes(item)) {
          setEquipment([...equipment, item]);
        }
        break;
      case 'staples':
        if (!staples.includes(item)) {
          setStaples([...staples, item]);
        }
        break;
      case 'dietary':
        if (!dietaryPrefs.includes(item)) {
          setDietaryPrefs([...dietaryPrefs, item]);
        }
        break;
    }
  };
  
  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser');
      return;
    }
    
    setListening(true);
    setTimeout(() => {
      setListening(false);
      setTranscript('chicken, potatoes, carrots');
      
      const items = ['chicken', 'potatoes', 'carrots'];
      setIngredients([...new Set([...ingredients, ...items])]);
    }, 2000);
  };
  
  const nextStep = async () => {
    if (step === 1 && ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }
    
    // Save preferences at each step
    if (currentUser) {
      try {
        await updateUserPreferences(currentUser.uid, {
          ingredients,
          equipment,
          staples,
          dietaryPrefs
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
    
    if (step < 4) {
      setStep(step + 1);
      setError('');
    } else {
      generateRecipes();
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };
  
  const generateRecipes = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }
    
    if (!currentUser) {
      setError('You must be logged in to generate recipes');
      router.push('/signin');
      return;
    }
    
    setGenerating(true);
    setError('');
    
    try {
      // Update user stats
      await incrementRecipesGenerated(currentUser.uid);
      
      // Get the user's ID token for authentication
      const token = await currentUser.getIdToken();
      
      // Call the API to generate recipes
      const response = await axios.post('/api/generate-recipes', 
        {
          ingredients,
          equipment,
          staples,
          dietaryPrefs
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Store the recipes in session storage to access them on the results page
      sessionStorage.setItem('generatedRecipes', JSON.stringify(response.data.recipes));
      
      // Navigate to the results page
      router.push('/recipes/results');
    } catch (error: any) {
      console.error('Error generating recipes:', error);
      
      // Check for specific error responses
      if (error.response?.status === 401) {
        setError('Authentication error. Please sign in again.');
        setTimeout(() => router.push('/signin'), 2000);
      } else if (error.response?.status === 403 && error.response?.data?.limitExceeded) {
        setError('You have reached your free tier limit. Please upgrade to continue.');
      } else {
        setError(error.response?.data?.error || 'Failed to generate recipes');
      }
    } finally {
      setGenerating(false);
    }
  };
  
  // Get the current step details
  const getStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: "What ingredients do you have?",
          description: "Add the main ingredients you want to use in your recipe.",
          icon: <ShoppingBag className="h-6 w-6" />,
          inputPlaceholder: "Add an ingredient...",
          inputValue: newIngredient,
          setInputValue: setNewIngredient,
          addItem: addIngredient,
          items: ingredients,
          removeItem: removeIngredient,
          emptyMessage: "No ingredients added yet",
          badgeClassName: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
          commonItems: COMMON_INGREDIENTS,
          category: 'ingredients' as const
        };
      
      case 2:
        return {
          title: "What cooking equipment do you have?",
          description: "Add the kitchen equipment you have available.",
          icon: <Utensils className="h-6 w-6" />,
          inputPlaceholder: "Add equipment...",
          inputValue: newEquipment,
          setInputValue: setNewEquipment,
          addItem: addEquipment,
          items: equipment,
          removeItem: removeEquipment,
          emptyMessage: "No equipment added yet",
          badgeClassName: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          commonItems: COMMON_EQUIPMENT,
          category: 'equipment' as const
        };
      
      case 3:
        return {
          title: "What staples do you keep in your pantry?",
          description: "Add basic ingredients you typically have on hand.",
          icon: <ShoppingBag className="h-6 w-6" />,
          inputPlaceholder: "Add a staple...",
          inputValue: newStaple,
          setInputValue: setNewStaple,
          addItem: addStaple,
          items: staples,
          removeItem: removeStaple,
          emptyMessage: "No staples added yet",
          badgeClassName: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
          commonItems: COMMON_STAPLES,
          category: 'staples' as const
        };
      
      case 4:
        return {
          title: "Any dietary preferences or restrictions?",
          description: "Add any dietary needs or preferences you have.",
          icon: <AlertTriangle className="h-6 w-6" />,
          inputPlaceholder: "Add a dietary preference...",
          inputValue: newDietaryPref,
          setInputValue: setNewDietaryPref,
          addItem: addDietaryPref,
          items: dietaryPrefs,
          removeItem: removeDietaryPref,
          emptyMessage: "No dietary preferences added yet",
          badgeClassName: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
          commonItems: COMMON_DIETARY_PREFS,
          category: 'dietary' as const
        };
      
      default:
        return {
          title: "",
          description: "",
          icon: null,
          inputPlaceholder: "",
          inputValue: "",
          setInputValue: () => {},
          addItem: () => {},
          items: [],
          removeItem: () => {},
          emptyMessage: "",
          badgeClassName: "",
          commonItems: [],
          category: 'ingredients' as const
        };
    }
  };
  
  const stepContent = getStepContent();
  
  // Render loading state
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl font-bold flex items-center">
              <CookingPot className="mr-2 h-6 w-6 text-emerald-600" />
              Generate Recipes
            </CardTitle>
            <div className="text-sm font-medium text-gray-500">
              Step {step} of 4
            </div>
          </div>
          <Progress value={step * 25} className="h-2" />
        </CardHeader>
        
        {error && (
          <div className="px-6">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {stepContent.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">{stepContent.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stepContent.description}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="text"
                value={stepContent.inputValue}
                onChange={(e) => stepContent.setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && stepContent.addItem()}
                placeholder={stepContent.inputPlaceholder}
                className="flex-1"
              />
              <Button onClick={stepContent.addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              
              {step === 1 && (
                <Button 
                  variant="outline" 
                  disabled={listening}
                  onClick={startVoiceRecognition}
                  className={listening ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : ""}
                >
                  {listening ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4 mr-1" />
                  )}
                  {listening ? "Listening..." : "Voice"}
                </Button>
              )}
            </div>
            
            {transcript && step === 1 && (
              <p className="text-sm text-gray-500 italic">
                Heard: "{transcript}"
              </p>
            )}

            {/* Common Items Section - This must always appear regardless of preference loading state */}
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Common {step === 1 ? 'Ingredients' : step === 2 ? 'Equipment' : step === 3 ? 'Staples' : 'Preferences'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {stepContent.commonItems.map((item) => (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    onClick={() => addCommonItem(item, stepContent.category)}
                    className={`${
                      stepContent.items.includes(item) 
                        ? `bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 font-medium ${
                          step === 1 ? 'text-emerald-600 dark:text-emerald-400' :
                          step === 2 ? 'text-blue-600 dark:text-blue-400' :
                          step === 3 ? 'text-amber-600 dark:text-amber-400' :
                          'text-purple-600 dark:text-purple-400'
                        }`
                        : ''
                    }`}
                  >
                    {item}
                    {stepContent.items.includes(item) && (
                      <span className="ml-1">✓</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {stepContent.items.length > 0 ? `Your ${step === 1 ? 'ingredients' : step === 2 ? 'equipment' : step === 3 ? 'staples' : 'preferences'} (${stepContent.items.length})` : ''}
              </h4>
              <div className="flex flex-wrap gap-2">
                {stepContent.items.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">{stepContent.emptyMessage}</p>
                ) : (
                  stepContent.items.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className={stepContent.badgeClassName}
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
        </CardContent>
        
        <CardFooter className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : step < 4 ? (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Generate Recipes
                <CookingPot className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}