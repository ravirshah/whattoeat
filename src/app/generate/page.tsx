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
  Square,
  RefreshCw,
  Clock,
  ChefHat
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

// Add Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Basic SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Common preset options
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

const POPULAR_CUISINES = [
  'Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 
  'Thai', 'American', 'French', 'Mediterranean', 'Korean'
];

const COOK_TIMES = [
  'Under 30 mins', 'Under 1 hour', '1 hour+'
];

const DIFFICULTIES = [
  'Easy', 'Medium', 'Hard'
];

// Define the type for preferences passed as props
interface PreferencesData {
  ingredients: string[];
  equipment: string[];
  staples: string[];
  dietaryPrefs: string[];
  cuisine?: string;
  cookTime?: 'Under 30 mins' | 'Under 1 hour' | '1 hour+';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

function GenerateRecipes({ initialPreferences }: { initialPreferences: PreferencesData }) {
  const { currentUser, refreshUser } = useAuth();
  const router = useRouter();
  
  // Speech recognition ref
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize state from props
  const [ingredients, setIngredients] = useState<string[]>(initialPreferences.ingredients || []);
  const [newIngredient, setNewIngredient] = useState('');
  const [equipment, setEquipment] = useState<string[]>(initialPreferences.equipment || []);
  const [newEquipment, setNewEquipment] = useState('');
  const [staples, setStaples] = useState<string[]>(initialPreferences.staples || []);
  const [newStaple, setNewStaple] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(initialPreferences.dietaryPrefs || []);
  const [newDietaryPref, setNewDietaryPref] = useState('');
  const [cuisine, setCuisine] = useState<string>(initialPreferences.cuisine || '');
  const [cookTime, setCookTime] = useState<'Under 30 mins' | 'Under 1 hour' | '1 hour+' | ''>(initialPreferences.cookTime || '');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | ''>(initialPreferences.difficulty || '');
  
  // UI states
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  // Voice recognition states
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Retry mechanism
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  // Make sure we have a valid user
  useEffect(() => {
    const verifyUser = async () => {
      // If there's no current user, try to refresh
      if (!currentUser) {
        console.log("[GenerateRecipes] No current user, trying to refresh auth state");
        const refreshedUser = await refreshUser();
        if (!refreshedUser) {
          console.log("[GenerateRecipes] Still no user after refresh, may need to sign in");
        }
      }
    };
    
    verifyUser();
  }, [currentUser, refreshUser]);
  
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
    
    if (!speechSupported) {
      toast.error('Voice recognition is not supported in your browser');
      return;
    }
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Voice recognition is not available');
        return;
      }
      const recognition = new SpeechRecognition(); 
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = true; 
      recognition.interimResults = false; 
      recognition.maxAlternatives = 1;
      setListening(true);
      setTranscript('');
      let category: 'ingredients' | 'equipment' | 'staples' = 'ingredients';
      if (step === 2) category = 'equipment';
      if (step === 3) category = 'staples';
      const categoryDisplayName = category === 'ingredients' ? 'ingredient' : category === 'equipment' ? 'equipment item' : 'staple item';

      recognition.onresult = (event: SpeechRecognitionEvent) => { 
        let finalTranscriptCombined = '';
        if (event.results && event.results.length > event.resultIndex) {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal && event.results[i][0]) {
              finalTranscriptCombined += event.results[i][0].transcript.trim() + ' ';
            }
          }
        }
        finalTranscriptCombined = finalTranscriptCombined.trim();
        if (finalTranscriptCombined) {
           setTranscript(prev => prev ? `${prev}, ${finalTranscriptCombined}` : finalTranscriptCombined);
           const itemsToAdd = parseItemsFromText(finalTranscriptCombined, category);
           if (itemsToAdd.length > 0) {
             let addedCount = 0;
             itemsToAdd.forEach(newItem => {
                let alreadyExists = false;
                const newItemLower = newItem.toLowerCase();
                if (category === 'ingredients') {
                    alreadyExists = ingredients.some(existing => existing.toLowerCase() === newItemLower);
                    if (!alreadyExists) setIngredients(prev => [...prev, capitalizeFirstLetter(newItem)]);
                } else if (category === 'equipment') {
                    alreadyExists = equipment.some(existing => existing.toLowerCase() === newItemLower);
                    if (!alreadyExists) setEquipment(prev => [...prev, capitalizeFirstLetter(newItem)]);
                } else if (category === 'staples') {
                    alreadyExists = staples.some(existing => existing.toLowerCase() === newItemLower);
                    if (!alreadyExists) setStaples(prev => [...prev, capitalizeFirstLetter(newItem)]);
                }
                if (!alreadyExists) addedCount++;
             });
             if (addedCount > 0) {
                toast.success(`Added ${addedCount} ${categoryDisplayName}(s) from voice`);
             }
           }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        let errorMsg = `Speech recognition error: ${event.error}`;
        if (event.error === 'no-speech') { errorMsg = "No speech detected. Please try speaking again."; }
        else if (event.error === 'audio-capture') { errorMsg = "Audio capture failed. Check microphone permissions."; }
        else if (event.error === 'not-allowed') { errorMsg = "Microphone access denied. Please allow access in browser settings."; }
        toast.error(errorMsg);
        stopVoiceRecognition();
      };

      recognition.onend = () => { if (recognitionRef.current) { setListening(false); } };
      recognition.start();
    } catch (e) {
      console.error("Failed to start voice recognition:", e);
      toast.error("Could not start voice recognition.");
      setListening(false);
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    }
  };
  
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (error) { console.error('Error stopping recognition:', error); }
      setListening(false);
      recognitionRef.current = null;
      if (transcript) { toast.info('Voice recognition stopped'); }
    }
  };
  
  // Parse items from text
  const parseItemsFromText = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string[] => {
    try {
      let normalizedText = text.toLowerCase();
      if (category === 'ingredients') {
        normalizedText = normalizedText
          .replace(/\bhalf\b/g, '1/2').replace(/\bhalf a\b/g, '1/2').replace(/\bquarter\b/g, '1/4').replace(/\bthird\b/g, '1/3').replace(/\bthree quarters\b/g, '3/4')
          .replace(/\bone\b/g, '1').replace(/\btwo\b/g, '2').replace(/\bthree\b/g, '3').replace(/\bfour\b/g, '4').replace(/\bfive\b/g, '5').replace(/\bsix\b/g, '6').replace(/\bseven\b/g, '7').replace(/\beight\b/g, '8').replace(/\bnine\b/g, '9').replace(/\bten\b/g, '10');
      }
      const explicitSplits = normalizedText.split(/(?:,|\band\b|\balso\b|\bplus\b|\bthen\b)\s*/i);
      let items: string[] = [];
      for (let chunk of explicitSplits) {
        chunk = chunk.replace(/\b(?:uhh?|umm?|err?|like|maybe|i think|i have|i've got|got|have)\b/gi, '');
        if (category === 'ingredients') {
          const someBasedChunks = chunk.split(/\bsome\b/i).map(part => part.trim()).filter(Boolean);
          if (someBasedChunks.length > 1) {
            for (let part of someBasedChunks) { if (part) items.push(cleanItem(part, category)); }
          } else {
            const quantityMatch = chunk.match(/^(\d+(?:\/\d+)?)\s+([a-z\s]+)$/);
            if (quantityMatch) {
              const quantity = quantityMatch[1];
              const ingredientText = quantityMatch[2].trim();
              items.push(`${quantity} ${ingredientText}`);
            } else {
              const cleaned = cleanItem(chunk, category);
              if (cleaned) items.push(cleaned);
            }
          }
        } else {
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
    let cleaned = text.replace(/^\s*(?:a|an|the|some|few|little)\s+/i, '');
    if (category === 'ingredients') {
      cleaned = cleaned.replace(/\b(head|bunch|clove|piece)s?\s+of\s+/i, '');
      cleaned = cleaned.replace(/\ba\s+(?:little|bit\s+of)\s+/i, '');
    } else if (category === 'equipment') {
      cleaned = cleaned.replace(/\bmy\s+/i, '');
      cleaned = cleaned.replace(/\bi\s+(?:use|have|own)\s+(?:a|an|the)?\s*/i, '');
    } else if (category === 'staples') {
      cleaned = cleaned.replace(/\balways\s+(?:have|keep)\s+/i, '');
      cleaned = cleaned.replace(/\bin\s+(?:my|the)\s+pantry\b/i, '');
    }
    cleaned = cleaned.trim();
    return cleaned;
  };
  
  // Add common preset items
  const addCommonItem = (item: string, category: 'ingredients' | 'equipment' | 'staples' | 'dietary') => {
    switch (category) {
      case 'ingredients': if (!ingredients.includes(item)) setIngredients([...ingredients, item]); break;
      case 'equipment': if (!equipment.includes(item)) setEquipment([...equipment, item]); break;
      case 'staples': if (!staples.includes(item)) setStaples([...staples, item]); break;
      case 'dietary': if (!dietaryPrefs.includes(item)) setDietaryPrefs([...dietaryPrefs, item]); break;
    }
  };
  
  // Navigation functions
  const nextStep = async () => {
    if (step === 1 && ingredients.length === 0) { setError('Please add at least one ingredient'); return; }
    if (currentUser) {
      try {
        if (step === 1) await updateUserPreferences(currentUser.uid, { ingredients });
        if (step === 2) await updateUserPreferences(currentUser.uid, { equipment });
        if (step === 3) await updateUserPreferences(currentUser.uid, { staples });
        if (step === 4) await updateUserPreferences(currentUser.uid, { dietaryPrefs });
        if (step === 5) { await updateUserPreferences(currentUser.uid, { cuisine: cuisine || undefined, cookTime: cookTime || undefined, difficulty: difficulty || undefined }); }
      } catch (e) { console.error("Error saving preferences:", e); toast.warning("Could not save preferences for next time."); }
    }
    if (step < totalSteps) { setStep(step + 1); setError(''); } 
    else { await generateRecipes(); }
  };
  
  const prevStep = () => { if (step > 1) { setStep(step - 1); setError(''); } };
  
  // Generate recipes
  const generateRecipes = async () => {
    if (ingredients.length === 0) { setError('Please add at least one ingredient'); setStep(1); return; }
    
    setGenerating(true); setError(''); setRetryCount(0);
    
    // Try to refresh auth state first - this ensures we have fresh tokens
    try {
      const refreshedUser = await refreshUser();
      if (!refreshedUser) {
        console.log("[GenerateRecipes] No user after refresh, redirecting to sign in");
        setError("Session expired. Please sign in again.");
        setGenerating(false);
        router.push('/signin');
        return;
      }
    } catch (authRefreshError) {
      console.error("[GenerateRecipes] Error refreshing auth:", authRefreshError);
      // Continue with current user anyway, the token might still be valid
    }
    
    try {
      try { 
        if (currentUser?.uid) {
          incrementRecipesGenerated(currentUser.uid).catch(err => console.error("Failed to increment recipe count:", err)); 
        }
      } catch (statsError) { console.error("Error updating stats:", statsError); }
      
      let token;
      try { 
        // Make sure we're using the refreshed user or current user
        const userToUse = currentUser;
        if (!userToUse) {
          setError("Authentication error. Please sign in again.");
          setGenerating(false);
          router.push('/signin');
          return;
        }
        
        token = await userToUse.getIdToken(true); // Force token refresh
        if (!token) throw new Error("Failed to get authentication token"); 
      } catch (tokenError) { 
        console.error("Error getting auth token:", tokenError); 
        setError('Authentication error. Please sign in again.'); 
        setGenerating(false);
        router.push('/signin');
        return; 
      }
      
      const requestData = { ingredients, equipment, staples, dietaryPrefs, cuisine, cookTime, difficulty, userId: currentUser.uid };
      console.log("Sending API request with data:", { ingredientsCount: ingredients.length, equipmentCount: equipment.length, staplesCount: staples.length, dietaryPrefsCount: dietaryPrefs.length });
      let recipeData; try {
        const response = await axios.post('/whattoeat/api/generate-recipes', requestData, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 60000 });
        recipeData = response.data;
      } catch (mainApiError) {
        console.error("Error with main API, trying fallback:", mainApiError);
        try {
          const fallbackResponse = await axios.post('/whattoeat/api/generate-recipes-simple', requestData, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 30000 });
          recipeData = fallbackResponse.data;
          toast.info('Using sample recipes', { description: 'Our full recipe generator is busy. Showing example recipes instead.' });
        } catch (fallbackError) { console.error("Fallback API also failed:", fallbackError); throw mainApiError; }
      }
      if (recipeData && recipeData.recipes && recipeData.recipes.length > 0) {
        console.log(`Received ${recipeData.recipes.length} recipes from API`);
        if (recipeData.apiInfo) { console.log("Using API fallback recipes due to:", recipeData.apiInfo.error); toast.info("Using sample recipes", { description: "We're showing example recipes while our system is busy." }); }
        sessionStorage.setItem('generatedRecipes', JSON.stringify(recipeData.recipes));
        setRetryCount(0);
        router.push('/recipes/results');
        return;
      }
      throw new Error("No recipes returned from API");
    } catch (error: any) {
      console.error("Error generating recipes:", error);
      const newRetryCount = retryCount + 1; setRetryCount(newRetryCount);
      if (error.response) {
        console.error("Server error:", error.response.status, error.response.data);
        if (error.response.status === 401) { 
          // Don't redirect to signin, just show an error
          setError("Authentication error. Please refresh the page and try again."); 
        } 
        else if (error.response.data && error.response.data.error) { setError(error.response.data.error); } 
        else { setError("Error communicating with the recipe service. Please try again."); }
      } else if (error.request) { console.error("Network error, no response received"); setError("Network issue. Please check your connection and try again."); }
      else { console.error("Request setup error:", error.message); setError("Failed to create recipe request. Please try again."); }
      if (newRetryCount > maxRetries) { toast.error("We're having trouble connecting to our service", { description: "Please try again later" }); }
      setGenerating(false);
    }
  };
  
  // Also replace the retryGeneration function with this improved version
  const retryGeneration = () => {
    if (retryCount >= maxRetries) { toast.error("Maximum retries already reached."); return; }
    setGenerating(true); setError(''); setRetryCount(retryCount + 1);
    toast.info(`Manual retry initiated... (${retryCount + 1}/${maxRetries})`);
    generateRecipes();
  };
  
  // Get the current step details
  const getStepContent = (): JSX.Element | null => {
    switch (step) {
      case 1:
        return (
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="ingredient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What ingredients do you have?
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  id="ingredient"
                  placeholder="Add an ingredient..."
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                />
                <Button onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Common Ingredients</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_INGREDIENTS.map((item) => (
                  <Button
                    key={item}
                    variant={ingredients.includes(item) ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => addCommonItem(item, 'ingredients')}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Ingredients ({ingredients.length})</h4>
              <div className="flex flex-wrap gap-2">
                {ingredients.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No ingredients added yet</p>
                ) : (
                  ingredients.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    >
                      {item}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => removeIngredient(index)}
                      />
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        );
      
      case 2:
        return (
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="equipment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What cooking equipment do you have?
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  id="equipment"
                  placeholder="Add equipment..."
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
                />
                <Button onClick={addEquipment}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Common Equipment</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_EQUIPMENT.map((item) => (
                  <Button
                    key={item}
                    variant={equipment.includes(item) ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => addCommonItem(item, 'equipment')}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Equipment ({equipment.length})</h4>
              <div className="flex flex-wrap gap-2">
                {equipment.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No equipment added yet</p>
                ) : (
                  equipment.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {item}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => removeEquipment(index)}
                      />
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        );
      
      case 3:
        return (
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="staple" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What staples do you keep in your pantry?
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  id="staple"
                  placeholder="Add a staple..."
                  value={newStaple}
                  onChange={(e) => setNewStaple(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addStaple()}
                />
                <Button onClick={addStaple}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Common Staples</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_STAPLES.map((item) => (
                  <Button
                    key={item}
                    variant={staples.includes(item) ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => addCommonItem(item, 'staples')}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Staples ({staples.length})</h4>
              <div className="flex flex-wrap gap-2">
                {staples.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No staples added yet</p>
                ) : (
                  staples.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >
                      {item}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => removeStaple(index)}
                      />
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        );
      
      case 4:
        return (
          <CardContent className="space-y-6">
            <div>
              <label htmlFor="dietaryPref" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Any dietary preferences or restrictions?
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  id="dietaryPref"
                  placeholder="Add a dietary preference..."
                  value={newDietaryPref}
                  onChange={(e) => setNewDietaryPref(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDietaryPref()}
                />
                <Button onClick={addDietaryPref}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Common Preferences</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_DIETARY_PREFS.map((item) => (
                  <Button
                    key={item}
                    variant={dietaryPrefs.includes(item) ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => addCommonItem(item, 'dietary')}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Preferences ({dietaryPrefs.length})</h4>
              <div className="flex flex-wrap gap-2">
                {dietaryPrefs.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No dietary preferences added yet</p>
                ) : (
                  dietaryPrefs.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    >
                      {item}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => removeDietaryPref(index)}
                      />
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        );
      
      case 5:
        return (
          <CardContent className="space-y-8">
            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cuisine Preference (Optional)
              </label>
              <Input
                id="cuisine"
                placeholder="e.g., Italian, Mexican, Any"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {POPULAR_CUISINES.map((c) => (
                  <Button 
                    key={c} 
                    variant={cuisine === c ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setCuisine(c)}
                    className="transition-all"
                  >
                    {c}
                  </Button>
                ))}
                 <Button 
                    variant={cuisine === '' ? "secondary" : "outline"}
                    size="sm" 
                    onClick={() => setCuisine('')}
                    className="transition-all text-xs"
                  >
                    Any / Clear
                  </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cook Time Preference (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {COOK_TIMES.map((t) => (
                  <Button 
                    key={t} 
                    variant={cookTime === t ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setCookTime(t as 'Under 30 mins' | 'Under 1 hour' | '1 hour+')}
                    className="transition-all"
                  >
                    <Clock className="mr-2 h-4 w-4" /> {t}
                  </Button>
                ))}
                <Button 
                    variant={cookTime === '' ? "secondary" : "outline"}
                    size="sm" 
                    onClick={() => setCookTime('')}
                    className="transition-all text-xs"
                  >
                    Any / Clear
                  </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty Preference (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <Button 
                    key={d} 
                    variant={difficulty === d ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setDifficulty(d as 'Easy' | 'Medium' | 'Hard')}
                    className="transition-all"
                  >
                    <ChefHat className="mr-2 h-4 w-4" /> {d}
                  </Button>
                ))}
                 <Button 
                    variant={difficulty === '' ? "secondary" : "outline"}
                    size="sm" 
                    onClick={() => setDifficulty('')}
                    className="transition-all text-xs"
                  >
                    Any / Clear
                  </Button>
              </div>
            </div>
          </CardContent>
        );
      
      default:
        return null;
    }
  };
  
  // Render loading state ONLY for preferences, rely on AuthWrapper for auth loading
  if (generating) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[400px]"> 
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Generating Recipes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="shadow-lg border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-white">
            Generate Your Recipe
          </CardTitle>
          <div className="pt-4">
            <Progress value={(step / totalSteps) * 100} className="w-full" />
            <p className="text-sm text-center mt-2 text-gray-600 dark:text-gray-400">
              Step {step} of {totalSteps}
            </p>
          </div>
        </CardHeader>
        
        {getStepContent()}

        <CardFooter className="flex flex-col items-center space-y-4 pt-6">
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
              {error.includes("Failed to generate recipes") && retryCount < maxRetries && (
                 <Button onClick={retryGeneration} variant="outline" size="sm" className="mt-2">
                   <RefreshCw className="mr-2 h-4 w-4" /> Retry Generation
                 </Button>
              )}
            </Alert>
          )}

          <div className="flex justify-between w-full">
            <Button 
              onClick={prevStep} 
              disabled={step === 1 || generating}
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            <Button 
              onClick={nextStep} 
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                step === totalSteps ? 'Generate Recipe' : 'Next'
              )}
              {step < totalSteps && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function GenerateRecipesPage() {
  const { currentUser, loading: authLoading, refreshUser } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(false);
  const [forceContinue, setForceContinue] = useState(false);
  const [userChecked, setUserChecked] = useState(false);

  // Force check auth state at startup
  useEffect(() => {
    const checkUserAuth = async () => {
      if (!userChecked) {
        console.log("[GeneratePage] Doing initial auth check");
        await refreshUser();
        setUserChecked(true);
      }
    };
    
    checkUserAuth();
  }, [refreshUser, userChecked]);

  // Force continue after 5 seconds if still loading (safety measure)
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      if (loadingPreferences) {
        console.log("[GeneratePage] Force continuing after timeout");
        setForceContinue(true);
        setLoadingPreferences(false);
      }
    }, 5000);

    return () => clearTimeout(forceTimeout);
  }, [loadingPreferences]);

  // Reset loading state when user changes
  useEffect(() => {
    if (userChecked && !authLoading && currentUser) {
      console.log("[GeneratePage] User state changed, reloading preferences");
      setLoadingPreferences(true);
      setPreferencesError(false);
    }
  }, [currentUser, authLoading, userChecked]);

  // useEffect to load preferences after auth is complete
  useEffect(() => {
    const loadUserPreferences = async () => {
      const userUid = currentUser?.uid; // Capture uid for logging stability
      if (!userUid) { 
        setPreferencesError(true); 
        setLoadingPreferences(false);
        console.error("[GeneratePage] Attempted to load preferences without user ID");
        return;
      }
      
      console.log(`[GeneratePage] Starting preference load for user: ${userUid}`);
      setLoadingPreferences(true);
      setPreferencesError(false);
      
      const loadTimeoutMs = 5000; // 5 second timeout (reduced from 10s)
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        const prefsPromise = getUserPreferences(userUid);

        const timeoutPromise = new Promise<never>((_, reject) => { // Promise that rejects on timeout
           timeoutId = setTimeout(() => {
            console.error(`[GeneratePage] Preference load timed out after ${loadTimeoutMs}ms for user: ${userUid}`);
            reject(new Error("Loading user data timed out."));
          }, loadTimeoutMs);
        });

        // Race the actual fetch against the timeout
        const prefs = await Promise.race([prefsPromise, timeoutPromise]);
        
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout if prefsPromise won

        console.log(`[GeneratePage] Preference load successful for user: ${userUid}. Found prefs: ${!!prefs}`);
        setPreferences(prefs || { 
            ingredients: [], equipment: [], staples: [], dietaryPrefs: [], 
            cuisine: undefined, cookTime: undefined, difficulty: undefined
        }); 
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout if it's still pending on error
        
        console.error(`[GeneratePage] Preference load failed for user: ${userUid}`, error);
        
        // Don't show error for timeout - just proceed with empty preferences
        if (error.message === "Loading user data timed out.") {
          console.log("[GeneratePage] Using empty preferences after timeout");
          setPreferences({ 
            ingredients: [], equipment: [], staples: [], dietaryPrefs: [], 
            cuisine: undefined, cookTime: undefined, difficulty: undefined
          });
        } else {
          setPreferencesError(true);
          toast.error('Failed to load your preferences', {
            description: 'Please refresh the page or try again later.'
          });
          setPreferences(null); // Set preferences to null on error to avoid rendering form with bad data
        }
      } finally {
        console.log(`[GeneratePage] Setting loadingPreferences to false for user: ${userUid}`);
        setLoadingPreferences(false);
      }
    };

    console.log(`[GeneratePage] Effect check - authLoading: ${authLoading}, currentUser: ${!!currentUser}, userChecked: ${userChecked}`);
    
    // Only load preferences when auth is complete and we have a user
    if (userChecked && !authLoading && currentUser) {
      loadUserPreferences();
    } else if (userChecked && !authLoading && !currentUser) {
      console.log("[GeneratePage] Auth loaded, no user. Setting loadingPreferences false.");
      setLoadingPreferences(false);
    }
  }, [authLoading, currentUser, userChecked]);

  // If we need to force continue without preferences, create empty ones
  useEffect(() => {
    if (forceContinue && !preferences) {
      console.log("[GeneratePage] Force continuing with empty preferences");
      setPreferences({ 
        ingredients: [], equipment: [], staples: [], dietaryPrefs: [], 
        cuisine: undefined, cookTime: undefined, difficulty: undefined
      });
    }
  }, [forceContinue, preferences]);

  // AuthWrapper handles the main auth loading/redirect
  return (
    <AuthWrapper>
      <MainLayout>
        {/* Show loader while preferences are loading */}
        {loadingPreferences && !forceContinue && (
           <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[400px]"> 
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading User Data...</p>
             </div>
           </div>
        )}

        {/* Show error if preferences failed to load */}
        {!loadingPreferences && preferencesError && !forceContinue && (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error loading your saved preferences. Please refresh the page or try again later.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Render GenerateRecipes when preferences are loaded or we're forcing render with empty preferences */}
        {(!loadingPreferences && !preferencesError && preferences) || (forceContinue && preferences) ? (
          <GenerateRecipes initialPreferences={preferences} />
        ) : null}
      </MainLayout>
    </AuthWrapper>
  );
}
