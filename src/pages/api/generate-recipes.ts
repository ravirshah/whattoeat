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
      console.log('Firebase Admin initialized with service account');
    } else {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('Firebase Admin initialized with project ID only');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized with fallback');
  }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

type RecipeResponse = {
  recipes?: any[];
  error?: string;
  limitExceeded?: boolean;
  details?: string;
  apiInfo?: any;
};

const FALLBACK_RECIPES = [
  {
    name: 'Quick Chicken Stir-Fry',
    ingredients: [
      '2 boneless, skinless chicken breasts, cut into strips',
      '2 cups mixed vegetables (bell peppers, carrots, broccoli)',
      '3 cloves garlic, minced',
      '2 tbsp soy sauce',
      '1 tbsp vegetable oil',
      '1 tsp ginger, minced',
      'Salt and pepper to taste',
    ],
    instructions: [
      'Heat oil in a large skillet or wok over medium-high heat.',
      'Add chicken and cook until no longer pink, about 5-6 minutes.',
      'Add garlic and ginger, cook for 30 seconds until fragrant.',
      'Add vegetables and stir-fry for 3-4 minutes until crisp-tender.',
      'Pour in soy sauce, stir well, and cook for another minute.',
      'Season with salt and pepper to taste.',
      'Serve hot over rice or noodles.',
    ],
    nutritionalFacts: 'Calories: ~300 per serving, Protein: 25g, Carbs: 15g, Fat: 12g',
    servings: 'Serves 2',
    times: 'Prep: 10 min | Cook: 15 min',
  },
  {
    name: 'Simple Pasta with Garlic and Olive Oil',
    ingredients: [
      '8 oz pasta (spaghetti or linguine)',
      '1/4 cup olive oil',
      '4 cloves garlic, thinly sliced',
      '1/4 tsp red pepper flakes (optional)',
      '2 tbsp fresh parsley, chopped',
      'Salt and pepper to taste',
      'Grated Parmesan cheese for serving',
    ],
    instructions: [
      'Bring a large pot of salted water to boil and cook pasta until al dente.',
      'Meanwhile, heat olive oil in a skillet over medium-low heat.',
      'Add garlic and red pepper flakes, cook until golden (about 2 minutes).',
      'Drain pasta, reserving 1/4 cup of pasta water.',
      'Add pasta to skillet, toss with garlic oil.',
      'Add reserved water as needed to create a light sauce.',
      'Stir in parsley, season with salt and pepper.',
      'Serve with Parmesan cheese.',
    ],
    nutritionalFacts: 'Calories: ~400 per serving, Protein: 10g, Carbs: 50g, Fat: 18g',
    servings: 'Serves 2',
    times: 'Prep: 5 min | Cook: 15 min',
  },
  {
    name: 'Vegetable Frittata',
    ingredients: [
      '6 large eggs',
      '1/4 cup milk',
      '1 cup mixed vegetables (spinach, bell peppers, onions)',
      '1/2 cup shredded cheese (cheddar or mozzarella)',
      '1 tbsp olive oil',
      'Salt and pepper to taste',
      'Fresh herbs (optional)',
    ],
    instructions: [
      'Preheat oven to 375°F (190°C).',
      'Whisk eggs and milk, season with salt and pepper.',
      'Heat oil in an oven-safe skillet over medium heat.',
      'Add vegetables and cook until softened, about 3-4 minutes.',
      'Pour egg mixture over vegetables, cook until edges set, about 2 minutes.',
      'Sprinkle cheese on top and bake for 10-12 minutes until set.',
      'Cool slightly before slicing.',
    ],
    nutritionalFacts: 'Calories: ~250 per serving, Protein: 18g, Carbs: 5g, Fat: 18g',
    servings: 'Serves 4',
    times: 'Prep: 10 min | Cook: 20 min',
  },
];

const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
};

const incrementRecipesGenerated = async (userId: string): Promise<void> => {
  try {
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (!userData) return;
      const currentMonth = new Date().getMonth();
      if (!userData.usageStats || userData.usageStats.month !== currentMonth) {
        await userDocRef.update({
          'usageStats.month': currentMonth,
          'usageStats.recipesGenerated': 1,
        });
      } else {
        await userDocRef.update({
          'usageStats.recipesGenerated': (userData.usageStats.recipesGenerated || 0) + 1,
        });
      }
    }
  } catch (error) {
    console.error('Error incrementing recipes generated:', error);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<RecipeResponse>) {
  console.log('Recipe generation API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    console.log('Verifying token...');
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log(`Token verified for user: ${userId}`);

    const { ingredients, equipment, staples, dietaryPrefs } = req.body;
    const cleanedIngredients = cleanArrayInput(ingredients);
    const cleanedEquipment = cleanArrayInput(equipment);
    const cleanedStaples = cleanArrayInput(staples);
    const cleanedDietaryPrefs = cleanArrayInput(dietaryPrefs);

    if (cleanedIngredients.length === 0) {
      console.log('No ingredients provided');
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    incrementRecipesGenerated(userId).catch((err) => console.error('Failed to increment count:', err));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('No GEMINI_API_KEY in environment');
      return res.status(500).json({
        error: 'API configuration error',
        details: 'Gemini API key not found',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-2.0-flash';
    console.log(`Using model: ${modelName}`);

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
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

      console.log('Sending prompt to Gemini API:', prompt.substring(0, 200) + '...');

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API request timed out')), 30000)
      );

      const result = (await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          ],
        }),
        timeoutPromise,
      ])) as any;

      if (!result || !result.response) {
        console.error('Empty response from Gemini API');
        throw new Error('Empty response from Gemini API');
      }

      const text = result.response.text();
      console.log('Received response:', text.substring(0, 100));

      const recipes = parseRecipes(text);
      if (recipes.length === 0) {
        console.error('Failed to parse recipes');
        console.log('Raw response:', text.substring(0, 300));
        const basicRecipes = basicParseRecipes(text);
        if (basicRecipes.length > 0) {
          console.log(`Basic parsing succeeded with ${basicRecipes.length} recipes`);
          return res.status(200).json({ recipes: basicRecipes });
        }
        throw new Error('Failed to parse recipes');
      }

      console.log(`Parsed ${recipes.length} recipes`);
      return res.status(200).json({ recipes });
    } catch (aiError: any) {
      console.error('Gemini API error:', aiError);
      return res.status(200).json({
        recipes: FALLBACK_RECIPES,
        apiInfo: { modelName, error: aiError.message, stack: aiError.stack?.substring(0, 500) },
      });
    }
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    if (error.code === 'auth/id-token-expired') return res.status(401).json({ error: 'Token expired' });
    if (error.code === 'auth/invalid-id-token') return res.status(401).json({ error: 'Invalid token' });
    console.log('Returning fallback recipes');
    return res.status(200).json({ recipes: FALLBACK_RECIPES, details: error.message || 'Unknown error' });
  }
}

function parseRecipes(text: string) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid input to parseRecipes:', text);
    return [];
  }

  const recipes = [];
  let recipeBlocks = text
    .split(/Recipe Name:|RECIPE \d+:|Recipe \d+:/i)
    .filter((block) => block && block.trim().length > 0);

  if (recipeBlocks.length === 0) {
    recipeBlocks = text
      .split(/\n\s*\d+\.\s*/)
      .filter((block) => block && block.trim().length > 0 && block.toLowerCase().includes('ingredient'));
  }

  if (recipeBlocks.length === 0) {
    console.warn('No recipe blocks found');
    return [];
  }

  for (const block of recipeBlocks) {
    try {
      const nameMatch =
        block.match(/^(.*?)(?=\s*\n\s*Ingredients:|\s*\n\s*INGREDIENTS:)/is) ||
        block.match(/^(.*?)(?=\s*\n\s*Ingredients)/is);
      const ingredientsMatch = block.match(
        /(?:Ingredients:|INGREDIENTS:|Ingredients)(.*?)(?=\s*\n\s*Instructions:|\s*\n\s*INSTRUCTIONS:|\s*\n\s*Instructions)/is
      );
      const instructionsMatch = block.match(
        /(?:Instructions:|INSTRUCTIONS:|Instructions)(.*?)(?=\s*\n\s*Nutritional Facts:|\s*\n\s*NUTRITIONAL FACTS:|\s*\n\s*Nutrition Facts:|\s*\n\s*Nutrition:|\s*\n\s*Nutritional Information:)/is
      );
      const nutritionalMatch = block.match(
        /(?:Nutritional Facts:|NUTRITIONAL FACTS:|Nutrition Facts:|Nutrition:|Nutritional Information:)(.*?)(?=\s*\n\s*Servings:|\s*\n\s*SERVINGS:|\s*\n\s*Serving:)/is
      );
      const servingsMatch = block.match(
        /(?:Servings:|SERVINGS:|Serving:|Yield:)(.*?)(?=\s*\n\s*Prep\/Cook Times:|\s*\n\s*PREP\/COOK TIMES:|\s*\n\s*Time:|\s*\n\s*TIME:|\s*\n\s*Prep Time:|\s*\n\s*Cook Time:)/is
      );
      const timesMatch = block.match(
        /(?:Prep\/Cook Times:|PREP\/COOK TIMES:|Time:|TIME:|Prep Time:|Cook Time:)(.*?)(?=\s*$|\s*\n\s*Recipe Name:|\s*\n\s*RECIPE \d+:|\s*\n\s*Recipe \d+:)/is
      );

      let ingredients: string[] = [];
      if (ingredientsMatch && ingredientsMatch[1]) {
        ingredients = ingredientsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter(
            (line) =>
              line.startsWith('-') ||
              line.startsWith('•') ||
              line.startsWith('*') ||
              /^\d+\./.test(line) ||
              line.length > 5
          )
          .map((line) => line.replace(/^[-•*\d.]\s*/, ''))
          .filter(Boolean);
      }

      let instructions: string[] = [];
      if (instructionsMatch && instructionsMatch[1]) {
        instructions = instructionsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^\d+\./.test(line) || /^Step \d+:/.test(line) || line.length > 10)
          .map((line) => line.replace(/^\d+\.\s*|^Step \d+:\s*/, ''))
          .filter(Boolean);
      }

      if ((nameMatch || block.length > 50) && (ingredients.length > 0 || instructions.length > 0)) {
        const recipeName = nameMatch ? nameMatch[1].trim() : 'Recipe';
        recipes.push({
          name: recipeName || 'Untitled Recipe',
          ingredients: ingredients.length > 0 ? ingredients : ['Ingredients not specified'],
          instructions: instructions.length > 0 ? instructions : ['Instructions not specified'],
          nutritionalFacts: nutritionalMatch && nutritionalMatch[1] ? nutritionalMatch[1].trim() : 'Not available',
          servings: servingsMatch && servingsMatch[1] ? servingsMatch[1].trim() : 'Not specified',
          times: timesMatch && timesMatch[1] ? timesMatch[1].trim() : 'Not specified',
        });
      }
    } catch (err) {
      console.error('Error parsing block:', err);
      continue;
    }
  }
  return recipes;
}

function basicParseRecipes(text: string) {
  if (!text || text.length < 100) return [];
  const chunks = text.split(/\n\n+/);
  const recipes = [];
  let currentRecipe: any = null;

  for (const chunk of chunks) {
    if (chunk.trim().length < 50 && !chunk.includes('.') && !currentRecipe) {
      currentRecipe = {
        name: chunk.trim(),
        ingredients: [],
        instructions: [],
        nutritionalFacts: 'Not available',
        servings: 'Not specified',
        times: 'Not specified',
      };
    } else if (currentRecipe && chunk.toLowerCase().includes('ingredient')) {
      currentRecipe.ingredients = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.toLowerCase().includes('ingredient'))
        .map((line) => line.replace(/^[-•*\d.]\s*/, ''));
    } else if (
      currentRecipe &&
      (chunk.toLowerCase().includes('instruction') || chunk.toLowerCase().includes('direction'))
    ) {
      currentRecipe.instructions = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(
          (line) =>
            line.length > 0 && !line.toLowerCase().includes('instruction') && !line.toLowerCase().includes('direction')
        )
        .map((line) => line.replace(/^[-•*\d.]\s*/, ''));
    } else if (currentRecipe) {
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

    if (currentRecipe && currentRecipe.ingredients.length > 0 && currentRecipe.instructions.length > 0) {
      recipes.push(currentRecipe);
      currentRecipe = null;
      if (recipes.length >= 3) break;
    }
  }
  return recipes;
}