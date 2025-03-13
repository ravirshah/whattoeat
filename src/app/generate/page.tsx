'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getUserPreferences, updateUserPreferences, incrementRecipesGenerated } from '@/lib/db';
import { toast } from 'sonner';
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
  AlertTriangle,
  Square
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

// Add this debug component to help diagnose deployment issues
function DeploymentDebugInfo() {
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    if (showDebug) {
      // Collect deployment information
      const info = {
        baseUrl: window.location.origin,
        pathname: window.location.pathname,
        href: window.location.href,
        basePath: window.location.pathname.startsWith('/whattoeat') ? '/whattoeat' : '',
        nextPublicApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not Set',
        nextPublicAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not Set',
        nextPublicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not Set',
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(info);
    }
  }, [showDebug]);
  
  if (!showDebug) {
    return (
      <div className="text-center mt-8">
        <button 
          onClick={() => setShowDebug(true)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Debug Info
        </button>
      </div>
    );
  }
  
  return (
    <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Deployment Debug Info</h3>
        <button 
          onClick={() => setShowDebug(false)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Hide
        </button>
      </div>
      <pre className="text-xs overflow-auto p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}

export default function GenerateRecipesPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <GenerateRecipes />
        {process.env.NODE_ENV !== 'production' && <DeploymentDebugInfo />}
      </MainLayout>
    </AuthWrapper>
  );
}

function GenerateRecipes() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Speech recognition ref
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Input states
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [staples, setStaples] = useState<string[]>([]);
  const [newStaple, setNewStaple] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [newDietaryPref, setNewDietaryPref] = useState('');
  
  // UI states
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(false);
  
  // Voice recognition states
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(isSupported);
    }
  }, []);
  
  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && listening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping speech recognition:", e);
        }
      }
    };
  }, [listening]);
  
  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!currentUser) {
        setLoadingPreferences(false);
        return;
      }
      
      setLoadingPreferences(true);
      try {
        const prefs = await getUserPreferences(currentUser.uid);
        if (prefs) {
          setIngredients(prefs.ingredients || []);
          setEquipment(prefs.equipment || []);
          setStaples(prefs.staples || []);
          setDietaryPrefs(prefs.dietaryPrefs || []);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        setPreferencesError(true);
      } finally {
        setLoadingPreferences(false);
      }
    };
    
    if (!authLoading) {
      loadUserPreferences();
    }
  }, [currentUser, authLoading]);
  
  // Add/remove functions for ingredients
  const addIngredient = () => {
    if (newIngredient.trim() !== '' && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };
  
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  // Add/remove functions for equipment
  const addEquipment = () => {
    if (newEquipment.trim() !== '' && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };
  
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  
  // Add/remove functions for staples
  const addStaple = () => {
    if (newStaple.trim() !== '' && !staples.includes(newStaple.trim())) {
      setStaples([...staples, newStaple.trim()]);
      setNewStaple('');
    }
  };
  
  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };
  
  // Add/remove functions for dietary preferences
  const addDietaryPref = () => {
    if (newDietaryPref.trim() !== '' && !dietaryPrefs.includes(newDietaryPref.trim())) {
      setDietaryPrefs([...dietaryPrefs, newDietaryPref.trim()]);
      setNewDietaryPref('');
    }
  };
  
  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };

  // Helper function to capitalize first letter of each word
  const capitalizeFirstLetter = (string: string): string => {
    return string.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Speech recognition functions
  const startVoiceRecognition = () => {
    if (typeof window === 'undefined') return;
    
    // Check browser compatibility
    if (!speechSupported) {
      toast.error('Voice recognition is not supported in your browser');
      return;
    }
    
    try {
      // Create speech recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error('Voice recognition is not available');
        return;
      }
      
      const recognition = new SpeechRecognition();
      
      // Store in ref for cleanup
      recognitionRef.current = recognition;
      
      // Configure recognition settings
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Set listening state
      setListening(true);
      setTranscript('');
      
      // Get the current category based on step
      let category: 'ingredients' | 'equipment' | 'staples' = 'ingredients';
      if (step === 2) category = 'equipment';
      if (step === 3) category = 'staples';
      
      // Get category-specific display name for toast messages
      const categoryDisplayName = 
        category === 'ingredients' ? 'ingredient' : 
        category === 'equipment' ? 'equipment item' : 'staple item';
      
      // Handle recognition results
      recognition.onresult = (event) => {
        // Get the last result (most recent utterance)
        const lastResultIndex = event.results.length - 1;
        const transcriptText = event.results[lastResultIndex][0].transcript;
        
        setTranscript(transcriptText);
        
        // Parse items from transcript based on current category
        const parsedItems = parseItemsFromText(transcriptText, category);
        
        if (parsedItems.length > 0) {
          // Add unique items to the appropriate list based on category
          if (category === 'ingredients') {
            setIngredients((prevItems) => {
              const existingItemsSet = new Set(prevItems.map(i => i.toLowerCase()));
              const newItems = parsedItems.filter(
                item => !existingItemsSet.has(item.toLowerCase())
              );
              return [...prevItems, ...newItems.map(capitalizeFirstLetter)];
            });
          } else if (category === 'equipment') {
            setEquipment((prevItems) => {
              const existingItemsSet = new Set(prevItems.map(i => i.toLowerCase()));
              const newItems = parsedItems.filter(
                item => !existingItemsSet.has(item.toLowerCase())
              );
              return [...prevItems, ...newItems.map(capitalizeFirstLetter)];
            });
          } else if (category === 'staples') {
            setStaples((prevItems) => {
              const existingItemsSet = new Set(prevItems.map(i => i.toLowerCase()));
              const newItems = parsedItems.filter(
                item => !existingItemsSet.has(item.toLowerCase())
              );
              return [...prevItems, ...newItems.map(capitalizeFirstLetter)];
            });
          }
          
          // Show success message with the items that were added
          if (parsedItems.length > 0) {
            toast.success(
              `Added ${parsedItems.length} ${categoryDisplayName}${parsedItems.length === 1 ? '' : 's'}: ${parsedItems.join(', ')}`,
              { duration: 4000 }
            );
          }
        } else {
          toast.error(`No ${categoryDisplayName}s detected. Please try again.`);
        }
      };
      
      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setListening(false);
        recognitionRef.current = null;
        
        // Provide helpful error messages based on the error type
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else {
          toast.error('Voice recognition error. Please try again.');
        }
      };
      
      // Handle end of recognition
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      
      // Start recognition with error handling
      recognition.start();
    } catch (error) {
      console.error('Speech recognition error', error);
      setListening(false);
      recognitionRef.current = null;
      toast.error('Could not start voice recognition. Please check your microphone permissions.');
    }
  };
  
  // Stop recognition
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      
      setListening(false);
      recognitionRef.current = null;
      
      if (transcript) {
        toast.info('Voice recognition stopped');
      }
    }
  };
  
  // Parse items from text
  const parseItemsFromText = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string[] => {
    try {
      // Normalize text: convert to lowercase
      let normalizedText = text.toLowerCase();
      
      // Different parsing strategies based on category
      if (category === 'ingredients') {
        // Replace common fraction words with symbols for ingredients
        normalizedText = normalizedText
          .replace(/\bhalf\b/g, '1/2')
          .replace(/\bhalf a\b/g, '1/2')
          .replace(/\bquarter\b/g, '1/4')
          .replace(/\bthird\b/g, '1/3')
          .replace(/\bthree quarters\b/g, '3/4');
        
        // Convert number words to digits but keep them as standalone words
        normalizedText = normalizedText
          .replace(/\bone\b/g, '1')
          .replace(/\btwo\b/g, '2')
          .replace(/\bthree\b/g, '3')
          .replace(/\bfour\b/g, '4')
          .replace(/\bfive\b/g, '5')
          .replace(/\bsix\b/g, '6')
          .replace(/\bseven\b/g, '7')
          .replace(/\beight\b/g, '8')
          .replace(/\bnine\b/g, '9')
          .replace(/\bten\b/g, '10');
      }
      
      // Split by common delimiters for all categories
      const explicitSplits = normalizedText.split(/(?:,|\band\b|\balso\b|\bplus\b|\bthen\b)\s*/i);
      
      // Array to hold the parsed items
      let items: string[] = [];
      
      // Process each chunk that might contain multiple items
      for (let chunk of explicitSplits) {
        // Remove filler words
        chunk = chunk.replace(/\b(?:uhh?|umm?|err?|like|maybe|i think|i have|i've got|got|have)\b/gi, '');
        
        if (category === 'ingredients') {
          // More detailed parsing for ingredients
          
          // Identify if the chunk might contain multiple ingredients indicated by "some" keyword
          const someBasedChunks = chunk.split(/\bsome\b/i).map(part => part.trim()).filter(Boolean);
          
          if (someBasedChunks.length > 1) {
            // If "some" was used as a separator, process each part
            for (let part of someBasedChunks) {
              if (part) items.push(cleanItem(part, category));
            }
          } else {
            // Check if this chunk might contain a quantity followed by an ingredient
            const quantityMatch = chunk.match(/^(\d+(?:\/\d+)?)\s+([a-z\s]+)$/);
            
            if (quantityMatch) {
              // We found a quantity followed by an ingredient
              const quantity = quantityMatch[1];
              const ingredientText = quantityMatch[2].trim();
              items.push(`${quantity} ${ingredientText}`);
            } else {
              // No quantity pattern found, just clean it normally
              const cleaned = cleanItem(chunk, category);
              if (cleaned) items.push(cleaned);
            }
          }
        } else {
          // Simpler parsing for equipment and staples
          const cleaned = cleanItem(chunk, category);
          if (cleaned) items.push(cleaned);
        }
      }
      
      return items.filter(i => i.length > 0);
    } catch (error) {
      console.error('Error parsing speech:', error);
      return [];
    }
  };
  
  // Helper function to clean up individual item text
  const cleanItem = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string => {
    // Remove common articles from the beginning for all categories
    let cleaned = text.replace(/^\s*(?:a|an|the|some|few|little)\s+/i, '');
    
    if (category === 'ingredients') {
      // Handle "head of" pattern for ingredients (e.g., "head of broccoli" -> "broccoli")
      cleaned = cleaned.replace(/\b(head|bunch|clove|piece)s?\s+of\s+/i, '');
      
      // Handle common quantity expressions for ingredients
      cleaned = cleaned.replace(/\ba\s+(?:little|bit\s+of)\s+/i, '');
    } else if (category === 'equipment') {
      // Clean up equipment-specific patterns
      cleaned = cleaned.replace(/\bmy\s+/i, '');
      cleaned = cleaned.replace(/\bi\s+(?:use|have|own)\s+(?:a|an|the)?\s*/i, '');
    } else if (category === 'staples') {
      // Clean up staples-specific patterns
      cleaned = cleaned.replace(/\balways\s+(?:have|keep)\s+/i, '');
      cleaned = cleaned.replace(/\bin\s+(?:my|the)\s+pantry\b/i, '');
    }
    
    // Clean up any extra whitespace for all categories
    cleaned = cleaned.trim();
    
    return cleaned;
  };
  
  // Add common preset items
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
  
  // Navigation functions
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
  
  // Generate recipes
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
      try {
        await incrementRecipesGenerated(currentUser.uid);
      } catch (error) {
        console.error('Error incrementing recipes generated:', error);
        // Continue anyway - this isn't critical
      }
      
      // Get the user's ID token for authentication
      const token = await currentUser.getIdToken();
      
      // Get base path and construct API URL correctly
      const basePath = typeof window !== 'undefined' 
        ? window.location.pathname.startsWith('/whattoeat') ? '/whattoeat' : '' 
        : '';
      
      // Set up API options for the request
      const apiOptions = {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000 // 30 second timeout
      };
      
      // Data payload
      const recipeData = {
        ingredients,
        equipment,
        staples,
        dietaryPrefs
      };
      
      console.log("Attempting to generate recipes...");
      
      let response;
      try {
        // First try the simpler endpoint (faster, returns sample recipes)
        console.log("Trying simplified API endpoint");
        response = await axios.post(`${basePath}/api/generate-recipes-simple`, recipeData, apiOptions);
      } catch (simpleError) {
        console.log("Simplified endpoint failed, falling back to main endpoint");
        console.error("Simple endpoint error:", simpleError);
        
        // Fall back to the original endpoint if the simple one fails
        response = await axios.post(`${basePath}/api/generate-recipes`, recipeData, apiOptions);
      }
      
      console.log('API Response:', response.status, response.data);
      
      if (!response.data || !response.data.recipes || response.data.recipes.length === 0) {
        throw new Error('No recipes were generated');
      }
      
      // Store the recipes in session storage to access them on the results page
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('generatedRecipes', JSON.stringify(response.data.recipes));
          
          // Navigate to the results page - be sure to include the base path
          const basePath = window.location.pathname.startsWith('/whattoeat') ? '/whattoeat' : '';
          router.push(`${basePath}/recipes/results`);
        } catch (error) {
          console.error('Error storing recipes in session storage:', error);
          setError('Failed to save generated recipes. Please try again.');
          setGenerating(false);
        }
      }
    } catch (error: any) {
      console.error('Error generating recipes:', error);
      
      // Add detailed logging for debugging
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        console.error('Request URL:', error.config?.url);
      }
      
      // Check for specific error responses
      if (error.response?.status === 404) {
        setError('API endpoint not found. This is likely a deployment configuration issue.');
      } else if (error.response?.status === 401) {
        setError('Authentication error. Please sign in again.');
        
        // Include base path in navigation
        const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/whattoeat') 
          ? '/whattoeat' : '';
        setTimeout(() => router.push(`${basePath}/signin`), 2000);
      } else if (error.response?.status === 403 && error.response?.data?.limitExceeded) {
        setError('You have reached your free tier limit. Please upgrade to continue.');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.message) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Failed to generate recipes. Please try again.');
      }
      
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
              
              {/* Voice button only shows if speech is supported and in steps 1-3 */}
              {speechSupported && step <= 3 && (
                <Button 
                  variant={listening ? "destructive" : "outline"}
                  onClick={listening ? stopVoiceRecognition : startVoiceRecognition}
                  className={listening ? "animate-pulse" : ""}
                >
                  {listening ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      Voice
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* Listening indicator and transcript feedback */}
            {listening && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Listening... Say your {step === 1 ? 'ingredients' : step === 2 ? 'equipment' : 'staples'} and click Stop when done
                  </p>
                </div>
              </div>
            )}

            {transcript && !listening && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Last recording:</span> "{transcript}"
                </p>
              </div>
            )}

            {/* Common Items Section */}
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

// TypeScript interfaces for Speech Recognition API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

// Extend the Window interface to include SpeechRecognition
declare global {
  interface Window { 
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}