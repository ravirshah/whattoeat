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
    // Get the API key
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
    
    // Use gemini-pro model for a simple test
    const modelName = "gemini-2.0-flash";
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Simple test prompt
    const prompt = "Write one simple cooking tip in exactly one sentence.";

    console.log("Sending simple test request to Gemini API...");
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });

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
      generatedText: text
    });
  } catch (error) {
    console.error("Gemini API test failed:", error);
    return res.status(500).json({ 
      error: 'Gemini API test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}