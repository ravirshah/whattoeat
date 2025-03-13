// src/pages/generate-recipes.tsx
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
} from 'lucide-react';

const COMMON_INGREDIENTS = [
  'Chicken', 'Rice', 'Pasta', 'Potatoes', 'Onions', 'Garlic',
  'Tomatoes', 'Eggs', 'Beef', 'Pork', 'Carrots', 'Bell Peppers',
  'Broccoli', 'Spinach', 'Mushrooms', 'Beans', 'Cheese',
];

const COMMON_EQUIPMENT = [
  'Oven', 'Stovetop', 'Microwave', 'Blender', 'Slow Cooker',
  'Air Fryer', 'Pressure Cooker', 'Grill', 'Toaster',
  'Cast Iron Pan', 'Non-Stick Pan', 'Baking Sheet',
];

const COMMON_STAPLES = [
  'Salt', 'Pepper', 'Olive Oil', 'Vegetable Oil', 'Flour',
  'Sugar', 'Butter', 'Soy Sauce', 'Vinegar', 'Honey',
  'Pasta Sauce', 'Canned Tomatoes', 'Spices',
];

const COMMON_DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Low-Carb', 'Keto', 'Paleo', 'Nut-Free', 'Low-Sugar',
];

function GenerateRecipes() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(isSupported);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && listening) {
        recognitionRef.current.stop();
      }
    };
  }, [listening]);

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
        toast.error('Failed to load preferences', { description: 'Using defaults' });
      } finally {
        setLoadingPreferences(false);
      }
    };
    if (!authLoading) loadUserPreferences();
  }, [currentUser, authLoading]);

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addEquipment = () => {
    if (newEquipment.trim() && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const addStaple = () => {
    if (newStaple.trim() && !staples.includes(newStaple.trim())) {
      setStaples([...staples, newStaple.trim()]);
      setNewStaple('');
    }
  };

  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };

  const addDietaryPref = () => {
    if (newDietaryPref.trim() && !dietaryPrefs.includes(newDietaryPref.trim())) {
      setDietaryPrefs([...dietaryPrefs, newDietaryPref.trim()]);
      setNewDietaryPref('');
    }
  };

  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };

  const capitalizeFirstLetter = (string: string): string => {
    return string
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const startVoiceRecognition = () => {
    if (!speechSupported) {
      toast.error('Voice recognition not supported');
      return;
    }
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Voice recognition unavailable');
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

      const category = step === 1 ? 'ingredients' : step === 2 ? 'equipment' : 'staples';
      const categoryDisplayName = category === 'ingredients' ? 'ingredient' : category === 'equipment' ? 'equipment item' : 'staple item';

      recognition.onresult = (event) => {
        const transcriptText = event.results[event.results.length - 1][0].transcript;
        setTranscript(transcriptText);
        const parsedItems = parseItemsFromText(transcriptText, category);
        if (parsedItems.length > 0) {
          if (category === 'ingredients') {
            setIngredients((prev) => [...prev, ...parsedItems.filter((item) => !prev.includes(item)).map(capitalizeFirstLetter)]);
          } else if (category === 'equipment') {
            setEquipment((prev) => [...prev, ...parsedItems.filter((item) => !prev.includes(item)).map(capitalizeFirstLetter)]);
          } else {
            setStaples((prev) => [...prev, ...parsedItems.filter((item) => !prev.includes(item)).map(capitalizeFirstLetter)]);
          }
          toast.success(`Added ${parsedItems.length} ${categoryDisplayName}${parsedItems.length === 1 ? '' : 's'}: ${parsedItems.join(', ')}`, { duration: 4000 });
        } else {
          toast.error(`No ${categoryDisplayName}s detected`);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setListening(false);
        recognitionRef.current = null;
        if (event.error === 'not-allowed') toast.error('Microphone access denied');
        else if (event.error === 'no-speech') toast.error('No speech detected');
        else toast.error('Voice recognition error');
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (error) {
      console.error('Speech recognition error', error);
      setListening(false);
      recognitionRef.current = null;
      toast.error('Could not start voice recognition');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      recognitionRef.current = null;
      if (transcript) toast.info('Voice recognition stopped');
    }
  };

  const parseItemsFromText = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string[] => {
    try {
      let normalizedText = text.toLowerCase();
      if (category === 'ingredients') {
        normalizedText = normalizedText
          .replace(/\bhalf\b/g, '1/2')
          .replace(/\bhalf a\b/g, '1/2')
          .replace(/\bquarter\b/g, '1/4')
          .replace(/\bthird\b/g, '1/3')
          .replace(/\bthree quarters\b/g, '3/4')
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
      const explicitSplits = normalizedText.split(/(?:,|\band\b|\balso\b|\bplus\b|\bthen\b)\s*/i);
      let items: string[] = [];
      for (let chunk of explicitSplits) {
        chunk = chunk.replace(/\b(?:uhh?|umm?|err?|like|maybe|i think|i have|i've got|got|have)\b/gi, '');
        if (category === 'ingredients') {
          const someBasedChunks = chunk.split(/\bsome\b/i).map((part) => part.trim()).filter(Boolean);
          if (someBasedChunks.length > 1) {
            for (let part of someBasedChunks) {
              if (part) items.push(cleanItem(part, category));
            }
          } else {
            const quantityMatch = chunk.match(/^(\d+(?:\/\d+)?)\s+([a-z\s]+)$/);
            if (quantityMatch) {
              items.push(`${quantityMatch[1]} ${quantityMatch[2].trim()}`);
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
      return items.filter((i) => i.length > 0);
    } catch (error) {
      console.error('Error parsing speech:', error);
      return [];
    }
  };

  const cleanItem = (text: string, category: 'ingredients' | 'equipment' | 'staples'): string => {
    let cleaned = text.replace(/^\s*(?:a|an|the|some|few|little)\s+/i, '');
    if (category === 'ingredients') {
      cleaned = cleaned.replace(/\b(head|bunch|clove|piece)s?\s+of\s+/i, '');
      cleaned = cleaned.replace(/\ba\s+(?:little|bit\s+of)\s+/i, '');
    } else if (category === 'equipment') {
      cleaned = cleaned.replace(/\bmy\s+/i, '');
      cleaned = cleaned.replace(/\bi\s+(?:use|have|own)\s+(?:a|an|the)?\s*/i, '');
    } else {
      cleaned = cleaned.replace(/\balways\s+(?:have|keep)\s+/i, '');
      cleaned = cleaned.replace(/\bin\s+(?:my|the)\s+pantry\b/i, '');
    }
    return cleaned.trim();
  };

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

  const nextStep = async () => {
    if (step === 1 && ingredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }
    if (currentUser) {
      try {
        await updateUserPreferences(currentUser.uid, { ingredients, equipment, staples, dietaryPrefs });
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
      setError('You must be logged in');
      router.push('/signin');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      incrementRecipesGenerated(currentUser.uid).catch((err) => console.error('Failed to increment count:', err));
      const token = await currentUser.getIdToken();
      if (!token) throw new Error('Failed to get auth token');
      const requestData = { ingredients, equipment, staples, dietaryPrefs };
      console.log('Sending API request:', {
        ingredientsCount: ingredients.length,
        equipmentCount: equipment.length,
        staplesCount: staples.length,
        dietaryPrefsCount: dietaryPrefs.length,
      });
      const response = await axios.post('/api/generate-recipes', requestData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      });
      if (response.data && response.data.recipes && response.data.recipes.length > 0) {
        console.log(`Received ${response.data.recipes.length} recipes`);
        if (response.data.apiInfo) {
          console.log('Using fallback recipes:', response.data.apiInfo.error);
          toast.info('Using sample recipes', { description: 'Showing examples due to system load' });
        }
        sessionStorage.setItem('generatedRecipes', JSON.stringify(response.data.recipes));
        sessionStorage.setItem('isFallbackRecipes', response.data.apiInfo ? 'true' : 'false');
        setRetryCount(0);
        router.push('/recipes/results');
      } else {
        throw new Error('No recipes returned');
      }
    } catch (error: any) {
      console.error('Error generating recipes:', error);
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      if (error.response) {
        console.error('Server error:', error.response.status, error.response.data);
        if (error.response.status === 401) setError('Session expired. Please sign in again.');
        else setError(error.response.data?.error || 'Error with recipe service');
      } else if (error.request) {
        console.error('Network error');
        setError('Network issue. Check your connection.');
      } else {
        console.error('Request setup error:', error.message);
        setError('Failed to create request');
      }
      if (newRetryCount > maxRetries) toast.error('Service unavailable', { description: 'Try again later' });
      setGenerating(false);
    }
  };

  const retryGeneration = () => {
    setGenerating(true);
    setError('');
    generateRecipes();
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return {
          title: 'What ingredients do you have?',
          description: 'Add main ingredients for your recipe.',
          icon: <ShoppingBag className='h-6 w-6' />,
          inputPlaceholder: 'Add an ingredient...',
          inputValue: newIngredient,
          setInputValue: setNewIngredient,
          addItem: addIngredient,
          items: ingredients,
          removeItem: removeIngredient,
          emptyMessage: 'No ingredients added yet',
          badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
          commonItems: COMMON_INGREDIENTS,
          category: 'ingredients' as const,
        };
      case 2:
        return {
          title: 'What cooking equipment do you have?',
          description: 'Add available kitchen equipment.',
          icon: <Utensils className='h-6 w-6' />,
          inputPlaceholder: 'Add equipment...',
          inputValue: newEquipment,
          setInputValue: setNewEquipment,
          addItem: addEquipment,
          items: equipment,
          removeItem: removeEquipment,
          emptyMessage: 'No equipment added yet',
          badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          commonItems: COMMON_EQUIPMENT,
          category: 'equipment' as const,
        };
      case 3:
        return {
          title: 'What staples do you keep?',
          description: 'Add pantry staples you have.',
          icon: <ShoppingBag className='h-6 w-6' />,
          inputPlaceholder: 'Add a staple...',
          inputValue: newStaple,
          setInputValue: setNewStaple,
          addItem: addStaple,
          items: staples,
          removeItem: removeStaple,
          emptyMessage: 'No staples added yet',
          badgeClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
          commonItems: COMMON_STAPLES,
          category: 'staples' as const,
        };
      case 4:
        return {
          title: 'Any dietary preferences?',
          description: 'Add dietary needs or preferences.',
          icon: <AlertTriangle className='h-6 w-6' />,
          inputPlaceholder: 'Add a preference...',
          inputValue: newDietaryPref,
          setInputValue: setNewDietaryPref,
          addItem: addDietaryPref,
          items: dietaryPrefs,
          removeItem: removeDietaryPref,
          emptyMessage: 'No preferences added yet',
          badgeClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          commonItems: COMMON_DIETARY_PREFS,
          category: 'dietary' as const,
        };
      default:
        return {
          title: '',
          description: '',
          icon: null,
          inputPlaceholder: '',
          inputValue: '',
          setInputValue: () => {},
          addItem: () => {},
          items: [],
          removeItem: () => {},
          emptyMessage: '',
          badgeClassName: '',
          commonItems: [],
          category: 'ingredients' as const,
        };
    }
  };

  const stepContent = getStepContent();

  if (authLoading) {
    return (
      <div className='container mx-auto px-4 py-12 flex justify-center items-center'>
        <Loader2 className='h-12 w-12 animate-spin text-emerald-600' />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-12'>
      <Card className='max-w-2xl mx-auto'>
        <CardHeader>
          <div className='flex items-center justify-between mb-2'>
            <CardTitle className='text-2xl font-bold flex items-center'>
              <CookingPot className='mr-2 h-6 w-6 text-emerald-600' />
              Generate Recipes
            </CardTitle>
            <div className='text-sm font-medium text-gray-500'>Step {step} of 4</div>
          </div>
          <Progress value={step * 25} className='h-2' />
        </CardHeader>

        {error && (
          <div className='px-6'>
            <Alert variant='destructive' className='mb-4 flex justify-between items-center'>
              <div className='flex items-center'>
                <AlertCircle className='h-4 w-4 mr-2' />
                <AlertDescription>{error}</AlertDescription>
              </div>
              {retryCount > 0 && retryCount <= maxRetries && (
                <Button variant='outline' size='sm' onClick={retryGeneration} className='ml-2 whitespace-nowrap'>
                  <RefreshCw className='h-4 w-4 mr-1' />
                  Retry
                </Button>
              )}
            </Alert>
          </div>
        )}

        <CardContent className='pt-6'>
          <div className='space-y-6'>
            <div className='flex items-start gap-4'>
              <div className='h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0'>
                {stepContent.icon}
              </div>
              <div>
                <h3 className='text-lg font-medium mb-1'>{stepContent.title}</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400'>{stepContent.description}</p>
              </div>
            </div>

            <div className='flex gap-2'>
              <Input
                type='text'
                value={stepContent.inputValue}
                onChange={(e) => stepContent.setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && stepContent.addItem()}
                placeholder={stepContent.inputPlaceholder}
                className='flex-1'
              />
              <Button onClick={stepContent.addItem}>
                <Plus className='h-4 w-4 mr-1' />
                Add
              </Button>
              {speechSupported && step <= 3 && (
                <Button
                  variant={listening ? 'destructive' : 'outline'}
                  onClick={listening ? stopVoiceRecognition : startVoiceRecognition}
                  className={listening ? 'animate-pulse' : ''}
                >
                  {listening ? (
                    <>
                      <Square className='h-4 w-4 mr-1' />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className='h-4 w-4 mr-1' />
                      Voice
                    </>
                  )}
                </Button>
              )}
            </div>

            {listening && (
              <div className='mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md'>
                <div className='flex items-center space-x-2'>
                  <span className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></span>
                  <p className='text-sm text-red-600 dark:text-red-400'>
                    Listening... Say your {step === 1 ? 'ingredients' : step === 2 ? 'equipment' : 'staples'} and click Stop
                  </p>
                </div>
              </div>
            )}

            {transcript && !listening && (
              <div className='mt-2'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  <span className='font-medium'>Last recording:</span> "{transcript}"
                </p>
              </div>
            )}

            <div className='mt-2'>
              <h4 className='text-sm font-medium mb-2 text-gray-700 dark:text-gray-300'>
                Common{' '}
                {step === 1 ? 'Ingredients' : step === 2 ? 'Equipment' : step === 3 ? 'Staples' : 'Preferences'}
              </h4>
              <div className='flex flex-wrap gap-2'>
                {stepContent.commonItems.map((item) => (
                  <Button
                    key={item}
                    variant='outline'
                    size='sm'
                    onClick={() => addCommonItem(item, stepContent.category)}
                    className={
                      stepContent.items.includes(item)
                        ? `bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 font-medium ${
                            step === 1
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : step === 2
                              ? 'text-blue-600 dark:text-blue-400'
                              : step === 3
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-purple-600 dark:text-purple-400'
                          }`
                        : ''
                    }
                  >
                    {item}
                    {stepContent.items.includes(item) && <span className='ml-1'>✓</span>}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className='text-sm font-medium mb-2 text-gray-700 dark:text-gray-300'>
                {stepContent.items.length > 0
                  ? `Your ${step === 1 ? 'ingredients' : step === 2 ? 'equipment' : step === 3 ? 'staples' : 'preferences'} (${
                      stepContent.items.length
                    })`
                  : ''}
              </h4>
              <div className='flex flex-wrap gap-2'>
                {stepContent.items.length === 0 ? (
                  <p className='text-sm text-gray-500 italic'>{stepContent.emptyMessage}</p>
                ) : (
                  stepContent.items.map((item, index) => (
                    <Badge key={index} variant='outline' className={stepContent.badgeClassName}>
                      {item}
                      <button
                        type='button'
                        onClick={() => stepContent.removeItem(index)}
                        className='ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1'
                      >
                        <X className='h-3 w-3' />
                        <span className='sr-only'>Remove {item}</span>
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className='flex justify-between pt-6'>
          <Button variant='outline' onClick={prevStep} disabled={step === 1}>
            <ChevronLeft className='h-4 w-4 mr-1' />
            Back
          </Button>
          <Button onClick={nextStep} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Generating...
              </>
            ) : step < 4 ? (
              <>
                Next
                <ChevronRight className='h-4 w-4 ml-1' />
              </>
            ) : (
              <>
                Generate Recipes
                <CookingPot className='h-4 w-4 ml-1' />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function GenerateRecipesPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <GenerateRecipes />
      </MainLayout>
    </AuthWrapper>
  );
}
export default function handler(req, res) {
  try {
    // Your recipe generation logic
    res.status(200).json({ recipes: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error generating recipes' });
  }
}


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

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}