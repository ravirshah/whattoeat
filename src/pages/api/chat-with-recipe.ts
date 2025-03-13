// src/pages/api/chat-with-recipe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { ServiceAccount } from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been already
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
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('Firebase Admin initialized with project ID only');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized with fallback');
  }
}

const adminAuth = getAuth();

type ChatResponse = {
  reply?: string;
  error?: string;
  details?: string;
  fallback?: boolean;
};

const FALLBACK_RESPONSES = [
  'Adjust cooking time by a few minutes based on your equipment. Check for doneness.',
  'Substitute butter with olive oil; use 3/4 the amount for best results.',
  'For spiciness, add 1/2 tsp red pepper flakes or a diced jalapeño.',
  'For vegetarian, replace chicken with tofu or chickpeas; press tofu to remove moisture.',
  'Double all ingredients for 4 servings; cooking time may increase slightly.',
  'Reduce calories with less oil and low-fat cheese; add more vegetables.',
  'This works with most diets; verify ingredients match your restrictions.',
  'Prep ahead and store in the fridge for up to 3 days; reheat on stovetop or oven.',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse>) {
  console.log('Chat with recipe API called');

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
    // Verify the token with Firebase Admin
    await adminAuth.verifyIdToken(token);

    const { message, recipeContext, conversationHistory } = req.body;
    if (!message) {
      console.log('No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!recipeContext) {
      console.log('No recipe context provided');
      return res.status(400).json({ error: 'Recipe context is required' });
    }

    try {
      // Get API key from environment variables, with fallback
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('No Gemini API key in environment');
        throw new Error('Gemini API key not found');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = 'gemini-2.0-flash';
      console.log(`Using model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const systemInstructions = `
You are a helpful cooking assistant specializing in recipes.
You can modify recipes, suggest substitutions, answer questions, adjust portions, and explain techniques.

When suggesting modifications:
- Explain why it works
- Include specific measurements
- Consider cooking time, texture, and flavor
- Use practical, common ingredients

Guidelines:
- Keep responses concise and recipe-focused
- For spiciness, suggest specific spices and amounts
- For substitutions, consider dietary needs and flavors
- For portions, recalculate proportionally
- Maintain a friendly tone
`;

      const fullContext = `
${systemInstructions}

RECIPE CONTEXT:
${recipeContext}

PREVIOUS CONVERSATION:
${conversationHistory}

USER MESSAGE: ${message}
`;

      console.log('Sending request to Gemini API...');
      
      // Create a timeout promise to handle API timeouts more gracefully
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API request timed out')), 25000)
      );

      const result = (await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullContext }] }],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          ],
        }),
        timeoutPromise,
      ])) as any;

      if (!result) throw new Error('Gemini API request timed out or returned null');
      const response = result.response;
      if (!response) {
        console.error('Empty response from Gemini API');
        throw new Error('Failed to generate response');
      }

      const reply = response.text();
      console.log('Received response from Gemini API');
      return res.status(200).json({ reply });
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      console.log('Using fallback response');

      // Select an appropriate fallback response based on the message content
      let fallbackResponse = '';
      if (message.toLowerCase().includes('spic')) {
        fallbackResponse = FALLBACK_RESPONSES[2];
      } else if (message.toLowerCase().includes('substit') || message.toLowerCase().includes('replac')) {
        fallbackResponse = FALLBACK_RESPONSES[1];
      } else if (message.toLowerCase().includes('time') || message.toLowerCase().includes('cook')) {
        fallbackResponse = FALLBACK_RESPONSES[0];
      } else if (message.toLowerCase().includes('vegetarian') || message.toLowerCase().includes('vegan')) {
        fallbackResponse = FALLBACK_RESPONSES[3];
      } else if (message.toLowerCase().includes('serv') || message.toLowerCase().includes('doubl')) {
        fallbackResponse = FALLBACK_RESPONSES[4];
      } else if (message.toLowerCase().includes('calor') || message.toLowerCase().includes('health')) {
        fallbackResponse = FALLBACK_RESPONSES[5];
      } else if (message.toLowerCase().includes('diet') || message.toLowerCase().includes('restrict')) {
        fallbackResponse = FALLBACK_RESPONSES[6];
      } else if (message.toLowerCase().includes('prep') || message.toLowerCase().includes('ahead')) {
        fallbackResponse = FALLBACK_RESPONSES[7];
      } else {
        const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
        fallbackResponse = FALLBACK_RESPONSES[randomIndex];
      }

      return res.status(200).json({ 
        reply: fallbackResponse,
        fallback: true
      });
    }
  } catch (error: any) {
    console.error('Error processing chat:', error);
    
    // More specific error handling
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    const errorMessage = typeof error.message === 'string' ? error.message : 'Unknown error';
    
    return res.status(500).json({
      error: 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
    });
  }
}