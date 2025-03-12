import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

type RecipeResponse = {
  recipes?: any[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecipeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingredients, equipment, staples, dietaryPrefs } = req.body;

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Construct the prompt
    const prompt = `
      Generate 3 brief recipes based on:
      - Ingredients: ${ingredients.join(', ')}
      - Equipment: ${equipment.join(', ')}
      - Staples: ${staples.join(', ')}
      - Restrictions: ${dietaryPrefs.join(', ')}

      For each recipe include: Recipe Name, Ingredients (with quantities), Instructions, Nutritional Facts, Servings, and Prep/Cook Times.
    `;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response (assuming it's formatted in a way we can parse)
    // This is a simplified example - you might need more sophisticated parsing
    const recipes = parseRecipes(text);

    return res.status(200).json({ recipes });
  } catch (error) {
    console.error('Error generating recipes:', error);
    return res.status(500).json({ error: 'Failed to generate recipes' });
  }
}

// Simple parser function (you'll need to adapt this based on the actual response format)
function parseRecipes(text: string) {
  // This is a placeholder - you'll need to implement proper parsing logic
  // based on how the Gemini API formats its responses
  const recipes = [];
  
  // Split by recipe (this is an example and will need adjustment)
  const recipeBlocks = text.split(/Recipe \d+:/g).filter(block => block.trim());
  
  for (const block of recipeBlocks) {
    const nameMatch = block.match(/(?:Recipe Name:|^)(.*?)(?:Ingredients:|$)/s);
    const ingredientsMatch = block.match(/Ingredients:(.*?)(?:Instructions:|$)/s);
    const instructionsMatch = block.match(/Instructions:(.*?)(?:Nutritional Facts:|$)/s);
    const nutritionalMatch = block.match(/Nutritional Facts:(.*?)(?:Servings:|$)/s);
    const servingsMatch = block.match(/Servings:(.*?)(?:Prep\/Cook Times:|$)/s);
    const timesMatch = block.match(/Prep\/Cook Times:(.*?)(?:$)/s);
    
    recipes.push({
      name: nameMatch ? nameMatch[1].trim() : 'Unknown Recipe',
      ingredients: ingredientsMatch ? ingredientsMatch[1].trim().split('\n').map(i => i.trim()) : [],
      instructions: instructionsMatch ? instructionsMatch[1].trim().split('\n').map(i => i.trim()) : [],
      nutritionalFacts: nutritionalMatch ? nutritionalMatch[1].trim() : '',
      servings: servingsMatch ? servingsMatch[1].trim() : '',
      times: timesMatch ? timesMatch[1].trim() : ''
    });
  }
  
  return recipes;
}
