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

  // Detect mobile device from user agent for timeout optimization
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  console.log(`Request from ${isMobile ? 'mobile' : 'desktop'} device`);

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
      let prompt = `You are a professional chef AI assistant. Generate exactly 3 creative, practical recipes that STRICTLY adhere to the user's available resources and preferences below.

## CRITICAL CONSTRAINTS - MUST FOLLOW:

### AVAILABLE INGREDIENTS (USE PRIMARILY FROM THIS LIST):
${cleanedIngredients.length > 0 ? cleanedIngredients.join(", ") : "No specific ingredients provided"}

### AVAILABLE EQUIPMENT (ONLY USE THESE):
${cleanedEquipment.length > 0 ? cleanedEquipment.join(", ") : "Basic kitchen equipment (stovetop, basic pans)"}

### PANTRY STAPLES AVAILABLE:
${cleanedStaples.length > 0 ? cleanedStaples.join(", ") : "Basic staples (salt, pepper, oil)"}

### DIETARY REQUIREMENTS (MUST RESPECT):
${cleanedDietaryPrefs.length > 0 ? cleanedDietaryPrefs.join(", ") : "No specific dietary restrictions"}

### CUISINE PREFERENCES:
${cleanedCuisinePrefs.length > 0 ? cleanedCuisinePrefs.join(", ") : "Any cuisine style"}

### TIME CONSTRAINT:
${cleanedCookTimePreference || "No specific time constraint"}

### DIFFICULTY LEVEL:
${cleanedDifficultyPreference || "Any difficulty level"}

## STRICT RECIPE REQUIREMENTS:

1. **INGREDIENT USAGE**: Recipes MUST primarily use ingredients from the "Available Ingredients" list. You may suggest 1-2 common additional ingredients per recipe ONLY if absolutely necessary for the recipe to work. Clearly prioritize the provided ingredients.

2. **EQUIPMENT COMPLIANCE**: Only use cooking methods and techniques that can be accomplished with the available equipment. If no equipment is specified, assume only basic stovetop and oven access.

3. **TIME ADHERENCE**: ${cleanedCookTimePreference ? `
   - "${cleanedCookTimePreference}" means:
     * "Quick (under 30 min)": Total time from start to finish must be under 30 minutes
     * "Medium (30-60 min)": Total time should be 30-60 minutes 
     * "Long (60+ min)": Can take over 60 minutes including prep and cooking
   - Adjust cooking methods, ingredient prep, and recipe complexity to meet this constraint exactly.` : 'No specific time requirements, but provide realistic prep and cook times.'}

4. **DIFFICULTY MATCHING**: ${cleanedDifficultyPreference ? `
   - "${cleanedDifficultyPreference}" means:
     * "Easy": Max 6-8 ingredients, basic techniques (sautéing, boiling, baking), minimal knife work, one-pot/pan meals preferred, beginner-friendly steps
     * "Medium": 8-12 ingredients, intermediate techniques (braising, roasting, making sauces), some multi-step processes, requires basic cooking skills
     * "Hard": 12+ ingredients allowed, advanced techniques (reduction, emulsification, complex seasoning), multi-step processes, requires experienced cooking skills
   - Match recipe complexity exactly to this level.` : 'Provide recipes of varying difficulty levels.'}

5. **DIETARY COMPLIANCE**: Every recipe must strictly avoid ingredients that conflict with the dietary preferences. Double-check each ingredient against the dietary restrictions.

6. **CUISINE STYLE**: ${cleanedCuisinePrefs.length > 0 ? 'Incorporate flavors, techniques, and ingredients typical of the preferred cuisines where possible.' : 'Use diverse international flavors.'}

## OUTPUT REQUIREMENTS:

- Generate exactly 3 distinct recipes
- Each recipe should showcase different cooking techniques
- Provide precise measurements in standard cooking units
- Instructions should be clear, numbered, and actionable
- Include realistic nutritional estimates
- Specify exact prep and cook times

## RESPONSE FORMAT (JSON ONLY):

Return ONLY a valid JSON array with this exact structure:

[
  {
    "name": "Descriptive Recipe Name",
    "ingredients": [
      "Precise measurement + ingredient name",
      "Example: 2 large chicken breasts, boneless and skinless",
      "1 cup jasmine rice",
      "2 tbsp olive oil"
    ],
    "instructions": [
      "Step 1: Detailed action with timing if relevant",
      "Step 2: Clear cooking instruction with temperature/time",
      "Step 3: Specific technique with visual cues for doneness"
    ],
    "nutritionalFacts": "Calories: [amount] per serving, Protein: [amount]g, Carbs: [amount]g, Fat: [amount]g, Fiber: [amount]g",
    "servings": "Serves [number] people",
    "times": "Prep: [number] min | Cook: [number] min | Total: [number] min"
  }
]

## FINAL CHECKS:
- Verify each recipe uses primarily available ingredients
- Confirm cooking methods match available equipment  
- Ensure total time aligns with user preference
- Check difficulty matches requested level
- Validate all dietary restrictions are respected
- Ensure measurements and instructions are precise and practical`;

      console.log("Sending request to Gemini API...");
      
      // Use shorter timeout for mobile devices
      const apiTimeout = isMobile ? 35000 : 50000; // 35s for mobile, 50s for desktop
      console.log(`Using ${apiTimeout/1000}s timeout for ${isMobile ? 'mobile' : 'desktop'} device`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini API timeout after ${apiTimeout/1000}s`)), apiTimeout);
      });
      
      // Race the API call against the timeout
      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: isMobile ? 3072 : 4096, // Smaller response for mobile
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
        }),
        timeoutPromise
      ]);

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