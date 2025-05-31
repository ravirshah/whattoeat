// src/pages/api/generate-recipes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { ServiceAccount } from 'firebase-admin';

// Firebase Admin SDK initialization
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount: ServiceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
      
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin initialized with service account");
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log("Firebase Admin initialized with project ID only");
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log("Firebase Admin initialized with fallback after error");
  }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

type RecipeResponse = {
  recipes?: any[];
  error?: string;
  limitExceeded?: boolean;
  apiInfo?: {
    error?: string;
    model?: string;
  };
  details?: string;
};

// Sample fallback recipes for when the API fails
const SAMPLE_RECIPES = [
  {
    name: "Quick Chicken Stir-Fry",
    ingredients: [
      "2 boneless, skinless chicken breasts, cut into strips",
      "2 cups mixed vegetables (bell peppers, carrots, broccoli)",
      "3 cloves garlic, minced",
      "2 tbsp soy sauce",
      "1 tbsp vegetable oil",
      "1 tsp ginger, minced",
      "Salt and pepper to taste"
    ],
    instructions: [
      "Heat oil in a large skillet or wok over medium-high heat.",
      "Add chicken and cook until no longer pink, about 5-6 minutes.",
      "Add garlic and ginger, cook for 30 seconds until fragrant.",
      "Add vegetables and stir-fry for 3-4 minutes until crisp-tender.",
      "Pour in soy sauce, stir well, and cook for another minute.",
      "Season with salt and pepper to taste.",
      "Serve hot over rice or noodles."
    ],
    nutritionalFacts: "Calories: ~300 per serving, Protein: 25g, Carbs: 15g, Fat: 12g",
    servings: "Serves 2",
    times: "Prep: 10 min | Cook: 15 min"
  },
  {
    name: "Simple Pasta with Garlic and Olive Oil",
    ingredients: [
      "8 oz pasta (spaghetti or linguine)",
      "1/4 cup olive oil",
      "4 cloves garlic, thinly sliced",
      "1/4 tsp red pepper flakes (optional)",
      "2 tbsp fresh parsley, chopped",
      "Salt and pepper to taste",
      "Grated Parmesan cheese for serving"
    ],
    instructions: [
      "Bring a large pot of salted water to boil and cook pasta according to package directions until al dente.",
      "Meanwhile, in a large skillet, heat olive oil over medium-low heat.",
      "Add sliced garlic and red pepper flakes, cook until garlic is golden (about 2 minutes).",
      "Drain pasta, reserving 1/4 cup of pasta water.",
      "Add pasta to the skillet with the garlic oil, toss to coat.",
      "Add reserved pasta water as needed to create a light sauce.",
      "Stir in parsley, season with salt and pepper.",
      "Serve immediately with grated Parmesan cheese."
    ],
    nutritionalFacts: "Calories: ~400 per serving, Protein: 10g, Carbs: 50g, Fat: 18g",
    servings: "Serves 2",
    times: "Prep: 5 min | Cook: 15 min"
  },
  {
    name: "Vegetable Frittata",
    ingredients: [
      "6 large eggs",
      "1/4 cup milk",
      "1 cup mixed vegetables (spinach, bell peppers, onions)",
      "1/2 cup cheese, shredded (cheddar or mozzarella)",
      "1 tbsp olive oil",
      "Salt and pepper to taste",
      "Fresh herbs (optional)"
    ],
    instructions: [
      "Preheat oven to 375°F (190°C).",
      "In a bowl, whisk together eggs and milk, season with salt and pepper.",
      "Heat olive oil in an oven-safe skillet over medium heat.",
      "Add vegetables and cook until softened, about 3-4 minutes.",
      "Pour egg mixture over vegetables and cook until edges start to set, about 2 minutes.",
      "Sprinkle cheese on top and transfer skillet to oven.",
      "Bake for 10-12 minutes until eggs are set and top is lightly golden.",
      "Let cool slightly before slicing and serving."
    ],
    nutritionalFacts: "Calories: ~250 per serving, Protein: 18g, Carbs: 5g, Fat: 18g",
    servings: "Serves 4",
    times: "Prep: 10 min | Cook: 20 min"
  }
];

// Clean array input
const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
};

// Increment recipes generated count in user stats
const incrementRecipesGenerated = async (userId: string): Promise<void> => {
  try {
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (!userData) return;
      
      const currentMonth = new Date().getMonth();
      
      // If the month has changed, reset the counter
      if (!userData.usageStats || userData.usageStats.month !== currentMonth) {
        await userDocRef.update({
          "usageStats.month": currentMonth,
          "usageStats.recipesGenerated": 1
        });
      } else {
        // Otherwise increment the counter
        await userDocRef.update({
          "usageStats.recipesGenerated": (userData.usageStats.recipesGenerated || 0) + 1
        });
      }
    }
  } catch (error) {
    console.error("Error incrementing recipes generated:", error);
    // Continue even if this fails - it's not critical for the user experience
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecipeResponse>
) {
  console.log("Recipe generation API called");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get auth token from request
  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    console.error("No token provided in request");
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    console.log("Verifying token...");
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log(`Token verified successfully for user: ${userId}`);

    // Get input data from request
    const { ingredients, equipment, staples, dietaryPrefs, cuisinePrefs, cookTimePreference, difficultyPreference } = req.body;
    
    // Clean the input data 
    const cleanedIngredients = cleanArrayInput(ingredients);
    const cleanedEquipment = cleanArrayInput(equipment);
    const cleanedStaples = cleanArrayInput(staples);
    const cleanedDietaryPrefs = cleanArrayInput(dietaryPrefs);
    const cleanedCuisinePrefs = cleanArrayInput(cuisinePrefs);
    const cleanedCookTimePreference = typeof cookTimePreference === 'string' ? cookTimePreference.trim() : '';
    const cleanedDifficultyPreference = typeof difficultyPreference === 'string' ? difficultyPreference.trim() : '';
    
    console.log(`User provided: ${cleanedIngredients.length} ingredients, ${cleanedEquipment.length} equipment items,` + 
      ` ${cleanedStaples.length} staples, ${cleanedDietaryPrefs.length} dietary preferences, ${cleanedCuisinePrefs.length} cuisine preferences` +
      (cleanedCookTimePreference ? `, cook time preference: ${cleanedCookTimePreference}` : '') +
      (cleanedDifficultyPreference ? `, and difficulty preference: ${cleanedDifficultyPreference}` : ''));
    
    // Update user stats in background (don't await this)
    incrementRecipesGenerated(userId).catch(error => {
      console.error("Background update of user stats failed:", error);
    });

    // Try to generate recipes with Gemini API
    try {
      console.log("Getting Gemini API key");
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found");
        throw new Error("Gemini API key not found");
      }

      console.log("Initializing Gemini API with key (first 4 chars):", apiKey.substring(0, 4) + "...");
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use gemini-2.0-flash model
      const modelName = "gemini-2.0-flash";
      console.log(`Using Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Build the prompt
      let prompt = `Generate 3 original recipes based on these available ingredients, equipment, pantry staples, dietary preferences, and cook time preference.

Available ingredients:
${cleanedIngredients.join(", ")}

Available equipment:
${cleanedEquipment.join(", ")}

Pantry staples:
${cleanedStaples.join(", ")}

Dietary preferences:
${cleanedDietaryPrefs.join(", ")}

Cuisine preferences:
${cleanedCuisinePrefs.join(", ")}

Cook time preference:
${cleanedCookTimePreference}

Difficulty preference:
${cleanedDifficultyPreference}

For each recipe, provide:
1. Name
2. Ingredients list with measurements
3. Step-by-step instructions
4. Basic nutritional facts
5. Serving size
6. Preparation and cooking time

${cleanedCookTimePreference ? `IMPORTANT: Please ensure all recipes respect the cook time preference of "${cleanedCookTimePreference}". Adjust recipe complexity and cooking methods accordingly.` : ''}

${cleanedDifficultyPreference ? `IMPORTANT: Please ensure all recipes match the difficulty level "${cleanedDifficultyPreference}":
- Easy: Simple recipes with basic techniques, minimal prep work, and common ingredients. Should be suitable for beginners.
- Medium: Moderate complexity with some advanced techniques, more ingredients, and multiple cooking steps.
- Hard: Complex recipes with advanced techniques, specialty ingredients, and intricate preparation methods.` : ''}

Return ONLY a JSON array with exactly this format:
[
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": ["step 1", "step 2", ...],
    "nutritionalFacts": "Calories: X, Protein: Xg, etc.",
    "servings": "Serves X",
    "times": "Prep: X min | Cook: X min"
  },
  ...
]`;

      console.log("Sending request to Gemini API...");
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const response = result.response;
      if (!response) {
        console.error("Gemini API returned an empty response");
        throw new Error("Empty response from Gemini API");
      }

      const text = response.text();
      console.log("Successfully received response from Gemini API");
      
      // Parse the JSON response
      try {
        // Extract JSON from the text - look for anything that might be JSON
        const jsonRegex = /\[\s*\{.*\}\s*\]/s;
        const match = text.match(jsonRegex);
        
        if (!match) {
          console.error("Failed to extract JSON from Gemini response");
          throw new Error("Invalid response format");
        }
        
        const jsonStr = match[0];
        const recipes = JSON.parse(jsonStr);
        
        if (!Array.isArray(recipes) || recipes.length === 0) {
          console.error("Invalid recipes format returned by Gemini");
          throw new Error("Invalid recipes format");
        }
        
        console.log(`Successfully parsed ${recipes.length} recipes from API response`);
        return res.status(200).json({ recipes });
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse recipe data");
      }
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      console.log("Using fallback recipe data instead");
      
      // Return sample recipes with API info
      return res.status(200).json({ 
        recipes: SAMPLE_RECIPES,
        apiInfo: {
          error: geminiError instanceof Error ? geminiError.message : String(geminiError),
          model: "fallback"
        }
      });
    }
  } catch (error: any) {
    console.error('Error in recipe generation:', error);
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    const errorMessage = typeof error.message === 'string' ? error.message : 'Unknown error';
    console.error('Detailed error message:', errorMessage);
    
    return res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error' 
    });
  }
}