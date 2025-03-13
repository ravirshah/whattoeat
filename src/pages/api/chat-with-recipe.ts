// src/pages/api/chat-with-recipe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

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
  }
}

// Fallback responses for when the AI API fails
const FALLBACK_RESPONSES = [
  "I recommend adjusting the cooking time by a few minutes based on your equipment. Make sure to check for doneness as times can vary between ovens and stovetops.",
  "You can substitute butter with olive oil in this recipe. Use about 3/4 the amount of olive oil as you would butter for best results.",
  "To make this recipe spicier, add 1/2 teaspoon of red pepper flakes or a diced jalapeño. You can adjust to your taste preference.",
  "For a vegetarian version, you can replace the chicken with firm tofu or chickpeas. Make sure to press the tofu well before cooking to remove excess moisture.",
  "To make 4 servings instead of 2, simply double all the ingredients. The cooking time should remain roughly the same, maybe just a few minutes longer."
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Chat with recipe API called");
  
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
    await getAuth().verifyIdToken(token);
    console.log("Token verification successful");
    
    // Get input data
    const { message, recipeContext, conversationHistory } = req.body;

    // Validate required inputs
    if (!message) {
      console.log("No message provided");
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!recipeContext) {
      console.log("No recipe context provided");
      return res.status(400).json({ error: 'Recipe context is required' });
    }

    // Try using the Gemini API with better error handling
    try {
      // Get API key (try both environment variables)
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found in environment variables");
        throw new Error('Gemini API key not configured');
      }
      
      console.log(`Using Gemini API key (first 4 chars: ${apiKey.substring(0, 4)}...)`);
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // ALWAYS USE GEMINI 2.0 FLASH
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      console.log("Using model: gemini-pro");

      // Create a simplified prompt structure
      const prompt = `
You are a helpful cooking assistant. Help with this recipe:

${recipeContext}

Previous conversation:
${conversationHistory || "No previous conversation"}

Current question: ${message}

Please provide a helpful, accurate response about this recipe.
`;

      console.log("Sending request to Gemini API with prompt length:", prompt.length);
      
      // Generate response with a timeout
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API request timed out')), 20000))
      ]);

      // @ts-ignore (TypeScript might not recognize this specific API form)
      const response = result.response;
      const reply = response.text();
      
      console.log("Successfully received response from Gemini API, length:", reply.length);
      return res.status(200).json({ reply });
      
    } catch (apiError) {
      console.error('Error with Gemini API:', apiError);
      
      // Choose an appropriate fallback response based on the query content
      let fallbackResponse = "";
      
      // Simple keyword matching for fallback responses
      if (message.toLowerCase().includes('time') || message.toLowerCase().includes('cook')) {
        fallbackResponse = FALLBACK_RESPONSES[0]; // Cooking time response
      } else if (message.toLowerCase().includes('substit') || message.toLowerCase().includes('replac')) {
        fallbackResponse = FALLBACK_RESPONSES[1]; // Substitution-related response
      } else if (message.toLowerCase().includes('spic')) {
        fallbackResponse = FALLBACK_RESPONSES[2]; // Spicy-related response
      } else if (message.toLowerCase().includes('vegetarian') || message.toLowerCase().includes('vegan')) {
        fallbackResponse = FALLBACK_RESPONSES[3]; // Vegetarian conversion
      } else if (message.toLowerCase().includes('serv') || message.toLowerCase().includes('doubl')) {
        fallbackResponse = FALLBACK_RESPONSES[4]; // Serving size response
      } else {
        // If no keyword match, choose a random response
        const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
        fallbackResponse = FALLBACK_RESPONSES[randomIndex];
      }
      
      console.log("Using fallback response due to API error");
      return res.status(200).json({ 
        reply: fallbackResponse,
        fallback: true
      });
    }
  } catch (error) {
    console.error('Error processing chat request:', error);
    
    // Choose a random fallback response
    const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
    const fallbackResponse = FALLBACK_RESPONSES[randomIndex];
    
    console.log("Using fallback response due to general error");
    return res.status(200).json({ 
      reply: fallbackResponse,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}