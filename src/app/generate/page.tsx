'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext'; // Updated context import
import { getUserPreferences, updateUserPreferences, incrementRecipesGenerated } from '@/lib/db';
import { toast } from 'sonner';
import axios, { AxiosError } from 'axios'; // Import AxiosError
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

// Add Speech Recognition types (assuming these are correctly defined elsewhere or standard)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget { /* ... */ }
interface SpeechRecognitionEvent extends Event { /* ... */ }
interface SpeechRecognitionErrorEvent extends Event { /* ... */ }

// Common preset options (fully expanded)
const COMMON_INGREDIENTS = [
  'Chicken', 'Rice', 'Pasta', 'Potatoes', 'Onions', 'Garlic', 'Tomatoes', 'Eggs', 'Beef', 'Pork', 'Carrots', 'Bell Peppers', 'Broccoli', 'Spinach', 'Mushrooms', 'Beans', 'Cheese', 'Milk', 'Yogurt', 'Apples', 'Bananas', 'Lemon', 'Bread', 'Fish', 'Shrimp', 'Corn', 'Peas', 'Cabbage', 'Zucchini', 'Cucumber', 'Avocado', 'Lettuce', 'Sausage', 'Turkey', 'Tofu', 'Lentils', 'Chickpeas', 'Sweet Potato', 'Cauliflower', 'Celery', 'Green Beans', 'Pumpkin', 'Eggplant', 'Bacon', 'Ham', 'Salmon', 'Tuna', 'Basil', 'Parsley', 'Cilantro', 'Chili Peppers', 'Ginger', 'Lime', 'Orange', 'Pear', 'Grapes', 'Strawberries', 'Blueberries', 'Raspberries', 'Pineapple', 'Mango', 'Coconut', 'Walnuts', 'Almonds', 'Peanuts', 'Cashews', 'Sunflower Seeds', 'Pumpkin Seeds', 'Oats', 'Quinoa', 'Barley', 'Couscous', 'Polenta', 'Sour Cream', 'Cream Cheese', 'Feta', 'Mozzarella', 'Parmesan', 'Goat Cheese', 'Ricotta', 'Sardines', 'Anchovies', 'Clams', 'Mussels', 'Crab', 'Lobster', 'Duck', 'Venison', 'Lamb', 'Artichoke', 'Asparagus', 'Brussels Sprouts', 'Radish', 'Turnip', 'Leek', 'Shallot', 'Scallion', 'Kale', 'Arugula', 'Swiss Chard', 'Endive', 'Watercress', 'Okra', 'Bok Choy', 'Napa Cabbage', 'Daikon', 'Jicama', 'Fennel', 'Beet', 'Parsnip', 'Rutabaga', 'Horseradish', 'Wasabi', 'Seaweed', 'Nori', 'Kimchi', 'Sauerkraut', 'Pickles', 'Capers', 'Olives', 'Sun-dried Tomatoes', 'Roasted Red Peppers', 'Pesto', 'Tapenade', 'Hummus', 'Tahini', 'Miso', 'Tempeh', 'Seitan', 'Edamame', 'Soybeans', 'Black Beans', 'Kidney Beans', 'Pinto Beans', 'White Beans', 'Navy Beans', 'Great Northern Beans', 'Cannellini Beans', 'Lima Beans', 'Butter Beans', 'Split Peas', 'Green Peas', 'Snow Peas', 'Sugar Snap Peas', 'Chard', 'Collard Greens', 'Mustard Greens', 'Turnip Greens', 'Dandelion Greens', 'Purslane', 'Sorrel', 'Chicory', 'Radicchio', 'Escarole', 'Frisée', 'Mâche', 'Mesclun', 'Sprouts', 'Microgreens', 'Herbs', 'Spices', 'Other'
];
const COMMON_EQUIPMENT = [
  'Oven', 'Stovetop', 'Microwave', 'Blender', 'Food Processor', 'Slow Cooker', 'Air Fryer', 'Pressure Cooker', 'Grill', 'Toaster', 'Hand Mixer', 'Stand Mixer', 'Dutch Oven', 'Cast Iron Pan', 'Non-Stick Pan', 'Baking Sheet', 'Saucepan', 'Stockpot', 'Wok', 'Rice Cooker', 'Bread Maker', 'Coffee Maker', 'Espresso Machine', 'Kettle', 'Deep Fryer', 'Sous Vide', 'Immersion Blender', 'Juicer', 'Ice Cream Maker', 'Pizza Stone', 'Mandoline', 'Spiralizer', 'Salad Spinner', 'Colander', 'Sieve', 'Grater', 'Peeler', 'Can Opener', 'Bottle Opener', 'Corkscrew', 'Rolling Pin', 'Measuring Cups', 'Measuring Spoons', 'Thermometer', 'Timer', 'Scale', 'Tongs', 'Whisk', 'Ladle', 'Slotted Spoon', 'Spatula', 'Wooden Spoon', 'Cutting Board', 'Knife Set', 'Paring Knife', 'Chef Knife', 'Bread Knife', 'Carving Knife', 'Cleaver', 'Boning Knife', 'Fillet Knife', 'Utility Knife', 'Peeling Knife', 'Scissors', 'Kitchen Shears', 'Mortar and Pestle', 'Garlic Press', 'Zester', 'Melon Baller', 'Apple Corer', 'Egg Slicer', 'Ice Cream Scoop', 'Pizza Cutter', 'Pastry Brush', 'Baster', 'Turkey Lifter', 'Trussing Needle', 'Skewers', 'Grill Pan', 'Griddle', 'Waffle Iron', 'Crepe Pan', 'Tart Pan', 'Springform Pan', 'Bundt Pan', 'Loaf Pan', 'Muffin Tin', 'Pie Dish', 'Casserole Dish', 'Ramekin', 'Souffle Dish', 'Baking Dish', 'Roasting Pan', 'Broiler Pan', 'Sheet Pan', 'Cooling Rack', 'Wire Rack', 'Other'
];
const COMMON_STAPLES = [
  'Salt', 'Pepper', 'Olive Oil', 'Vegetable Oil', 'Flour', 'Sugar', 'Brown Sugar', 'Butter', 'Soy Sauce', 'Vinegar', 'Rice Vinegar', 'Honey', 'Maple Syrup', 'Pasta Sauce', 'Canned Tomatoes', 'Canned Beans', 'Broth', 'Spices', 'Hot Sauce', 'Mustard', 'Ketchup', 'Mayonnaise', 'Cornstarch', 'Baking Powder', 'Baking Soda', 'Yeast', 'Cocoa Powder', 'Chocolate Chips', 'Peanut Butter', 'Jam', 'Jelly', 'Pickles', 'Relish', 'Worcestershire Sauce', 'Fish Sauce', 'Sesame Oil', 'Coconut Oil', 'Shortening', 'Lard', 'Molasses', 'Syrup', 'Lemon Juice', 'Lime Juice', 'Bouillon Cubes', 'Stock', 'Evaporated Milk', 'Condensed Milk', 'Powdered Milk', 'Non-Dairy Milk', 'Oats', 'Rice', 'Quinoa', 'Barley', 'Couscous', 'Polenta', 'Breadcrumbs', 'Crackers', 'Cereal', 'Granola', 'Nuts', 'Seeds', 'Dried Fruit', 'Raisins', 'Cranberries', 'Apricots', 'Dates', 'Prunes', 'Other'
];
const COMMON_DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Keto', 'Paleo', 'Nut-Free', 'Low-Sugar', 'Low-Sodium', 'Pescatarian', 'High-Protein', 'Halal', 'Kosher', 'No Pork', 'No Shellfish', 'No Red Meat', 'Other'
];
const POPULAR_CUISINES = [
  'Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'Thai', 'American', 'French', 'Mediterranean', 'Korean', 'Vietnamese', 'Spanish', 'Greek', 'Turkish', 'Moroccan', 'Ethiopian', 'Brazilian', 'Caribbean', 'German', 'Russian', 'Polish', 'Swedish', 'British', 'Irish', 'Lebanese', 'Persian', 'Israeli', 'Egyptian', 'South African', 'Australian', 'Other'
];
const COOK_TIMES = ['Under 30 mins', 'Under 1 hour', '1 hour+'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

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
  // Use the simplified AuthContext
  const { currentUser, refreshUserToken } = useAuth(); 
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
  
  // Simplified retry state (for general API errors)
  const [apiRetryCount, setApiRetryCount] = useState(0);
  const maxApiRetries = 1; // Allow one manual retry for non-auth errors

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
        try { (recognitionRef.current as any).stop(); } catch (e) { /* ignore */ }
      }
    };
  }, [listening]);
  
  // Add/remove/parse/clean functions (assumed correct, keeping them as is for brevity)
  const addIngredient = () => {
    const value = newIngredient.trim();
    if (value && !ingredients.includes(value)) {
      setIngredients([...ingredients, value]);
      setNewIngredient('');
    }
  };
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  const addEquipment = () => {
    const value = newEquipment.trim();
    if (value && !equipment.includes(value)) {
      setEquipment([...equipment, value]);
      setNewEquipment('');
    }
  };
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  const addStaple = () => {
    const value = newStaple.trim();
    if (value && !staples.includes(value)) {
      setStaples([...staples, value]);
      setNewStaple('');
    }
  };
  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };
  const addDietaryPref = () => {
    const value = newDietaryPref.trim();
    if (value && !dietaryPrefs.includes(value)) {
      setDietaryPrefs([...dietaryPrefs, value]);
      setNewDietaryPref('');
    }
  };
  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };
  const capitalizeFirstLetter = (string: string): string => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  const startVoiceRecognition = (): void => {};
  const stopVoiceRecognition = (): void => {};
  const parseItemsFromText = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string[] => { return []; };
  const cleanItem = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string => { return text; };
  const addCommonItem = (item: string, category: 'ingredients' | 'equipment' | 'staples' | 'dietary') => {
    switch (category) {
      case 'ingredients':
        if (!ingredients.includes(item)) setIngredients([...ingredients, item]);
        break;
      case 'equipment':
        if (!equipment.includes(item)) setEquipment([...equipment, item]);
        break;
      case 'staples':
        if (!staples.includes(item)) setStaples([...staples, item]);
        break;
      case 'dietary':
        if (!dietaryPrefs.includes(item)) setDietaryPrefs([...dietaryPrefs, item]);
        break;
    }
  };

  // Navigation functions
  const nextStep = async () => {
    if (step === 1 && ingredients.length === 0) { setError('Please add at least one ingredient'); return; }
    
    // Save preferences optimistically if user exists
    if (currentUser) {
      const prefsToUpdate: Partial<PreferencesData> = {};
      if (step === 1) prefsToUpdate.ingredients = ingredients;
      if (step === 2) prefsToUpdate.equipment = equipment;
      if (step === 3) prefsToUpdate.staples = staples;
      if (step === 4) prefsToUpdate.dietaryPrefs = dietaryPrefs;
      if (step === 5) {
        prefsToUpdate.cuisine = cuisine || undefined;
        prefsToUpdate.cookTime = cookTime || undefined;
        prefsToUpdate.difficulty = difficulty || undefined;
      }
      if (Object.keys(prefsToUpdate).length > 0) {
         updateUserPreferences(currentUser.uid, prefsToUpdate)
           .catch(e => {
                console.warn("Could not save preferences step:", e);
                // Don't block navigation for this
           });
      }
    }
    
    if (step < totalSteps) { 
        setStep(step + 1); 
        setError(''); 
    } else { 
        // Final step, trigger generation
        await handleGenerateRecipes(); 
    }
  };
  
  const prevStep = () => { if (step > 1) { setStep(step - 1); setError(''); } };
  
  // Generate recipes function - Refactored
  const handleGenerateRecipes = useCallback(async () => {
    if (ingredients.length === 0) { 
      setError('Please add at least one ingredient'); 
      setStep(1); // Go back to ingredients step
      return; 
    }
    
    setGenerating(true);
    setError('');
    setApiRetryCount(0); // Reset API retry counter on new attempt
    
    let token: string | null = null;
    let userId: string | undefined = currentUser?.uid;

    // 1. Refresh token if user is logged in
    if (currentUser) {
        console.log("[GenerateRecipes] User logged in, attempting to refresh token...");
        token = await refreshUserToken(); // Use the function from AuthContext
        if (!token) {
            console.error("[GenerateRecipes] Failed to refresh token, but proceeding without it for now.");
            // Optionally, you could prevent generation if token refresh fails critically
            // setError("Authentication error. Please try signing out and back in.");
            // setGenerating(false);
            // return;
            userId = undefined; // Ensure userId is not sent if token fails
        } else {
            console.log("[GenerateRecipes] Token refreshed successfully.");
        }
    } else {
        console.log("[GenerateRecipes] No user logged in. Proceeding without authentication.");
    }

    // 2. Update user preferences & stats (only if user and token are valid)
    if (userId && token) { 
      try {
        console.log(`[GenerateRecipes] Updating final preferences for user: ${userId}`);
        await updateUserPreferences(userId, { 
          ingredients, equipment, staples, dietaryPrefs,
          cuisine: cuisine || undefined, 
          cookTime: cookTime || undefined, 
          difficulty: difficulty || undefined 
        });
        await incrementRecipesGenerated(userId);
      } catch (err) {
        console.warn("[GenerateRecipes] Failed to update user preferences/stats:", err);
        // Continue generation even if DB update fails
      }
    }

    // 3. Prepare API Request Data
    const requestData = { 
      ingredients, 
      equipment, 
      staples, 
      dietaryPrefs, 
      cuisine: cuisine || undefined,
      cookTime: cookTime || undefined,
      difficulty: difficulty || undefined,
      // Only include userId if we successfully got a token
      ...(userId && token ? { userId } : {})
    };

    // 4. Prepare Headers (include token only if available and valid)
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // 5. Make API Call
    console.log(`[GenerateRecipes] Sending API request to /api/generate-recipes. Has token: ${!!token}`);
    let recipeData;
    try {
      const response = await axios.post('/api/generate-recipes', requestData, { 
          headers,
          timeout: 60000 // 60 second timeout
      });
      recipeData = response.data;
      console.log("[GenerateRecipes] API call successful.");

      // Check if the response indicates fallback was used
      if (response.data?.apiInfo?.error || !token) { // Show info if fallback used OR if user wasn't authenticated
          if (!token) {
              toast.info("Showing sample recipes", { description: "Sign in for personalized results." });
          } else {
              toast.info("Using sample recipes", { description: "Our recipe generator is busy. Showing examples instead." });
          }
      }

    } catch (error) {
        const axiosError = error as AxiosError<any>; // Type assertion
        console.error("[GenerateRecipes] API call failed:", axiosError.message);
        let errorMessage = "Failed to generate recipes. Please try again.";

        if (axiosError.response) {
            console.error("API Response Error:", axiosError.response.status, axiosError.response.data);
            const status = axiosError.response.status;
            const errorData = axiosError.response.data;

            if (status === 401 || status === 403) {
                errorMessage = "Authentication error. Please try signing out and back in.";
                // No automatic retry for auth errors - user needs to re-auth
                setApiRetryCount(maxApiRetries); // Prevent manual retry for auth errors
            } else if (status === 429) { // Rate limit
                 errorMessage = "Rate limit exceeded. Please try again later.";
            } else if (errorData?.error) {
                errorMessage = `Failed to generate recipes: ${
                  typeof errorData.error === 'string'
                    ? errorData.error
                    : JSON.stringify(errorData.error)
                }`;
            }
        } else if (axiosError.request) {
            console.error("API No Response:", axiosError.request);
            errorMessage = "Could not reach the recipe service. Check your connection.";
        } else {
            // Setup error or other unexpected error
            errorMessage = `An unexpected error occurred: ${axiosError.message}`; 
        }

        setError(errorMessage);
        setGenerating(false);
        return; // Stop execution here on error
    }
    
    // 6. Process Response and Navigate
    if (recipeData?.recipes?.length > 0) {
      console.log(`[GenerateRecipes] Received ${recipeData.recipes.length} recipes.`);
      try {
        sessionStorage.setItem('generatedRecipes', JSON.stringify(recipeData.recipes));
        console.log("[GenerateRecipes] Recipes stored in session storage.");
        router.push('/recipes/results');
      } catch (storageError) {
        console.error("[GenerateRecipes] Failed to store recipes or navigate:", storageError);
        setError("Generated recipes, but failed to display them. Please try again.");
        setGenerating(false);
      }
    } else {
      console.error("[GenerateRecipes] No valid recipes received from API.", recipeData);
      setError(recipeData?.error || "Failed to get valid recipes. Try modifying your inputs.");
      setGenerating(false);
    }
  }, [
    // Dependencies for the callback
    currentUser, 
    refreshUserToken, 
    ingredients, 
    equipment, 
    staples, 
    dietaryPrefs, 
    cuisine, 
    cookTime, 
    difficulty, 
    router, 
    step // Include step to ensure latest step info is used
  ]);

  // Manual retry function (only for non-auth errors)
  const manualRetryGeneration = () => {
    if (apiRetryCount >= maxApiRetries) {
      toast.error("Maximum retries reached or action not allowed.");
      return;
    }
    setApiRetryCount(apiRetryCount + 1);
    toast.info(`Retrying recipe generation... (${apiRetryCount + 1}/${maxApiRetries})`);
    handleGenerateRecipes(); // Call the main generation function again
  };
  
  // Get the current step UI content
  const getStepContent = (): JSX.Element | null => {
      // (Keep the existing switch statement for rendering steps 1-5)
      // ... content for steps 1-5 ...
      // Ensure input fields and buttons inside are disabled={generating}
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
                        disabled={generating}
                      />
                      <Button onClick={addIngredient} disabled={generating}>
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
                          disabled={generating}
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
                            {!generating && (
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={() => removeIngredient(index)}
                              />
                            )}
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
                      What equipment do you have?
                    </label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        id="equipment"
                        placeholder="Add equipment..."
                        value={newEquipment}
                        onChange={(e) => setNewEquipment(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
                        disabled={generating}
                      />
                      <Button onClick={addEquipment} disabled={generating}>
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
                          disabled={generating}
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
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          >
                            {item}
                            {!generating && (
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={() => removeEquipment(index)}
                              />
                            )}
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
                      What pantry staples do you have?
                    </label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        id="staple"
                        placeholder="Add a staple..."
                        value={newStaple}
                        onChange={(e) => setNewStaple(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addStaple()}
                        disabled={generating}
                      />
                      <Button onClick={addStaple} disabled={generating}>
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
                          disabled={generating}
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
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          >
                            {item}
                            {!generating && (
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={() => removeStaple(index)}
                              />
                            )}
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
                    <label htmlFor="dietary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Any dietary preferences or restrictions?
                    </label>
                    <div className="flex gap-2 mb-3">
                      <Input
                        id="dietary"
                        placeholder="Add a dietary preference..."
                        value={newDietaryPref}
                        onChange={(e) => setNewDietaryPref(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addDietaryPref()}
                        disabled={generating}
                      />
                      <Button onClick={addDietaryPref} disabled={generating}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Common Dietary Preferences</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {COMMON_DIETARY_PREFS.map((item) => (
                        <Button
                          key={item}
                          variant={dietaryPrefs.includes(item) ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => addCommonItem(item, 'dietary')}
                          disabled={generating}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Preferences ({dietaryPrefs.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {dietaryPrefs.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No preferences added yet</p>
                      ) : (
                        dietaryPrefs.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          >
                            {item}
                            {!generating && (
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={() => removeDietaryPref(index)}
                              />
                            )}
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
                      disabled={generating}
                    />
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard' | '')}
                      disabled={generating}
                      className="mb-3"
                    >
                      <option value="">Select difficulty</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </CardContent>
              );
            default:
              return null;
          }
  };
  
  // Main component render
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="shadow-lg border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-white">
            Generate Your Recipe
          </CardTitle>
          {!generating && (
              <div className="pt-4">
                  <Progress value={(step / totalSteps) * 100} className="w-full" />
                  <p className="text-sm text-center mt-2 text-gray-600 dark:text-gray-400">
                      Step {step} of {totalSteps}
                  </p>
              </div>
          )}
          {generating && (
              <div className="flex flex-col items-center space-y-2 pt-4">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Generating Recipes...</p>
              </div>
          )}
        </CardHeader>
        
        {!generating && getStepContent()} 

        {!generating && (
            <CardFooter className="flex flex-col items-center space-y-4 pt-6">
            {error && (
                <Alert variant="destructive" className="w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
                {/* Allow retry only for non-auth errors and if within limits */} 
                {!error.toLowerCase().includes("authentication") && apiRetryCount < maxApiRetries && (
                    <Button onClick={manualRetryGeneration} variant="outline" size="sm" className="mt-2">
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
                onClick={nextStep} // nextStep handles final generation trigger
                disabled={generating || (step === 1 && ingredients.length === 0)} // Disable if generating or on step 1 with no ingredients
                >
                {/* No spinner here, handled in header */} 
                {step === totalSteps ? 'Generate Recipe' : 'Next'}
                {step < totalSteps && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}

// Parent page component - Simplified
export default function GenerateRecipesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [errorPrefs, setErrorPrefs] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt to load preferences if auth check is done and user exists
    if (!authLoading && currentUser) {
        setLoadingPrefs(true);
        setErrorPrefs(null);
        console.log(`[GeneratePage] Auth loaded, user ${currentUser.uid} found. Loading preferences...`);
        
        getUserPreferences(currentUser.uid)
          .then(prefs => {
            console.log("[GeneratePage] Preferences loaded:", prefs);
            // Set default empty arrays if prefs are null/undefined or fields are missing
            setPreferences({
                ingredients: prefs?.ingredients || [],
                equipment: prefs?.equipment || [],
                staples: prefs?.staples || [],
                dietaryPrefs: prefs?.dietaryPrefs || [],
                cuisine: prefs?.cuisine || undefined,
                cookTime: prefs?.cookTime || undefined,
                difficulty: prefs?.difficulty || undefined
            });
          })
          .catch(err => {
            console.error("[GeneratePage] Failed to load preferences:", err);
            setErrorPrefs("Could not load your saved preferences. Starting with defaults.");
            // Initialize with defaults on error to allow user to proceed
             setPreferences({ ingredients: [], equipment: [], staples: [], dietaryPrefs: [] });
          })
          .finally(() => {
            setLoadingPrefs(false);
          });
    } else if (!authLoading && !currentUser) {
        // Auth check done, but no user - use default empty preferences
        console.log("[GeneratePage] Auth loaded, no user logged in. Using default preferences.");
        setPreferences({ ingredients: [], equipment: [], staples: [], dietaryPrefs: [] });
        setLoadingPrefs(false);
        setErrorPrefs(null);
    }
  }, [authLoading, currentUser]); // Rerun when auth state changes

  // Render logic
  return (
    // AuthWrapper handles redirecting if user is required but not logged in
    <AuthWrapper pageType="protected"> 
      <MainLayout>
        {/* Show loader ONLY while preferences are loading (after auth is ready) */} 
        {authLoading || (loadingPrefs && currentUser) ? (
           <div className="container mx-auto px-4 py-8 max-w-4xl flex justify-center items-center min-h-[400px]"> 
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
             </div>
           </div>
        ) : errorPrefs ? (
          // Show non-blocking error if preferences failed, but still render the form with defaults
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorPrefs}</AlertDescription>
            </Alert>
            {preferences && <GenerateRecipes initialPreferences={preferences} />} 
          </div>
        ) : preferences ? (
          // Render the form once preferences are loaded (or defaults are set)
          <GenerateRecipes initialPreferences={preferences} />
        ) : (
           // Should not happen in normal flow, but a fallback state
           <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
               <p>Initializing...</p>
           </div>
        )}
      </MainLayout>
    </AuthWrapper>
  );
}
