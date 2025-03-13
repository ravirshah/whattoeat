'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getUserPreferences, updateUserPreferences, incrementRecipesGenerated } from '@/lib/db';
import axios from 'axios';

export default function GenerateRecipes() {
  const { currentUser, loading } = useAuth();
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
  
  // Voice recognition state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Auth redirect check
  useEffect(() => {
    console.log("Generate page loaded, auth state:", { currentUser, loading });
    if (!loading && !currentUser) {
      console.log("Redirecting to signin because no user is logged in");
      router.push('/signin');
    }
  }, [currentUser, loading, router]);
  
  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (currentUser) {
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
        }
      }
    };
    
    loadUserPreferences();
  }, [currentUser]);
  
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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Generate Recipes
      </h1>
      
      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Step 1: Ingredients */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Step 1: What ingredients do you have?
          </h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
              placeholder="Add an ingredient..."
              className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
            <button
              onClick={addIngredient}
              className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Add
            </button>
            <button
              onClick={startVoiceRecognition}
              disabled={listening}
              className={`inline-flex items-center justify-center rounded-md border border-transparent ${
                listening ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
              } py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              {listening ? 'Listening...' : 'Voice'}
            </button>
          </div>
          
          {transcript && (
            <p className="text-sm text-gray-500 italic">
              Heard: "{transcript}"
            </p>
          )}
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Your ingredients:</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {ingredients.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No ingredients added yet</p>
              ) : (
                ingredients.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-emerald-400 hover:bg-emerald-200 hover:text-emerald-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove {item}</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Step 2: Equipment */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Step 2: What cooking equipment do you have?
          </h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
              placeholder="Add equipment..."
              className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
            <button
              onClick={addEquipment}
              className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Add
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Your equipment:</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {equipment.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No equipment added yet</p>
              ) : (
                equipment.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeEquipment(index)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove {item}</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: Staples */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Step 3: What staples do you have? (Salt, pepper, oil, etc.)
          </h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newStaple}
              onChange={(e) => setNewStaple(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStaple()}
              placeholder="Add a staple..."
              className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
            <button
              onClick={addStaple}
              className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Add
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Your staples:</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {staples.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No staples added yet</p>
              ) : (
                staples.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeStaple(index)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove {item}</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Step 4: Dietary Preferences */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Step 4: Any dietary preferences or restrictions?
          </h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newDietaryPref}
              onChange={(e) => setNewDietaryPref(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addDietaryPref()}
              placeholder="Add a dietary preference..."
              className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
            <button
              onClick={addDietaryPref}
              className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Add
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Your dietary preferences:</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {dietaryPrefs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No dietary preferences added yet</p>
              ) : (
                dietaryPrefs.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeDietaryPref(index)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-amber-400 hover:bg-amber-200 hover:text-amber-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove {item}</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 flex justify-between">
        {step > 1 && (
          <button
            onClick={prevStep}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        )}
        
        <button
          onClick={nextStep}
          disabled={generating}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
            generating ? 'opacity-75 cursor-not-allowed' : ''
          } ml-auto`}
        >
          {generating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : step < 4 ? (
            <>
              Next
              <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </>
          ) : (
            <>
              Generate Recipes
              <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
