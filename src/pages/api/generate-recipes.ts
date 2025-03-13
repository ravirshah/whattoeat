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
};

// Helper function to clean array input
const cleanArrayInput = (arr: string[] | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
};

// Function to check user usage - modified to work with direct Firestore access and error handling
const checkUserUsage = async (userId: string): Promise<boolean> => {
  try {
    // Get user document from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.log(`User document ${userId} not found`);
      return true; // Allow usage if document doesn't exist
    }
    
    const userData = userDoc.data();
    if (!userData) {
      console.log(`User data is empty for ${userId}`);
      return true; // Allow usage if data is empty
    }
    
    // If user has a subscription, they have unlimited usage
    if (userData.subscription && userData.subscription.isActive) {
      return true;
    }
    
    // Check if user has usage stats
    if (!userData.usageStats) {
      // Initialize usage stats if they don't exist
      await userDocRef.update({
        usageStats: {
          month: new Date().getMonth(),
          recipesGenerated: 0
        }
      });
      return true;
    }
    
    // Check if the user has exceeded the free tier limit (5 recipes per month)
    const currentMonth = new Date().getMonth();
    
    // If it's a new month, reset the counter
    if (userData.usageStats.month !== currentMonth) {
      await userDocRef.update({
        "usageStats.month": currentMonth,
        "usageStats.recipesGenerated": 0
      });
      return true;
    }
    
    // Check if user has reached the limit
    if (userData.usageStats.recipesGenerated >= 5) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking user usage:", error);
    // If there's an error, we'll allow the user to generate recipes
    // to prevent blocking legitimate users due to backend issues
    return true;
  }
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
    // We'll continue even if this fails
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

    // Check if user has exceeded their usage limit
    console.log("Checking user usage limits...");
    const hasRemainingUsage = await checkUserUsage(userId);
    
    if (!hasRemainingUsage) {
      console.log(`User ${userId} has exceeded their usage limit`);
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
      console.log("No ingredients provided");
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No Gemini API key found in environment variables");
      throw new Error('Gemini API key not found in server environment');
    }
    
    console.log("Initializing Gemini API...");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-2.0 flash model
    const modelName = "gemini-2.0-flash";
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

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
    console.log("Sending request to Gemini API...");
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

    const response = result.response;

    if (!response) {
        console.error("Gemini API returned an empty response.");
        return res.status(500).json({ error: 'Failed to generate recipes - Gemini API returned empty response' });
    }

    const text = response.text();
    console.log("Successfully received response from Gemini API");

    // Parse the response
    const recipes = parseRecipes(text);

    if (recipes.length === 0) {
      console.error("Failed to parse any recipes from the response");
      console.log("Response text (first 300 chars):", text.substring(0, 300));
      return res.status(500).json({ error: 'Failed to parse recipes from AI response' });
    }

    // Update usage stats after successful generation
    await incrementRecipesGenerated(userId);

    console.log(`Successfully parsed ${recipes.length} recipes`);
    return res.status(200).json({ recipes });
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    const errorMessage = typeof error.message === 'string' ? error.message : 'Unknown error';
    console.error('Detailed error message:', errorMessage);
    
    if (errorMessage.includes('PERMISSION_DENIED')) {
      return res.status(403).json({ error: 'Permission denied to access AI service' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
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
    .filter(block => block && block.trim().length > 0);
  
  if (recipeBlocks.length === 0) {
    console.warn('No recipe blocks found in:', text);
    return [];
  }

  for (const block of recipeBlocks) {
    try {
      // Extract recipe components with safer pattern matching
      const nameMatch = block.match(/^(.*?)(?=\s*\n\s*Ingredients:|\s*\n\s*INGREDIENTS:)/s);
      const ingredientsMatch = block.match(/(?:Ingredients:|INGREDIENTS:)(.*?)(?=\s*\n\s*Instructions:|\s*\n\s*INSTRUCTIONS:)/s);
      const instructionsMatch = block.match(/(?:Instructions:|INSTRUCTIONS:)(.*?)(?=\s*\n\s*Nutritional Facts:|\s*\n\s*NUTRITIONAL FACTS:)/s);
      const nutritionalMatch = block.match(/(?:Nutritional Facts:|NUTRITIONAL FACTS:)(.*?)(?=\s*\n\s*Servings:|\s*\n\s*SERVINGS:)/s);
      const servingsMatch = block.match(/(?:Servings:|SERVINGS:)(.*?)(?=\s*\n\s*Prep\/Cook Times:|\s*\n\s*PREP\/COOK TIMES:)/s);
      const timesMatch = block.match(/(?:Prep\/Cook Times:|PREP\/COOK TIMES:)(.*?)(?=\s*$)/s);

      // Process ingredients with proper null handling
      let ingredients: string[] = [];
      if (ingredientsMatch && ingredientsMatch[1]) {
        ingredients = ingredientsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))
          .map(line => line.replace(/^[-•\d.]\s*/, ''))
          .filter(Boolean);
      }

      // Process instructions with proper null handling
      let instructions: string[] = [];
      if (instructionsMatch && instructionsMatch[1]) {
        instructions = instructionsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => /^\d+\./.test(line) || line.length > 0)
          .map(line => line.replace(/^\d+\.\s*/, ''))
          .filter(Boolean);
      }

      // Validate required fields
      if (!nameMatch || !ingredientsMatch || !instructionsMatch) {
        console.warn('Missing required recipe fields in block:', { 
          hasName: !!nameMatch, 
          hasIngredients: !!ingredientsMatch, 
          hasInstructions: !!instructionsMatch 
        });
        continue;
      }

      recipes.push({
        name: nameMatch[1] ? nameMatch[1].trim() : 'Untitled Recipe',
        ingredients: ingredients,
        instructions: instructions,
        nutritionalFacts: nutritionalMatch && nutritionalMatch[1] ? nutritionalMatch[1].trim() : 'Not available',
        servings: servingsMatch && servingsMatch[1] ? servingsMatch[1].trim() : 'Not specified',
        times: timesMatch && timesMatch[1] ? timesMatch[1].trim() : 'Not specified'
      });
    } catch (err) {
      console.error('Error parsing recipe block:', err);
      continue;
    }
  }

  return recipes;
}