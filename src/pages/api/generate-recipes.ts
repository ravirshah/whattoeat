// src/pages/api/generate-recipes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { ServiceAccount } from 'firebase-admin';

// Firebase Admin SDK initialization for server-side auth
if (!getApps().length) {
  try {
    // Try to initialize with service account if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount: ServiceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
      
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin initialized with service account");
    } else {
      // Fall back to project ID initialization
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

// Get admin instances
const adminAuth = getAuth();
const adminDb = getFirestore();

type RecipeResponse = {
  recipes?: any[];
  error?: string;
  limitExceeded?: boolean;
  details?: string;
  apiInfo?: any;
};

// Sample recipes for fallback when API fails
const FALLBACK_RECIPES = [
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

// Helper function to clean array input
const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
};

// Function to increment recipes generated count
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
    // We'll continue even if this fails - it's not critical for functionality
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

    // Get input data and clean it
    const { ingredients, equipment, staples, dietaryPrefs } = req.body;
    
    const cleanedIngredients = cleanArrayInput(ingredients);
    const cleanedEquipment = cleanArrayInput(equipment);
    const cleanedStaples = cleanArrayInput(staples);
    const cleanedDietaryPrefs = cleanArrayInput(dietaryPrefs);

    // Validate required inputs
    if (cleanedIngredients.length === 0) {
      console.log("No ingredients provided");
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    // Update usage stats in background (don't await)
    incrementRecipesGenerated(userId).catch(err => {
      console.error("Failed to increment recipe count:", err);
    });

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    // Diagnostic check for API key
    if (!apiKey) {
      console.error("No Gemini API key found in environment variables");
      return res.status(500).json({ 
        error: 'API configuration error',
        details: 'Gemini API key not found in server environment',
        apiInfo: {
          hasKey: false,
          envVars: Object.keys(process.env)
            .filter(key => key.includes('GEMINI') || key.includes('API'))
            .map(key => key)
        }
      });
    }
    
    // Log limited version of key for debugging
    const keyFirstChars = apiKey.substring(0, 4);
    const keyLength = apiKey.length;
    console.log(`Using Gemini API key (first 4 chars: ${keyFirstChars}..., length: ${keyLength})`);
    
    // Initialize Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Always use 2.0 flash
    const modelName = "gemini-2.0-flash";
    console.log(`Using Gemini model: ${modelName}`);
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      // Create a more concise, direct prompt
      const prompt = `
Create 3 recipes based on these ingredients:
${cleanedIngredients.join(', ')}
${cleanedEquipment.length > 0 ? `Equipment: ${cleanedEquipment.join(', ')}` : ''}
${cleanedStaples.length > 0 ? `Also using: ${cleanedStaples.join(', ')}` : ''}
${cleanedDietaryPrefs.length > 0 ? `Dietary notes: ${cleanedDietaryPrefs.join(', ')}` : ''}

For each recipe provide:
Recipe Name: [Name]
Ingredients: (bullet list)
Instructions: (numbered steps)
Nutritional Facts: (brief)
Servings: [Number]
Prep/Cook Times: [Time]
`;

      console.log("Sending request to Gemini API with prompt:", prompt.substring(0, 200) + "...");
      
      // Generate content with reduced parameters for faster response
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048, // Reduced for faster response
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      if (!result || !result.response) {
        console.error("Gemini API returned an empty response");
        throw new Error('Empty response from Gemini API');
      }

      const text = result.response.text();
      
      // Log a small sample of the response
      console.log("Received response from Gemini API, first 100 chars:", text.substring(0, 100));
      
      // Parse the response
      const recipes = parseRecipes(text);

      // Validate that we got at least one recipe
      if (recipes.length === 0) {
        console.error("Failed to parse any recipes from the response");
        console.log("Raw response (first 300 chars):", text.substring(0, 300));
        
        // Try basic parsing as fallback
        const basicRecipes = basicParseRecipes(text);
        if (basicRecipes.length > 0) {
          console.log("Basic parsing succeeded with", basicRecipes.length, "recipes");
          return res.status(200).json({ recipes: basicRecipes });
        }
        
        throw new Error('Failed to parse recipes from AI response');
      }

      console.log(`Successfully parsed ${recipes.length} recipes`);
      return res.status(200).json({ recipes });
      
    } catch (aiError: any) {
      console.error('Gemini API error:', aiError);
      
      // Return the fallback recipes but include detailed error info for debugging
      return res.status(200).json({ 
        recipes: FALLBACK_RECIPES, 
        apiInfo: {
          modelName,
          error: aiError.message || 'Unknown API error',
          stack: aiError.stack?.substring(0, 500)
        }
      });
    }
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Last resort - return fallback recipes
    console.log("Returning fallback recipes due to error");
    return res.status(200).json({ 
      recipes: FALLBACK_RECIPES,
      details: error.message || 'Unknown error'
    });
  }
}

// Enhanced recipe parser with better error tolerance
function parseRecipes(text: string) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid input to parseRecipes:', text);
    return [];
  }

  const recipes = [];
  
  // Try different ways to split the text into recipe blocks
  let recipeBlocks = text.split(/Recipe Name:|RECIPE \d+:|Recipe \d+:/i)
    .filter(block => block && block.trim().length > 0);
  
  if (recipeBlocks.length === 0) {
    // Try alternative splitting strategy
    recipeBlocks = text.split(/\n\s*\d+\.\s*/)
      .filter(block => block && block.trim().length > 0 && block.toLowerCase().includes('ingredient'));
  }
  
  if (recipeBlocks.length === 0) {
    console.warn('No recipe blocks found using standard methods, trying basic splitting');
    return [];
  }

  for (const block of recipeBlocks) {
    try {
      // Extract recipe components with safer pattern matching
      const nameMatch = block.match(/^(.*?)(?=\s*\n\s*Ingredients:|\s*\n\s*INGREDIENTS:)/is) || 
                        block.match(/^(.*?)(?=\s*\n\s*Ingredients)/is);
      
      const ingredientsMatch = block.match(/(?:Ingredients:|INGREDIENTS:|Ingredients)(.*?)(?=\s*\n\s*Instructions:|\s*\n\s*INSTRUCTIONS:|\s*\n\s*Instructions)/is);
      
      const instructionsMatch = block.match(/(?:Instructions:|INSTRUCTIONS:|Instructions)(.*?)(?=\s*\n\s*Nutritional Facts:|\s*\n\s*NUTRITIONAL FACTS:|\s*\n\s*Nutrition Facts:|\s*\n\s*Nutrition:|\s*\n\s*Nutritional Information:)/is);
      
      const nutritionalMatch = block.match(/(?:Nutritional Facts:|NUTRITIONAL FACTS:|Nutrition Facts:|Nutrition:|Nutritional Information:)(.*?)(?=\s*\n\s*Servings:|\s*\n\s*SERVINGS:|\s*\n\s*Serving:)/is);
      
      const servingsMatch = block.match(/(?:Servings:|SERVINGS:|Serving:|Yield:)(.*?)(?=\s*\n\s*Prep\/Cook Times:|\s*\n\s*PREP\/COOK TIMES:|\s*\n\s*Time:|\s*\n\s*TIME:|\s*\n\s*Prep Time:|\s*\n\s*Cook Time:)/is);
      
      const timesMatch = block.match(/(?:Prep\/Cook Times:|PREP\/COOK TIMES:|Time:|TIME:|Prep Time:|Cook Time:)(.*?)(?=\s*$|\s*\n\s*Recipe Name:|\s*\n\s*RECIPE \d+:|\s*\n\s*Recipe \d+:)/is);

      // Process ingredients with proper null handling
      let ingredients: string[] = [];
      if (ingredientsMatch && ingredientsMatch[1]) {
        ingredients = ingredientsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => 
            line.startsWith('-') || 
            line.startsWith('•') || 
            line.startsWith('*') || 
            /^\d+\./.test(line) ||
            line.length > 5  // If we're desperate, accept any long enough line
          )
          .map(line => line.replace(/^[-•*\d.]\s*/, ''))
          .filter(Boolean);
      }

      // Process instructions with proper null handling
      let instructions: string[] = [];
      if (instructionsMatch && instructionsMatch[1]) {
        instructions = instructionsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => 
            /^\d+\./.test(line) || 
            /^Step \d+:/.test(line) ||
            line.length > 10  // Accept longer lines as instructions
          )
          .map(line => line.replace(/^\d+\.\s*|^Step \d+:\s*/, ''))
          .filter(Boolean);
      }

      // If we have at least a name and some content, create a recipe
      if ((nameMatch || block.length > 50) && (ingredients.length > 0 || instructions.length > 0)) {
        const recipeName = nameMatch ? nameMatch[1].trim() : 'Recipe';
        
        recipes.push({
          name: recipeName || 'Untitled Recipe',
          ingredients: ingredients.length > 0 ? ingredients : ['Ingredients not specified clearly'],
          instructions: instructions.length > 0 ? instructions : ['Instructions not specified clearly'],
          nutritionalFacts: nutritionalMatch && nutritionalMatch[1] ? nutritionalMatch[1].trim() : 'Not available',
          servings: servingsMatch && servingsMatch[1] ? servingsMatch[1].trim() : 'Not specified',
          times: timesMatch && timesMatch[1] ? timesMatch[1].trim() : 'Not specified'
        });
      }
    } catch (err) {
      console.error('Error parsing recipe block:', err);
      continue;
    }
  }

  return recipes;
}

// Extremely basic fallback parser when regular parsing fails
function basicParseRecipes(text: string) {
  if (!text || text.length < 100) return [];
  
  // Split by double newlines to get potential recipe chunks
  const chunks = text.split(/\n\n+/);
  
  // We'll create up to 3 recipes
  const recipes = [];
  let currentRecipe: any = null;
  
  for (const chunk of chunks) {
    // If chunk looks like a title (short, no punctuation), treat it as recipe name
    if (chunk.trim().length < 50 && !chunk.includes('.') && !currentRecipe) {
      currentRecipe = {
        name: chunk.trim(),
        ingredients: [],
        instructions: [],
        nutritionalFacts: 'Not available',
        servings: 'Not specified',
        times: 'Not specified'
      };
    } 
    // If chunk contains "ingredient" keyword, treat as ingredients section
    else if (currentRecipe && chunk.toLowerCase().includes('ingredient')) {
      currentRecipe.ingredients = chunk
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('ingredient'))
        .map(line => line.replace(/^[-•*\d.]\s*/, ''));
    }
    // If chunk contains "instruction" or "direction" keyword, treat as instructions section
    else if (currentRecipe && (chunk.toLowerCase().includes('instruction') || chunk.toLowerCase().includes('direction'))) {
      currentRecipe.instructions = chunk
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('instruction') && !line.toLowerCase().includes('direction'))
        .map(line => line.replace(/^[-•*\d.]\s*/, ''));
    }
    // If chunk mentions nutrition or serving or time, update those fields
    else if (currentRecipe) {
      if (chunk.toLowerCase().includes('nutrition') || chunk.toLowerCase().includes('calorie')) {
        currentRecipe.nutritionalFacts = chunk.trim();
      }
      if (chunk.toLowerCase().includes('serv')) {
        currentRecipe.servings = chunk.trim();
      }
      if (chunk.toLowerCase().includes('time') || chunk.toLowerCase().includes('prep') || chunk.toLowerCase().includes('cook')) {
        currentRecipe.times = chunk.trim();
      }
    }
    
    // If we have enough content for a recipe, add it and start a new one
    if (currentRecipe && 
        currentRecipe.ingredients.length > 0 && 
        currentRecipe.instructions.length > 0) {
      recipes.push(currentRecipe);
      currentRecipe = null;
      
      // Only generate up to 3 recipes
      if (recipes.length >= 3) break;
    }
  }
  
  return recipes;
}