import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { adminAuth } from '@/lib/firebase-admin';

type GoalRecipeResponse = {
  recipes?: any[];
  error?: string;
  goalInfo?: {
    goalType: string;
    macroTargets: any;
  };
  apiInfo?: {
    error?: string;
    model?: string;
  };
};

// Enhanced recipe structure with detailed nutritional information
const SAMPLE_GOAL_RECIPES = {
  weight_loss: [
    {
      name: "Lean Chicken & Vegetable Bowl",
      ingredients: [
        "4 oz boneless, skinless chicken breast",
        "2 cups mixed leafy greens (spinach, arugula)",
        "1/2 cup cherry tomatoes, halved",
        "1/2 cucumber, diced",
        "1/4 avocado, sliced",
        "1 tbsp olive oil",
        "1 tbsp lemon juice",
        "Salt and pepper to taste"
      ],
      instructions: [
        "Season chicken breast with salt and pepper.",
        "Heat a non-stick pan over medium-high heat and cook chicken for 6-7 minutes per side until internal temperature reaches 165°F.",
        "Let chicken rest for 3 minutes, then slice into strips.",
        "In a bowl, combine mixed greens, tomatoes, cucumber.",
        "Top with sliced chicken and avocado.",
        "Whisk olive oil and lemon juice, drizzle over salad.",
        "Season with salt and pepper to taste."
      ],
      nutritionalFacts: {
        calories: 285,
        protein: 35,
        carbs: 8,
        fat: 12,
        fiber: 6,
        sugar: 4,
        sodium: 85
      },
      servings: "Serves 1",
      times: "Prep: 10 min | Cook: 15 min | Total: 25 min",
      goalAlignment: {
        macroFit: "High protein, low carb - perfect for weight loss",
        calorieTarget: "Under 300 calories per serving",
        nutritionalBenefits: "Lean protein supports muscle preservation during weight loss"
      }
    },
    {
      name: "Zucchini Noodle Shrimp Bowl",
      ingredients: [
        "5 oz large shrimp, peeled and deveined",
        "2 medium zucchini, spiralized",
        "1 cup cherry tomatoes",
        "2 cloves garlic, minced",
        "1 tbsp olive oil",
        "1 tbsp fresh basil",
        "1 tsp lemon zest",
        "Red pepper flakes to taste"
      ],
      instructions: [
        "Heat olive oil in a large pan over medium-high heat.",
        "Add garlic and cook for 30 seconds until fragrant.",
        "Add shrimp and cook 2-3 minutes per side until pink.",
        "Add cherry tomatoes and cook until slightly softened.",
        "Add zucchini noodles and toss for 1-2 minutes until just heated.",
        "Remove from heat, add basil, lemon zest, and red pepper flakes.",
        "Serve immediately while hot."
      ],
      nutritionalFacts: {
        calories: 245,
        protein: 32,
        carbs: 12,
        fat: 8,
        fiber: 4,
        sugar: 8,
        sodium: 95
      },
      servings: "Serves 1",
      times: "Prep: 15 min | Cook: 10 min | Total: 25 min",
      goalAlignment: {
        macroFit: "Very high protein, very low carb",
        calorieTarget: "Well under 300 calories",
        nutritionalBenefits: "Low calorie, nutrient dense vegetables"
      }
    }
  ],
  muscle_gain: [
    {
      name: "High-Protein Quinoa Power Bowl",
      ingredients: [
        "6 oz lean ground turkey",
        "3/4 cup cooked quinoa",
        "1/2 cup black beans, rinsed",
        "1/2 sweet potato, roasted and cubed",
        "2 tbsp Greek yogurt",
        "1 tbsp almond butter",
        "1 tsp olive oil",
        "Handful of spinach"
      ],
      instructions: [
        "Cook ground turkey in a pan with olive oil until browned and cooked through.",
        "Roast sweet potato cubes at 400°F for 20 minutes until tender.",
        "Prepare quinoa according to package directions.",
        "Warm black beans in a small pan.",
        "Layer spinach, quinoa, turkey, beans, and sweet potato in a bowl.",
        "Mix Greek yogurt with almond butter for a protein-rich sauce.",
        "Drizzle sauce over bowl and serve immediately."
      ],
      nutritionalFacts: {
        calories: 485,
        protein: 42,
        carbs: 35,
        fat: 18,
        fiber: 8,
        sugar: 6,
        sodium: 320
      },
      servings: "Serves 1",
      times: "Prep: 15 min | Cook: 25 min | Total: 40 min",
      goalAlignment: {
        macroFit: "High protein and complex carbs for muscle building",
        calorieTarget: "Calorie-dense for muscle gain",
        nutritionalBenefits: "Complete proteins and energy for workouts"
      }
    }
  ],
  maintenance: [
    {
      name: "Balanced Salmon & Vegetable Plate",
      ingredients: [
        "5 oz salmon fillet",
        "1 cup roasted broccoli",
        "1/2 cup brown rice",
        "1 tbsp olive oil",
        "1 tsp herbs de Provence",
        "Lemon wedges",
        "Salt and pepper to taste"
      ],
      instructions: [
        "Preheat oven to 425°F.",
        "Season salmon with herbs, salt, and pepper.",
        "Roast salmon for 12-15 minutes until flaky.",
        "Steam or roast broccoli until tender-crisp.",
        "Prepare brown rice according to package directions.",
        "Drizzle olive oil over vegetables.",
        "Serve with lemon wedges."
      ],
      nutritionalFacts: {
        calories: 420,
        protein: 35,
        carbs: 28,
        fat: 18,
        fiber: 5,
        sugar: 3,
        sodium: 180
      },
      servings: "Serves 1",
      times: "Prep: 10 min | Cook: 20 min | Total: 30 min",
      goalAlignment: {
        macroFit: "Balanced macros for maintenance",
        calorieTarget: "Moderate calories for weight maintenance",
        nutritionalBenefits: "Omega-3s and fiber for overall health"
      }
    }
  ]
};

// Build goal-specific prompt
const buildGoalBasedPrompt = (goalData: any, mealType?: string, servings: number = 1, carbBase?: string, customPreferences?: string) => {
  const { goalType, macroTargets, dietaryRestrictions = [], healthBasedAdjustments } = goalData;
  
  let goalDescription = "";
  let macroGuidelines = "";
  let calorieTarget = "";
  
  switch (goalType) {
    case 'weight_loss':
      goalDescription = "weight loss and fat burning";
      macroGuidelines = "High protein (30-40% of calories), moderate healthy fats (25-30%), lower carbs (30-40%) focusing on fiber-rich vegetables and complex carbs";
      calorieTarget = macroTargets.perMeal?.calories ? `Target: ${macroTargets.perMeal.calories} calories per serving` : "Target: 250-400 calories per serving";
      break;
    case 'muscle_gain':
      goalDescription = "muscle building and strength gains";
      macroGuidelines = "High protein (25-35% of calories), moderate to high carbs (40-50%) for energy, moderate healthy fats (20-25%)";
      calorieTarget = macroTargets.perMeal?.calories ? `Target: ${macroTargets.perMeal.calories} calories per serving` : "Target: 400-600 calories per serving";
      break;
    case 'maintenance':
      goalDescription = "maintaining current weight and overall health";
      macroGuidelines = "Balanced macros: protein (20-30%), carbs (45-55%), fats (20-30%)";
      calorieTarget = macroTargets.perMeal?.calories ? `Target: ${macroTargets.perMeal.calories} calories per serving` : "Target: 350-500 calories per serving";
      break;
    default:
      goalDescription = "custom nutritional goals";
      macroGuidelines = "Follow the specific macro targets provided";
      calorieTarget = macroTargets.perMeal?.calories ? `Target: ${macroTargets.perMeal.calories} calories per serving` : "Target: 300-500 calories per serving";
  }

  const mealTypeGuidance = mealType ? `
### MEAL TYPE SPECIFIC REQUIREMENTS:
This recipe is for ${mealType}. Adjust the recipe characteristics accordingly:
- **Breakfast**: Include energizing ingredients, consider prep time for busy mornings
- **Lunch**: Balanced meal that can be meal-prepped, sustaining energy
- **Dinner**: Can be more complex, focus on satisfaction and recovery
- **Snack**: Smaller portions, quick to prepare, nutrient-dense
` : '';

  const carbBaseGuidance = carbBase ? `
### CARB BASE REQUIREMENT:
Include ${carbBase} as the primary carbohydrate source in the recipe.
` : '';

  const customPreferencesGuidance = customPreferences ? `
### CUSTOM USER PREFERENCES (HIGH PRIORITY - INCORPORATE INTO RECIPES):
The user has specified these additional preferences that should be integrated into the recipes:
**Custom Requirements**: ${customPreferences}

**Integration Instructions**: 
- Prioritize these preferences while maintaining nutritional targets
- If preferences conflict with goals, find creative ways to balance both
- Consider these preferences for cuisine type, cooking methods, ingredient choices, spice levels, and special requirements
- Adapt cooking techniques and flavor profiles to match these preferences
` : '';

  // NEW: Health-based guidance from health documents
  const healthGuidance = healthBasedAdjustments ? `
### HEALTH-BASED DIETARY REQUIREMENTS (CRITICAL - MUST FOLLOW):
Based on health document analysis, apply these specific dietary modifications:

**AVOID these ingredients**: ${healthBasedAdjustments.avoidIngredients?.length ? healthBasedAdjustments.avoidIngredients.join(', ') : 'None specified'}

**PRIORITIZE these ingredients**: ${healthBasedAdjustments.recommendIngredients?.length ? healthBasedAdjustments.recommendIngredients.join(', ') : 'None specified'}

**Macro modifications**: ${healthBasedAdjustments.macroModifications?.length ? healthBasedAdjustments.macroModifications.join('; ') : 'None specified'}

**Health considerations**: Focus on ingredients that support the user's specific health profile and avoid anything that could negatively impact their health markers.
` : '';

  const proteinTarget = macroTargets.perMeal?.protein || macroTargets.daily?.protein ? 
    `Protein target: ${macroTargets.perMeal?.protein || Math.round((macroTargets.daily?.protein || 100) / 3)}g per serving` : 
    "Aim for 20-35g protein per serving";

  return `You are a nutrition-focused AI chef specializing in goal-based meal planning with health document integration. Generate exactly 3 recipes that STRICTLY align with the user's specific fitness, nutritional goals, AND health requirements.

## PRIMARY GOAL: ${goalDescription.toUpperCase()}

### NUTRITIONAL PARAMETERS (CRITICAL - MUST FOLLOW EXACTLY):
**Calorie Target**: ${calorieTarget}
**Protein Requirement**: ${proteinTarget}
**Macro Distribution**: ${macroGuidelines}
**Servings**: ${servings} serving${servings > 1 ? 's' : ''}

${mealTypeGuidance}
${carbBaseGuidance}
${customPreferencesGuidance}
${healthGuidance}

### DIETARY RESTRICTIONS (ABSOLUTELY CRITICAL - STRICTLY ENFORCE):
${dietaryRestrictions.length > 0 ? 
  `REQUIRED DIETARY COMPLIANCE: ${dietaryRestrictions.join(', ')}

**IMPORTANT DIETARY DEFINITIONS:**
${dietaryRestrictions.includes('vegetarian') ? '- VEGETARIAN: NO meat, poultry, fish, seafood, or any animal flesh. Eggs and dairy are allowed.' : ''}
${dietaryRestrictions.includes('vegan') ? '- VEGAN: NO animal products whatsoever - no meat, fish, dairy, eggs, honey, or any animal-derived ingredients.' : ''}
${dietaryRestrictions.includes('pescatarian') ? '- PESCATARIAN: NO meat or poultry, but fish and seafood are allowed. Eggs and dairy are allowed.' : ''}
${dietaryRestrictions.includes('gluten_free') ? '- GLUTEN-FREE: NO wheat, barley, rye, or any gluten-containing ingredients.' : ''}
${dietaryRestrictions.includes('dairy_free') ? '- DAIRY-FREE: NO milk, cheese, butter, cream, yogurt, or any dairy products.' : ''}
${dietaryRestrictions.includes('nut_free') ? '- NUT-FREE: NO tree nuts, peanuts, or any nut-derived ingredients.' : ''}

**RESTRICTION COMPLIANCE CHECK**: Before including ANY ingredient, verify it complies with ALL dietary restrictions listed above. If unsure about an ingredient, DO NOT include it.` 
  : 'No specific dietary restrictions'}

### DETAILED MACRO TARGETS:
${macroTargets.daily ? `
Daily Targets:
- Calories: ${macroTargets.daily.calories || 'Not specified'}
- Protein: ${macroTargets.daily.protein || 'Not specified'}g
- Carbs: ${macroTargets.daily.carbs || 'Not specified'}g
- Fat: ${macroTargets.daily.fat || 'Not specified'}g
- Fiber: ${macroTargets.daily.fiber || 'Not specified'}g
` : 'Daily targets not specified'}

${macroTargets.perMeal ? `
Per Meal Targets:
- Calories: ${macroTargets.perMeal.calories || 'Not specified'}
- Protein: ${macroTargets.perMeal.protein || 'Not specified'}g
` : ''}

## RESPONSE FORMAT (JSON ONLY):

Return ONLY a valid JSON array with this exact structure:

[
  {
    "name": "Health-Optimized Recipe Name",
    "ingredients": [
      "Precise measurement + ingredient name with nutritional purpose"
    ],
    "instructions": [
      "Step 1: Detailed cooking instruction with nutritional preservation tips"
    ],
    "nutritionalFacts": {
      "calories": [exact number],
      "protein": [exact grams],
      "carbs": [exact grams],
      "fat": [exact grams],
      "fiber": [exact grams],
      "sugar": [exact grams],
      "sodium": [exact mg]
    },
    "servings": "Serves ${servings}",
    "times": "Prep: [X] min | Cook: [X] min | Total: [X] min",
    "goalAlignment": {
      "macroFit": "Explanation of how macros align with goal",
      "calorieTarget": "How calories fit the goal",
      "nutritionalBenefits": "Key nutrients that support the goal and health profile",
      "healthOptimization": "How this recipe specifically addresses health document findings"
    }
  }
]

## CRITICAL FINAL CHECKS BEFORE GENERATING:
1. **DIETARY RESTRICTION VERIFICATION**: For each ingredient in every recipe, confirm it meets ALL dietary restrictions
2. **VEGETARIAN CHECK**: If vegetarian is required, ensure NO meat, poultry, fish, or seafood appears anywhere
3. **HEALTH ALIGNMENT**: Verify ingredients support health goals and avoid contraindicated foods
4. **MACRO ACCURACY**: Double-check nutritional calculations align with targets

Generate recipes that not only meet nutritional targets but also optimize for the user's specific health profile, taste delicious, and are practical to prepare.

**REMEMBER: A single non-compliant ingredient makes the entire recipe unusable for the user. When in doubt, choose plant-based alternatives.**`;
};

export async function POST(request: NextRequest) {
  console.log("Goal-based recipe generation API called");
  
  // Get auth token from request
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
  }

  try {
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log(`Token verified for user: ${userId}`);

    // Get input data from request
    const { goalData, mealType, servings = 1, carbBase, customPreferences } = await request.json();
    
    if (!goalData) {
      return NextResponse.json({ error: 'Goal data is required' }, { status: 400 });
    }

    console.log(`Generating recipes for goal: ${goalData.goalType}, meal type: ${mealType || 'any'}, servings: ${servings}`);
    console.log('Goal dietary restrictions:', goalData.dietaryRestrictions);
    console.log('Goal health adjustments:', goalData.healthBasedAdjustments);
    console.log('Custom preferences:', customPreferences);

    // Try to generate recipes with Gemini API
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found");
        throw new Error("Gemini API key not found");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = buildGoalBasedPrompt(goalData, mealType, servings, carbBase, customPreferences);
      
      console.log("Sending goal-based request to Gemini API...");
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
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
      const text = response.text();
      
      console.log("Successfully received goal-based response from Gemini API");
      
      // Parse the JSON response
      try {
        const jsonRegex = /\[\s*\{.*\}\s*\]/s;
        const match = text.match(jsonRegex);
        
        if (!match) {
          console.error("Failed to extract JSON from Gemini response");
          throw new Error("Invalid response format");
        }
        
        const jsonStr = match[0];
        const recipes = JSON.parse(jsonStr);
        
        if (!Array.isArray(recipes) || recipes.length === 0) {
          throw new Error("Invalid recipes format");
        }
        
        console.log(`Successfully parsed ${recipes.length} goal-based recipes`);
        return NextResponse.json({ 
          recipes,
          goalInfo: {
            goalType: goalData.goalType,
            macroTargets: goalData.macroTargets
          }
        });
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse recipe data");
      }
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      console.log("Using fallback goal-based recipes");
      
      // Return goal-appropriate sample recipes with dietary filtering
      const goalType = goalData.goalType || 'maintenance';
      let fallbackRecipes = SAMPLE_GOAL_RECIPES[goalType as keyof typeof SAMPLE_GOAL_RECIPES] || SAMPLE_GOAL_RECIPES.weight_loss;
      
      // Filter recipes based on dietary restrictions
      const dietaryRestrictions = goalData.dietaryRestrictions || [];
      if (dietaryRestrictions.length > 0) {
        fallbackRecipes = fallbackRecipes.filter(recipe => {
          const recipeName = recipe.name.toLowerCase();
          const ingredientsList = recipe.ingredients.join(' ').toLowerCase();
          
          // Check vegetarian compliance
          if (dietaryRestrictions.includes('vegetarian')) {
            const nonVegItems = ['salmon', 'chicken', 'beef', 'pork', 'turkey', 'fish', 'seafood', 'meat', 'shrimp'];
            if (nonVegItems.some(item => recipeName.includes(item) || ingredientsList.includes(item))) {
              return false;
            }
          }
          
          // Check vegan compliance  
          if (dietaryRestrictions.includes('vegan')) {
            const nonVeganItems = ['salmon', 'chicken', 'beef', 'pork', 'turkey', 'fish', 'seafood', 'meat', 'shrimp', 'egg', 'milk', 'cheese', 'yogurt', 'butter', 'cream'];
            if (nonVeganItems.some(item => recipeName.includes(item) || ingredientsList.includes(item))) {
              return false;
            }
          }
          
          // Check dairy-free compliance
          if (dietaryRestrictions.includes('dairy_free')) {
            const dairyItems = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy'];
            if (dairyItems.some(item => recipeName.includes(item) || ingredientsList.includes(item))) {
              return false;
            }
          }
          
          return true;
        });
        
        // If no recipes remain after filtering, use vegetarian fallbacks
        if (fallbackRecipes.length === 0) {
          fallbackRecipes = [{
            name: "Mediterranean Quinoa Power Bowl",
            ingredients: [
              "3/4 cup cooked quinoa",
              "1/2 cup chickpeas, rinsed and drained",
              "1/4 cup cherry tomatoes, halved",
              "1/4 cucumber, diced",
              "2 tbsp red onion, finely chopped",
              "2 tbsp kalamata olives, pitted",
              "2 tbsp feta cheese, crumbled",
              "1 tbsp extra virgin olive oil",
              "1 tbsp lemon juice",
              "1 tsp dried oregano",
              "Fresh parsley for garnish"
            ],
            instructions: [
              "Cook quinoa according to package directions and let cool slightly.",
              "In a large bowl, combine quinoa, chickpeas, tomatoes, cucumber, and red onion.",
              "Add olives and feta cheese.",
              "Whisk together olive oil, lemon juice, and oregano.",
              "Drizzle dressing over bowl and toss gently.",
              "Garnish with fresh parsley and serve."
            ],
            nutritionalFacts: {
              calories: 385,
              protein: 16,
              carbs: 48,
              fat: 14,
              fiber: 9,
              sugar: 6,
              sodium: 420
            },
            servings: "Serves 1",
            times: "Prep: 10 min | Cook: 15 min | Total: 25 min",
            goalAlignment: {
              macroFit: "Balanced plant-based protein and complex carbs",
              calorieTarget: "Moderate calories suitable for most goals",
              nutritionalBenefits: "Complete protein from quinoa, fiber from chickpeas, healthy fats from olive oil"
            }
          }];
        }
      }
      
      return NextResponse.json({ 
        recipes: fallbackRecipes,
        goalInfo: {
          goalType: goalData.goalType,
          macroTargets: goalData.macroTargets
        },
        apiInfo: {
          error: geminiError instanceof Error ? geminiError.message : String(geminiError),
          model: "fallback"
        }
      });
    }
  } catch (error: any) {
    console.error('Error in goal-based recipe generation:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
    }
    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate goal-based recipes',
    }, { status: 500 });
  }
} 