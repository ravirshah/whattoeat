// src/pages/api/generate-recipes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

// Firebase Admin SDK initialization for server-side auth
if (!getApps().length) {
  try {
    // Try to initialize with service account if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(
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

// Helper function to clean array input
const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    const decodedToken = await getAuth().verifyIdToken(token);
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

    // Try to use Gemini API
    try {
      // Get API key (try both environment variables)
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found in environment variables");
        throw new Error('Gemini API key not configured');
      }
      
      // Log limited version of key for debugging (first 4 chars)
      const keyFirstChars = apiKey.substring(0, 4);
      console.log(`Using Gemini API key (first 4 chars: ${keyFirstChars}...)`);
      
      // Initialize Google Generative AI client
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Always use 2.0 flash
      const modelName = "gemini-2.0-flash";
      console.log(`Using Gemini model: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });

      // Create a simple, direct prompt
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
      
      // Generate content with timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API request timed out')), 30000)
        )
      ]);

      if (!result) {
        throw new Error('Empty or timeout response from Gemini API');
      }

      // @ts-ignore (TypeScript might not recognize this specific API form)
      const response = result.response;
      const text = response.text();
      
      // Log a small sample of the response for debugging
      console.log("Received response from Gemini API, first 100 chars:", text.substring(0, 100));
      
      // Parse the response into structured recipes
      const recipes = parseRecipes(text);

      // Check if we got any valid recipes
      if (recipes.length === 0) {
        console.error("Failed to parse any recipes from the response");
        throw new Error('Failed to parse recipes from AI response');
      }

      console.log(`Successfully parsed ${recipes.length} recipes`);
      return res.status(200).json({ recipes });
      
    } catch (apiError) {
      console.error('Gemini API error:', apiError);
      
      // Provide helpful debug information in the console
      if (apiError instanceof Error) {
        console.error('Error details:', {
          message: apiError.message,
          stack: apiError.stack,
        });
      }
      
      // Return the fallback recipes but include detailed error info for debugging
      console.log("Returning fallback recipes due to API error");
      return res.status(200).json({ 
        recipes: FALLBACK_RECIPES, 
        apiError: apiError instanceof Error ? apiError.message : 'Unknown API error'
      });
    }
  } catch (error) {
    console.error('Error in recipe generation API:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    
    // Return fallback recipes in case of any error
    console.log("Returning fallback recipes due to general error");
    return res.status(200).json({ 
      recipes: FALLBACK_RECIPES,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Basic recipe parser function
function parseRecipes(text: string) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid input to parseRecipes:', text);
    return [];
  }

  const recipes = [];
  
  // Try to split the text into recipe blocks
  let recipeBlocks = text.split(/Recipe Name:|RECIPE \d+:|Recipe \d+:/i)
    .filter(block => block && block.trim().length > 0);
  
  if (recipeBlocks.length === 0) {
    console.warn('No recipe blocks found using standard methods');
    return [];
  }

  for (const block of recipeBlocks) {
    try {
      // Extract recipe components with regex patterns
      const nameMatch = block.match(/^(.*?)(?=\s*\n\s*Ingredients:|\s*\n\s*INGREDIENTS:)/is);
      
      const ingredientsMatch = block.match(/(?:Ingredients:|INGREDIENTS:)(.*?)(?=\s*\n\s*Instructions:|\s*\n\s*INSTRUCTIONS:)/is);
      
      const instructionsMatch = block.match(/(?:Instructions:|INSTRUCTIONS:)(.*?)(?=\s*\n\s*Nutritional Facts:|\s*\n\s*NUTRITIONAL FACTS:|\s*\n\s*Nutrition:)/is);
      
      const nutritionalMatch = block.match(/(?:Nutritional Facts:|NUTRITIONAL FACTS:|Nutrition:)(.*?)(?=\s*\n\s*Servings:|\s*\n\s*SERVINGS:)/is);
      
      const servingsMatch = block.match(/(?:Servings:|SERVINGS:)(.*?)(?=\s*\n\s*Prep\/Cook Times:|\s*\n\s*Time:)/is);
      
      const timesMatch = block.match(/(?:Prep\/Cook Times:|TIME:|Time:)(.*?)(?=\s*$|\s*\n\s*Recipe Name:|\s*\n\s*RECIPE \d+:)/is);

      // Process ingredients
      let ingredients = [];
      if (ingredientsMatch && ingredientsMatch[1]) {
        ingredients = ingredientsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => 
            line.startsWith('-') || 
            line.startsWith('•') || 
            line.startsWith('*') || 
            /^\d+\./.test(line) ||
            line.length > 5
          )
          .map(line => line.replace(/^[-•*\d.]\s*/, ''))
          .filter(Boolean);
      }

      // Process instructions
      let instructions = [];
      if (instructionsMatch && instructionsMatch[1]) {
        instructions = instructionsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => 
            /^\d+\./.test(line) || 
            /^Step \d+:/.test(line) ||
            line.length > 10
          )
          .map(line => line.replace(/^\d+\.\s*|^Step \d+:\s*/, ''))
          .filter(Boolean);
      }

      // Build valid recipe object
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