// src/pages/api/debug-gemini.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Debug Gemini API called");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the API key with fallback to support different environment configurations
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No Gemini API key found in environment variables");
      return res.status(500).json({ 
        error: 'Gemini API key not found in server environment',
        environmentVariables: {
          hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
          hasNextPublicGeminiApiKey: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        }
      });
    }
    
    console.log("Initializing Gemini API with key (first 4 chars):", apiKey.substring(0, 4) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the correct model - gemini-2.0-flash
    const modelName = "gemini-2.0-flash";
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Simple test prompt
    const prompt = "Write one simple cooking tip in exactly one sentence.";

    console.log("Sending simple test request to Gemini API...");
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("API request timed out")), 15000);
    });
    
    // Race the API call against the timeout
    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      }),
      timeoutPromise
    ]);
    
    // If we got here, the API call completed before the timeout
    //@ts-ignore - result is treated as GenerateContentResult
    const response = result.response;
    if (!response) {
      console.error("Gemini API returned an empty response.");
      return res.status(500).json({ error: 'Gemini API returned empty response' });
    }

    const text = response.text();
    console.log("Successfully received response from Gemini API:", text);

    // Return success with the generated text
    return res.status(200).json({ 
      success: true,
      message: "Gemini API test successful",
      generatedText: text,
      modelUsed: modelName
    });
  } catch (error) {
    console.error("Gemini API test failed:", error);
    
    let errorDetails = '';
    if (error instanceof Error) {
      errorDetails = error.message;
      // Add stack trace in development
      if (process.env.NODE_ENV === 'development' && error.stack) {
        errorDetails += '\n' + error.stack;
      }
    } else {
      errorDetails = String(error);
    }
    
    return res.status(500).json({ 
      error: 'Gemini API test failed',
      details: errorDetails
    });
  }
}