// src/pages/api/generate-recipes.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { checkUserUsage } from '@/lib/db';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Firebase Admin SDK initialization for server-side auth
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '', 'base64').toString()
  );
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

type RecipeResponse = {
  recipes?: any[];
  error?: string;
  limitExceeded?: boolean;
  details?: string;
};

// Helper function to clean array input
const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter(item => typeof item === 'string' && item.trim() !== '');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecipeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get auth token from request
  const authHeader = req.headers.authorization;
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user has exceeded their usage limit
    const hasRemainingUsage = await checkUserUsage(userId);
    
    if (!hasRemainingUsage) {
      return res.status(403).json({ 
        error: 'You have reached your free tier limit of 5 recipes per month',
        limitExceeded: true 
      });
    }

    // Get input data and clean it
    const { ingredients, equipment, staples, dietaryPrefs } = req.body;
    
    const cleanedIngredients = cleanArrayInput(ingredients);
    const cleanedEquipment = cleanArrayInput(equipment);
    const cleanedStaples = cleanArrayInput(staples);
    const cleanedDietaryPrefs = cleanArrayInput(dietaryPrefs);

    // Validate required inputs
    if (cleanedIngredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using gemini 2.0 flash

    // Construct the prompt
    const prompt = `
      Generate 3 detailed recipes based on these inputs:

      INGREDIENTS: ${cleanedIngredients.join(', ')}
      ${cleanedEquipment.length > 0 ? `EQUIPMENT: ${cleanedEquipment.join(', ')}` : ''}
      ${cleanedStaples.length > 0 ? `STAPLES: ${cleanedStaples.join(', ')}` : ''}
      ${cleanedDietaryPrefs.length > 0 ? `DIETARY RESTRICTIONS: ${cleanedDietaryPrefs.join(', ')}` : ''}

      For each recipe, follow this exact structure:
      
      Recipe Name: [Name]
      
      Ingredients:
      - [ingredient with quantity]
      - [ingredient with quantity]
      
      Instructions:
      1. [Step 1]
      2. [Step 2]
      
      Nutritional Facts: [Brief nutritional information]
      
      Servings: [Number of servings]
      
      Prep/Cook Times: [Time information]

      IMPORTANT: Format the response exactly as specified above with clear section headings and numbered instructions. Make the recipes practical and achievable with the ingredients provided.
    `;

    // Generate response with safety settings
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
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

    const response = await result.response;
    const text = response.text();

    // Parse the response
    const recipes = parseRecipes(text);

    return res.status(200).json({ recipes });
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.code === 'auth/invalid-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    if (error.message?.includes('PERMISSION_DENIED')) {
      return res.status(403).json({ error: 'Permission denied to access AI service' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

// Enhanced recipe parser with validation
function parseRecipes(text: string) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid input to parseRecipes:', text);
    return [];
  }

  const recipes = [];
  
  // Split the text into recipe blocks
  const recipeBlocks = text.split(/Recipe Name:|RECIPE \d+:/i)
    .filter(block => block.trim().length > 0);
  
  if (recipeBlocks.length === 0) {
    console.warn('No recipe blocks found in:', text);
    return [];
  }

  for (const block of recipeBlocks) {
    try {
      // Extract recipe components
      const nameMatch = block.match(/^(.*?)(?=\s*\n\s*Ingredients:|\s*\n\s*INGREDIENTS:)/s);
      const ingredientsMatch = block.match(/(?:Ingredients:|INGREDIENTS:)(.*?)(?=\s*\n\s*Instructions:|\s*\n\s*INSTRUCTIONS:)/s);
      const instructionsMatch = block.match(/(?:Instructions:|INSTRUCTIONS:)(.*?)(?=\s*\n\s*Nutritional Facts:|\s*\n\s*NUTRITIONAL FACTS:)/s);
      const nutritionalMatch = block.match(/(?:Nutritional Facts:|NUTRITIONAL FACTS:)(.*?)(?=\s*\n\s*Servings:|\s*\n\s*SERVINGS:)/s);
      const servingsMatch = block.match(/(?:Servings:|SERVINGS:)(.*?)(?=\s*\n\s*Prep\/Cook Times:|\s*\n\s*PREP\/COOK TIMES:)/s);
      const timesMatch = block.match(/(?:Prep\/Cook Times:|PREP\/COOK TIMES:)(.*?)(?=\s*$)/s);

      // Process ingredients
      const ingredients = ingredientsMatch?.[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))
        .map(line => line.replace(/^[-•\d.]\s*/, ''))
        .filter(Boolean) ?? [];

      // Process instructions
      const instructions = instructionsMatch?.[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^\d+\./.test(line) || line.length > 0)
        .map(line => line.replace(/^\d+\.\s*/, ''))
        .filter(Boolean) ?? [];

      // Validate required fields
      if (!nameMatch || !ingredientsMatch || !instructionsMatch) {
        console.warn('Missing required recipe fields in block:', block);
        continue;
      }

      recipes.push({
        name: nameMatch[1].trim(),
        ingredients,
        instructions,
        nutritionalFacts: nutritionalMatch?.[1].trim() ?? 'Not available',
        servings: servingsMatch?.[1].trim() ?? 'Not specified',
        times: timesMatch?.[1].trim() ?? 'Not specified'
      });
    } catch (err) {
      console.error('Error parsing recipe block:', err);
      continue;
    }
  }

  return recipes;
}