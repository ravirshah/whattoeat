import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

type NutritionParseResponse = {
  recipe?: {
    name: string;
    ingredients: string[];
    instructions: string[];
    nutritionalFacts: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
    };
    servings: string;
    times: string;
    notes?: string;
  };
  nutritionEntry?: {
    items: Array<{
      name: string;
      amount: string;
      nutritionalFacts: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar: number;
        sodium: number;
      };
    }>;
    totalNutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
    };
    mealType?: string;
  };
  error?: string;
  apiInfo?: {
    error?: string;
    model?: string;
    environment?: string;
    isVercel?: boolean;
  };
  inputType?: 'simple_nutrition' | 'recipe_file' | 'recipe_text';
};

// Sample fallback responses for when API fails
const SAMPLE_NUTRITION_RESPONSES = {
  simple_nutrition: {
    items: [
      {
        name: "2% Milk",
        amount: "9 oz",
        nutritionalFacts: {
          calories: 137,
          protein: 8,
          carbs: 12,
          fat: 5,
          fiber: 0,
          sugar: 12,
          sodium: 107
        }
      },
      {
        name: "Legion Protein Powder",
        amount: "2 scoops",
        nutritionalFacts: {
          calories: 220,
          protein: 50,
          carbs: 2,
          fat: 2,
          fiber: 1,
          sugar: 1,
          sodium: 150
        }
      }
    ],
    totalNutrition: {
      calories: 357,
      protein: 58,
      carbs: 14,
      fat: 7,
      fiber: 1,
      sugar: 13,
      sodium: 257
    },
    mealType: "Breakfast"
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NutritionParseResponse>
) {
  console.log("Nutrition input parsing API called");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      console.error("No token provided");
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    console.log("Verifying token...");
    await adminAuth.verifyIdToken(token);

    const { textInput, fileContent, inputType = 'simple_nutrition', mealType } = req.body;

    if (!textInput && !fileContent) {
      return res.status(400).json({ error: 'Either text input or file content is required' });
    }

    // Try to parse with Gemini API
    try {
      console.log("Getting Gemini API key");
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found in environment variables");
        throw new Error("Gemini API key not found in environment");
      }

      console.log("Initializing Gemini API");
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = "gemini-2.0-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      let prompt = '';
      let expectedType = inputType;

      if (inputType === 'simple_nutrition' || (textInput && !fileContent)) {
        // Handle simple nutrition input like "9 oz of 2% milk and 2 scoops of legion protein"
        expectedType = 'simple_nutrition';
        prompt = `You are a nutrition expert AI. Parse the following food/nutrition input and extract detailed nutritional information.

## INPUT TO PARSE:
"${textInput}"

## TASK:
1. Identify individual food items and their quantities
2. Calculate detailed nutritional information for each item
3. Provide total nutritional summary
4. If a meal type is mentioned or can be inferred, include it

## OUTPUT FORMAT (JSON ONLY):
Return ONLY a valid JSON object with this exact structure:

{
  "items": [
    {
      "name": "Food Item Name",
      "amount": "Quantity with unit (e.g., '9 oz', '2 scoops', '1 cup')",
      "nutritionalFacts": {
        "calories": [number],
        "protein": [number in grams],
        "carbs": [number in grams],
        "fat": [number in grams],
        "fiber": [number in grams],
        "sugar": [number in grams],
        "sodium": [number in mg]
      }
    }
  ],
  "totalNutrition": {
    "calories": [sum of all calories],
    "protein": [sum of all protein],
    "carbs": [sum of all carbs],
    "fat": [sum of all fat],
    "fiber": [sum of all fiber],
    "sugar": [sum of all sugar],
    "sodium": [sum of all sodium]
  },
  "mealType": "${mealType || 'inferred meal type or null'}"
}

## REQUIREMENTS:
- Use accurate nutritional data for common foods
- Be precise with quantities and conversions
- If an item is unclear, make reasonable assumptions
- Include all nutrients even if some are 0
- Ensure totals are mathematically correct`;

      } else if (inputType === 'recipe_file' || inputType === 'recipe_text') {
        // Handle full recipe parsing from file content or long text
        const content = fileContent || textInput;
        expectedType = 'recipe_file';
        prompt = `You are a professional recipe and nutrition expert. Parse the following recipe content and extract comprehensive recipe information with detailed nutritional analysis.

## RECIPE CONTENT TO PARSE:
${content}

## OUTPUT FORMAT (JSON ONLY):
Return ONLY a valid JSON object with this exact structure:

{
  "name": "Recipe Name",
  "ingredients": [
    "Precise measurement + ingredient name",
    "Example: 2 cups all-purpose flour",
    "1 tsp vanilla extract"
  ],
  "instructions": [
    "Step 1: Detailed instruction",
    "Step 2: Another step with specific details",
    "Step 3: Continue with precise directions"
  ],
  "nutritionalFacts": {
    "calories": [total calories per serving],
    "protein": [grams per serving],
    "carbs": [grams per serving],
    "fat": [grams per serving],
    "fiber": [grams per serving],
    "sugar": [grams per serving],
    "sodium": [mg per serving]
  },
  "servings": "Serves [number] people",
  "times": "Prep: [X] min | Cook: [Y] min | Total: [Z] min",
  "notes": "Any additional notes or tips from the recipe"
}

## REQUIREMENTS:
- Extract all ingredients with precise measurements
- Break down instructions into clear, numbered steps
- Calculate nutritional information per serving
- Estimate realistic prep/cook times
- Determine serving size from content
- If serving size is unclear, assume serves 4
- Use standard recipe format and terminology`;
      }

      console.log("Sending request to Gemini API...");
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent parsing
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const response = result.response;
      if (!response) {
        console.error("Gemini API returned an empty response");
        throw new Error("Empty response from Gemini API");
      }

      const text = response.text();
      console.log("Successfully received response from Gemini API");
      console.log("Response length:", text.length);
      
      // Parse the JSON response
      try {
        // Extract JSON from the text
        const jsonRegex = /\{[\s\S]*\}/;
        const match = text.match(jsonRegex);
        
        if (!match) {
          console.error("Failed to extract JSON from Gemini response");
          console.error("Response text (first 500 chars):", text.substring(0, 500));
          throw new Error("Invalid response format");
        }
        
        const jsonStr = match[0];
        const parsedData = JSON.parse(jsonStr);
        
        console.log("Successfully parsed nutrition data from API response");
        
        if (expectedType === 'simple_nutrition') {
          return res.status(200).json({ 
            nutritionEntry: parsedData,
            inputType: 'simple_nutrition'
          });
        } else {
          return res.status(200).json({ 
            recipe: parsedData,
            inputType: 'recipe_file'
          });
        }
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        console.error("Raw response text:", text);
        throw new Error("Failed to parse nutrition data");
      }
    } catch (geminiError) {
      console.error("Gemini API error (detailed):", {
        error: geminiError,
        message: geminiError instanceof Error ? geminiError.message : String(geminiError),
      });
      console.log("Using fallback nutrition data instead");
      
      // Return sample nutrition data
      if (inputType === 'simple_nutrition') {
        return res.status(200).json({ 
          nutritionEntry: SAMPLE_NUTRITION_RESPONSES.simple_nutrition,
          inputType: 'simple_nutrition',
          apiInfo: {
            error: geminiError instanceof Error ? geminiError.message : String(geminiError),
            model: "fallback",
            environment: process.env.NODE_ENV,
            isVercel: !!process.env.VERCEL
          }
        });
      } else {
        // Fallback recipe for file/text input
        return res.status(200).json({ 
          recipe: {
            name: "Parsed Recipe (Fallback)",
            ingredients: [
              "2 cups flour",
              "1 cup sugar", 
              "2 eggs",
              "1/2 cup butter"
            ],
            instructions: [
              "Mix dry ingredients in a bowl",
              "Cream butter and sugar", 
              "Add eggs and combine",
              "Bake at 350°F for 25 minutes"
            ],
            nutritionalFacts: {
              calories: 250,
              protein: 4,
              carbs: 35,
              fat: 10,
              fiber: 1,
              sugar: 20,
              sodium: 150
            },
            servings: "Serves 8",
            times: "Prep: 15 min | Cook: 25 min | Total: 40 min",
            notes: "This is a fallback recipe - please try again for accurate parsing"
          },
          inputType: 'recipe_file',
          apiInfo: {
            error: geminiError instanceof Error ? geminiError.message : String(geminiError),
            model: "fallback"
          }
        });
      }
    }
  } catch (error) {
    console.error("General error in nutrition parsing:", error);
    return res.status(500).json({ 
      error: 'Failed to parse nutrition input',
      apiInfo: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
} 