// src/pages/api/generate-recipes-simple.ts
import type { NextApiRequest, NextApiResponse } from 'next';
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

// Sample recipes for quick testing - bypass the AI API call
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

// Function to check user usage - simplified to always return true for testing
const checkUserUsage = async (userId: string): Promise<boolean> => {
  console.log(`Checking usage for user ${userId} - simplified version`);
  return true;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Simple recipe generation API called");
  
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

    // Skip the actual recipe generation and return sample recipes
    console.log("Returning sample recipes to avoid timeout");
    return res.status(200).json({ recipes: SAMPLE_RECIPES });
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
    
    return res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    });
  }
}