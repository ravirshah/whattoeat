// src/pages/api/chat-with-recipe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
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
  }
}

// Get admin instances
const adminAuth = getAuth();

type ChatResponse = {
  reply?: string;
  error?: string;
  details?: string;
  fallback?: boolean;
};

// Fallback responses for when the AI API fails
const FALLBACK_RESPONSES = [
  "I recommend adjusting the cooking time by a few minutes based on your equipment. Make sure to check for doneness as times can vary between ovens and stovetops.",
  "You can substitute butter with olive oil in this recipe. Use about 3/4 the amount of olive oil as you would butter for best results.",
  "To make this recipe spicier, add 1/2 teaspoon of red pepper flakes or a diced jalapeño. You can adjust to your taste preference.",
  "For a vegetarian version, you can replace the chicken with firm tofu or chickpeas. Make sure to press the tofu well before cooking to remove excess moisture.",
  "To make 4 servings instead of 2, simply double all the ingredients. The cooking time should remain roughly the same, maybe just a few minutes longer.",
  "To reduce the calories, you can use less oil and opt for low-fat cheese. You could also increase the proportion of vegetables to make it more filling with fewer calories.",
  "This recipe should work well with most dietary restrictions. Just make sure to check that your ingredients align with your specific needs.",
  "For meal prep, you can make this ahead of time and store in the refrigerator for up to 3 days. I recommend reheating in the oven or stovetop rather than microwave for better texture."
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
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
    await adminAuth.verifyIdToken(token);
    
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

    // First try using the Gemini API
    try {
      // Initialize Gemini API with timeout handling
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error("No Gemini API key found in environment variables");
        throw new Error('Gemini API key not found in server environment');
      }
      
      console.log("Initializing Gemini API...");
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use gemini-2.0 flash model for chat
      const modelName = "gemini-2.0-flash";
      console.log(`Using Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Construct the prompt with system instructions, recipe context, and conversation history
      const systemInstructions = `
      You are a helpful cooking assistant specializing in recipes. 
      You can help modify recipes, suggest ingredient substitutions, answer cooking questions, 
      adjust portions, and explain techniques. 
      
      When suggesting modifications:
      - Provide clear explanations for why the modification works
      - Include specific measurements when replacing ingredients
      - Consider the impact on cooking time, texture, and flavor
      - Be practical and use ingredients that are commonly available
      
      IMPORTANT GUIDELINES:
      - Keep responses concise and focused on the recipe at hand
      - If asked to make something spicier, suggest specific spices and amounts
      - If asked about ingredient substitutions, consider dietary restrictions and flavor profiles
      - If asked to adjust portions, recalculate all ingredient quantities proportionally
      - Always maintain a friendly, helpful tone
      `;

      // Combine context for the model
      const fullContext = `
      ${systemInstructions}
      
      HERE IS THE RECIPE CONTEXT:
      ${recipeContext}
      
      PREVIOUS CONVERSATION:
      ${conversationHistory}
      
      USER'S CURRENT MESSAGE: ${message}
      `;

      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), 30000); // 30 second timeout
      });

      // Generate response with safety settings
      console.log("Sending request to Gemini API...");
      
      // Race between the API call and the timeout
      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullContext }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
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
        }),
        timeoutPromise
      ]) as any;

      if (!result) {
        throw new Error('Gemini API request timed out or returned null');
      }

      const response = result.response;

      if (!response) {
        console.error("Gemini API returned an empty response.");
        throw new Error('Failed to generate response - Gemini API returned empty response');
      }

      const reply = response.text();
      console.log("Successfully received response from Gemini API");

      return res.status(200).json({ reply });
    } catch (geminiError) {
      console.error('Error with Gemini API:', geminiError);
      
      // Fall back to hardcoded responses
      console.log("Using fallback response for chat");
      
      // Choose a fallback response based on the message content or just random if no match
      let fallbackResponse = "";
      
      // Simple keyword matching for fallback responses
      if (message.toLowerCase().includes('spic')) {
        fallbackResponse = FALLBACK_RESPONSES[2]; // Spicy-related response
      } else if (message.toLowerCase().includes('substit') || message.toLowerCase().includes('replac')) {
        fallbackResponse = FALLBACK_RESPONSES[1]; // Substitution-related response
      } else if (message.toLowerCase().includes('time') || message.toLowerCase().includes('cook')) {
        fallbackResponse = FALLBACK_RESPONSES[0]; // Cooking time response
      } else if (message.toLowerCase().includes('vegetarian') || message.toLowerCase().includes('vegan')) {
        fallbackResponse = FALLBACK_RESPONSES[3]; // Vegetarian conversion
      } else if (message.toLowerCase().includes('serv') || message.toLowerCase().includes('doubl')) {
        fallbackResponse = FALLBACK_RESPONSES[4]; // Serving size response
      } else if (message.toLowerCase().includes('calor') || message.toLowerCase().includes('health')) {
        fallbackResponse = FALLBACK_RESPONSES[5]; // Calorie reduction
      } else if (message.toLowerCase().includes('diet') || message.toLowerCase().includes('restrict')) {
        fallbackResponse = FALLBACK_RESPONSES[6]; // Dietary restrictions
      } else if (message.toLowerCase().includes('prep') || message.toLowerCase().includes('ahead')) {
        fallbackResponse = FALLBACK_RESPONSES[7]; // Meal prep response
      } else {
        // If no keyword match, choose a random response
        const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
        fallbackResponse = FALLBACK_RESPONSES[randomIndex];
      }
      
      return res.status(200).json({ 
        reply: fallbackResponse,
        fallback: true
      });
    }
  } catch (error: any) {
    console.error('Error processing chat request:', error);
    
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
      error: 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error' 
    });
  }
}