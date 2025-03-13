// src/pages/api/test-gemini.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Test Gemini API called");
  
  try {
    // Get API key (try both environment variables)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false,
        error: 'Gemini API key not found in environment variables',
        envVars: {
          'hasGeminiKey': !!process.env.GEMINI_API_KEY,
          'hasNextPublicKey': !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
        }
      });
    }
    
    // First 4 chars of key for debugging
    const keyPreview = apiKey.substring(0, 4) + '...';
    console.log(`Using Gemini API key starting with: ${keyPreview}`);
    
    // Initialize Gemini with simplest possible configuration
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-pro model - the most reliable
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Use a very simple prompt
    const prompt = "Write one simple cooking tip in exactly one sentence.";
    
    console.log("Sending test request to Gemini API...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("Successfully received response:", text);
    
    return res.status(200).json({
      success: true,
      response: text,
      apiDetails: {
        model: "gemini-pro",
        keyStartsWith: keyPreview,
      }
    });
    
  } catch (error) {
    console.error("Test Gemini API error:", error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}