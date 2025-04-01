// src/pages/api/generate-recipes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from '@google/generative-ai';
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

  let userId: string;
  try {
    console.log("Verifying token...");
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
    console.log(`Token verified successfully for user: ${userId}`);
  } catch (error) {
     console.error("Token verification failed:", error);
     return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  try {
    // Get input data from request, including new fields
    const { 
        ingredients, 
        equipment, 
        staples, 
        dietaryPrefs,
        cuisine, // New field
        cookTime, // New field
        difficulty // New field
    } = req.body;
    
    // Clean the array input data 
    const cleanedIngredients = cleanArrayInput(ingredients);
    const cleanedEquipment = cleanArrayInput(equipment);
    const cleanedStaples = cleanArrayInput(staples);
    const cleanedDietaryPrefs = cleanArrayInput(dietaryPrefs);

    // Basic cleaning/validation for new string fields (optional)
    const cleanedCuisine = typeof cuisine === 'string' ? cuisine.trim() : '';
    // Cook time and difficulty are more constrained by frontend types
    const cleanedCookTime = typeof cookTime === 'string' && ['Under 30 mins', 'Under 1 hour', '1 hour+'].includes(cookTime) ? cookTime : '';
    const cleanedDifficulty = typeof difficulty === 'string' && ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : '';
    
    console.log(`User provided:`);
    console.log(`  - Ingredients: ${cleanedIngredients.length > 0 ? cleanedIngredients.join(', ') : 'None'}`);
    console.log(`  - Equipment: ${cleanedEquipment.length > 0 ? cleanedEquipment.join(', ') : 'None'}`);
    console.log(`  - Staples: ${cleanedStaples.length > 0 ? cleanedStaples.join(', ') : 'None'}`);
    console.log(`  - Dietary Prefs: ${cleanedDietaryPrefs.length > 0 ? cleanedDietaryPrefs.join(', ') : 'None'}`);
    console.log(`  - Cuisine: ${cleanedCuisine || 'Any'}`);
    console.log(`  - Cook Time: ${cleanedCookTime || 'Any'}`);
    console.log(`  - Difficulty: ${cleanedDifficulty || 'Any'}`);

    if (cleanedIngredients.length === 0) {
        console.log("Request rejected: No ingredients provided.");
        return res.status(400).json({ error: 'Please provide at least one ingredient.' });
    }
    
    // Update user stats in background (don't await this)
    incrementRecipesGenerated(userId).catch(error => {
      console.error("Background update of user stats failed:", error);
    });

    // Try to generate recipes with Gemini API
    let apiError: string | undefined = undefined;
    let modelUsed: string | undefined = undefined;
    try {
      console.log("Getting Gemini API key");
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found");
        throw new Error("API key configuration error"); // More generic error for user
      }

      console.log("Initializing Gemini API..."); // Simplified log
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use gemini-1.5-flash-latest (recommended over specific versions)
      modelUsed = "gemini-1.5-flash-latest";
      console.log(`Using Gemini model: ${modelUsed}`);
      const model = genAI.getGenerativeModel({ model: modelUsed });

      // Build the prompt with conditional preferences
      let prompt = `Generate 3 creative and distinct recipes based on the following details. Focus on using the listed ingredients effectively.

Available ingredients:
${cleanedIngredients.join(", ")}

Available equipment:
${cleanedEquipment.length > 0 ? cleanedEquipment.join(", ") : 'Standard kitchen equipment assumed'}

Pantry staples (can be used if needed):
${cleanedStaples.length > 0 ? cleanedStaples.join(", ") : 'Basic staples like salt, pepper, oil assumed available'}

Dietary preferences/restrictions:
${cleanedDietaryPrefs.length > 0 ? cleanedDietaryPrefs.join(", ") : 'None specified'}
`;

      // Add optional preferences to prompt
      if (cleanedCuisine) {
        prompt += `
Cuisine Preference: ${cleanedCuisine}
`;
      }
      if (cleanedCookTime) {
        prompt += `
Desired Cook Time: ${cleanedCookTime}
`;
      }
      if (cleanedDifficulty) {
        prompt += `
Desired Difficulty: ${cleanedDifficulty}
`;
      }

      prompt += `
Instructions for the AI:
- Adhere strictly to the dietary preferences/restrictions.
- Prioritize using the \"Available ingredients\". Use \"Pantry staples\" only as needed to complete the recipe.
- If cuisine, cook time, or difficulty are specified, try your best to match them.
- Ensure recipes are distinct from each other.
- Provide clear measurements and step-by-step instructions.

Output Format: Return ONLY a valid JSON array containing exactly 3 recipe objects. Each object must follow this structure precisely:
{
  "name": "Recipe Name",
  "ingredients": ["Quantity Unit Ingredient", "..."],
  "instructions": ["Step 1", "Step 2", "..."],
  "nutritionalFacts": "Approximate nutritional information (e.g., Calories: X, Protein: Yg)",
  "servings": "Number of servings (e.g., Serves 2-3)",
  "times": "Prep and cook time (e.g., Prep: 15 min | Cook: 30 min)"
}

Do not include any introductory text, explanations, or markdown formatting around the JSON array.
`;

      console.log("Generated prompt for Gemini:", prompt.substring(0, 300) + "..."); // Log beginning of prompt

      // Define safety settings
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];

      // Define generation config including safety settings
      const generationConfig: GenerationConfig = {
        // Optional settings:
        // temperature: 0.7,
        // maxOutputTokens: 4096,
        // responseMimeType: "application/json", 
      };
      
      console.log("Sending request to Gemini API...");
      const result = await model.generateContent(prompt, { 
          generationConfig, 
          safetySettings 
      });
      const response = result.response;
      
      console.log("Received response from Gemini API.");
      // Basic check for response text existence
      if (!response || !response.text) {
         console.error("Gemini response missing text content.");
         throw new Error("Received an empty response from the generation service.");
      }
      
      const text = response.text();
      console.log("Gemini Raw Response Text (first 300 chars):", text.substring(0, 300) + "...");

      // Attempt to parse the response as JSON
      let parsedRecipes;
      try {
        // Clean potential markdown fences
        const cleanedText = text.replace(/^```json\n?|```$/g, '').trim();
        parsedRecipes = JSON.parse(cleanedText);
        
        // Basic validation of the parsed structure
        if (!Array.isArray(parsedRecipes) || parsedRecipes.length === 0 || typeof parsedRecipes[0] !== 'object' || !parsedRecipes[0].name) {
           console.error("Parsed JSON is not in the expected recipe array format.");
           throw new Error('API returned data in an unexpected format.');
        }

        console.log(`Successfully parsed ${parsedRecipes.length} recipes from API response.`);
        return res.status(200).json({ 
            recipes: parsedRecipes, 
            apiInfo: { ...(modelUsed && { model: modelUsed }) }
        });

      } catch (parseError: any) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        console.error("Raw text that failed parsing:", text); // Log the raw text
        throw new Error('Failed to process the generated recipes. The format might be incorrect.');
      }

    } catch (error: any) {
      console.error("Error during Gemini API call or processing:", error);
      apiError = error.message || 'An unknown error occurred during recipe generation.';
       // Fallback to sample recipes if API fails
       console.log("Falling back to sample recipes due to API error.");
       return res.status(500).json({
          recipes: SAMPLE_RECIPES,
          error: "Failed to generate recipes using AI. Here are some sample ideas.",
          details: apiError, // Provide specific API error detail
          apiInfo: { 
              ...(apiError && { error: apiError }),
              ...(modelUsed && { model: modelUsed })
          }
       });
    }

  } catch (error: any) {
    // Catch errors related to input processing or unexpected issues before API call
    console.error("Unhandled error in API handler:", error);
    return res.status(500).json({ error: error.message || 'An unexpected server error occurred.' });
  }
}