import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HealthDocument, MacroTarget } from '@/types/weekly-planner';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface HealthMetricRanges {
  cholesterolTotal: { low: number; high: number; optimal: number };
  cholesterolLDL: { low: number; high: number; optimal: number };
  cholesterolHDL: { low: number; high: number; optimal: number };
  triglycerides: { low: number; high: number; optimal: number };
  glucose: { low: number; high: number; optimal: number };
  hemoglobinA1c: { low: number; high: number; optimal: number };
  vitaminD: { low: number; high: number; optimal: number };
  BMI: { underweight: number; normal: number; overweight: number; obese: number };
  bodyFatMale: { athletic: number; fitness: number; average: number; obese: number };
  bodyFatFemale: { athletic: number; fitness: number; average: number; obese: number };
  bloodPressure: { low: { systolic: number; diastolic: number }; normal: { systolic: number; diastolic: number }; high: { systolic: number; diastolic: number } };
}

const HEALTH_RANGES: HealthMetricRanges = {
  cholesterolTotal: { low: 200, high: 240, optimal: 180 },
  cholesterolLDL: { low: 100, high: 160, optimal: 70 },
  cholesterolHDL: { low: 40, high: 60, optimal: 60 },
  triglycerides: { low: 150, high: 200, optimal: 100 },
  glucose: { low: 100, high: 126, optimal: 85 },
  hemoglobinA1c: { low: 5.7, high: 6.5, optimal: 5.0 },
  vitaminD: { low: 30, high: 50, optimal: 40 },
  BMI: { underweight: 18.5, normal: 25, overweight: 30, obese: 35 },
  bodyFatMale: { athletic: 14, fitness: 17, average: 25, obese: 30 },
  bodyFatFemale: { athletic: 20, fitness: 24, average: 32, obese: 38 },
  bloodPressure: { 
    low: { systolic: 90, diastolic: 60 }, 
    normal: { systolic: 120, diastolic: 80 }, 
    high: { systolic: 140, diastolic: 90 } 
  }
};

interface GoalSuggestion {
  goalType: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'custom';
  goalName: string;
  description: string;
  macroTargets: {
    daily: MacroTarget;
    perMeal: MacroTarget;
  };
  dietaryRestrictions: string[];
  healthBasedAdjustments: {
    avoidIngredients: string[];
    recommendIngredients: string[];
    macroModifications: string[];
    supplementSuggestions: string[];
  };
  confidence: number; // 0-100 confidence score
  reasoning: string[];
}

const buildHealthAnalysisPrompt = (healthDocs: HealthDocument[], userInfo?: { age?: number; gender?: 'male' | 'female'; activityLevel?: string }) => {
  const healthData = healthDocs.map(doc => ({
    type: doc.fileType,
    data: doc.parsedData,
    summary: doc.aiSummary,
    date: doc.uploadedAt
  }));

  return `You are an expert nutritionist and health coach AI. Analyze the following health documents and provide intelligent, evidence-based meal planning goal suggestions.

## HEALTH DOCUMENTS ANALYSIS:
${JSON.stringify(healthData, null, 2)}

## USER INFO:
${userInfo ? JSON.stringify(userInfo, null, 2) : 'Not provided'}

## ANALYSIS TASK:
Based on the health data provided, generate a comprehensive goal suggestion that prioritizes the user's health needs. Consider the following:

### HEALTH METRIC ANALYSIS:
For each metric found in the documents, assess if it's:
- Within optimal range
- Elevated (above normal)
- Below optimal range
- Concerning (requiring dietary intervention)

### KEY CONSIDERATIONS:
1. **Cardiovascular Health**: Cholesterol levels, blood pressure, BMI
2. **Metabolic Health**: Glucose, HbA1c, insulin resistance indicators  
3. **Body Composition**: Body fat percentage, muscle mass, BMI
4. **Nutritional Status**: Vitamin deficiencies, mineral levels
5. **Inflammation Markers**: Any inflammatory indicators mentioned

### GOAL TYPE DETERMINATION:
- **Weight Loss**: If BMI >25, high body fat %, elevated cholesterol, pre-diabetic markers
- **Muscle Gain**: If low muscle mass, healthy metabolic markers, athletic goals
- **Maintenance**: If most metrics in healthy range, focusing on optimization
- **Custom**: If specific health conditions require specialized approach

## OUTPUT FORMAT (JSON ONLY):

Return ONLY a valid JSON object with this structure:

{
  "goalType": "weight_loss|muscle_gain|maintenance|custom",
  "goalName": "Descriptive goal name based on health needs",
  "description": "2-3 sentence explanation of why this goal suits the user's health profile",
  "macroTargets": {
    "daily": {
      "calories": [number],
      "protein": [number],
      "carbs": [number], 
      "fat": [number],
      "fiber": [number]
    },
    "perMeal": {
      "calories": [number],
      "protein": [number],
      "carbs": [number],
      "fat": [number], 
      "fiber": [number]
    }
  },
  "dietaryRestrictions": ["specific restrictions based on health conditions"],
  "healthBasedAdjustments": {
    "avoidIngredients": ["foods to limit based on health markers"],
    "recommendIngredients": ["foods to emphasize for health improvement"],
    "macroModifications": ["specific macro adjustments with reasoning"],
    "supplementSuggestions": ["evidence-based supplement recommendations"]
  },
  "confidence": [0-100 number representing confidence in recommendation],
  "reasoning": ["Bullet points explaining the key health factors driving this recommendation"]
}

## MACRO TARGET GUIDELINES:

**Calories**: Base on estimated needs considering:
- BMR from body composition if available
- Activity level adjustments
- Goals (deficit for weight loss, surplus for muscle gain)
- Metabolic health status

**Protein**: 
- Weight loss: 1.2-1.6g per kg body weight
- Muscle gain: 1.6-2.2g per kg body weight  
- Maintenance: 1.0-1.2g per kg body weight
- Higher if muscle preservation during weight loss

**Carbohydrates**:
- Diabetic/pre-diabetic: Lower carbs (100-150g)
- Active individuals: Moderate to high (200-300g)
- Weight loss: Moderate (120-180g)
- Prioritize complex carbs for blood sugar control

**Fats**:
- Heart health focus: Emphasize unsaturated fats
- 20-35% of total calories
- Higher if following lower carb approach
- Omega-3 emphasis if inflammatory markers

**Fiber**:
- Minimum 25g for women, 35g for men
- Higher (35-45g) if digestive health concerns
- Gradual increase to avoid discomfort

## DIETARY RESTRICTIONS LOGIC:
- "low_sodium" if blood pressure >130/80
- "heart_healthy" if cholesterol issues
- "diabetic_friendly" if glucose >100 or HbA1c >5.7
- "anti_inflammatory" if inflammatory markers
- "low_saturated_fat" if cholesterol >200

## IMPORTANT GUIDELINES:
- Base recommendations on clinical evidence
- Consider interactions between conditions
- Prioritize most concerning health markers
- Provide actionable, specific guidance
- Be conservative with supplement suggestions
- Acknowledge when medical consultation is needed
- Focus on sustainable, realistic targets

## SAFETY CONSIDERATIONS:
- Never provide medical diagnoses
- Emphasize dietary approach as complementary to medical care
- Recommend medical follow-up for concerning values
- Focus on evidence-based nutrition interventions`;
};

export async function POST(request: NextRequest) {
  console.log("Goal suggestions API called");
  
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
    const { healthDocuments, userInfo } = await request.json();
    
    if (!healthDocuments || !Array.isArray(healthDocuments) || healthDocuments.length === 0) {
      return NextResponse.json({ error: 'Health documents are required for goal suggestions' }, { status: 400 });
    }

    console.log(`Generating goal suggestions based on ${healthDocuments.length} health documents`);

    // Filter only active health documents
    const activeHealthDocs = healthDocuments.filter((doc: HealthDocument) => doc.isActive);
    
    if (activeHealthDocs.length === 0) {
      return NextResponse.json({ 
        error: 'No active health documents found. Please activate at least one health document in your profile.' 
      }, { status: 400 });
    }

    // Build the AI prompt
    const prompt = buildHealthAnalysisPrompt(activeHealthDocs, userInfo);

    // Generate suggestions using Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    console.log("Sending request to Gemini AI for goal suggestions");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiText = response.text();
    
    console.log("Raw AI response received:", aiText.substring(0, 200) + "...");

    // Clean up the response to extract JSON
    aiText = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Find the start and end of JSON object
    const jsonStart = aiText.indexOf('{');
    const jsonEnd = aiText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const jsonText = aiText.substring(jsonStart, jsonEnd);
    
    try {
      const goalSuggestion: GoalSuggestion = JSON.parse(jsonText);
      
      // Validate the response structure
      if (!goalSuggestion.goalType || !goalSuggestion.goalName || !goalSuggestion.macroTargets) {
        throw new Error('Invalid goal suggestion structure');
      }

      // Ensure per-meal targets are calculated
      if (!goalSuggestion.macroTargets.perMeal) {
        goalSuggestion.macroTargets.perMeal = {
          calories: Math.round((goalSuggestion.macroTargets.daily.calories || 2000) / 3),
          protein: Math.round((goalSuggestion.macroTargets.daily.protein || 100) / 3),
          carbs: Math.round((goalSuggestion.macroTargets.daily.carbs || 200) / 3),
          fat: Math.round((goalSuggestion.macroTargets.daily.fat || 70) / 3),
          fiber: Math.round((goalSuggestion.macroTargets.daily.fiber || 25) / 3)
        };
      }

      // Add health analysis summary
      const healthAnalysis = analyzeHealthMetrics(activeHealthDocs);
      
      console.log("Successfully generated goal suggestion");
      return NextResponse.json({
        suggestion: goalSuggestion,
        healthAnalysis,
        documentsAnalyzed: activeHealthDocs.length,
        timestamp: new Date().toISOString()
      });

    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      console.error('AI response text:', jsonText);
      
      // Fallback: return a basic suggestion based on health metrics
      const fallbackSuggestion = generateFallbackSuggestion(activeHealthDocs);
      
      return NextResponse.json({
        suggestion: fallbackSuggestion,
        healthAnalysis: analyzeHealthMetrics(activeHealthDocs),
        documentsAnalyzed: activeHealthDocs.length,
        timestamp: new Date().toISOString(),
        note: 'AI response parsing failed, using fallback analysis'
      });
    }

  } catch (error) {
    console.error('Error generating goal suggestions:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable. Please try again later.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate goal suggestions. Please try again.' 
    }, { status: 500 });
  }
}

// Fallback suggestion generator when AI parsing fails
function generateFallbackSuggestion(healthDocs: HealthDocument[]): GoalSuggestion {
  const analysis = analyzeHealthMetrics(healthDocs);
  
  // Determine goal type based on key health indicators
  let goalType: GoalSuggestion['goalType'] = 'maintenance';
  let goalName = 'Health Optimization';
  let description = 'Maintain current health status with balanced nutrition.';
  
  // Check for weight management needs
  const hasHighBMI = healthDocs.some(doc => doc.parsedData.BMI && doc.parsedData.BMI > 25);
  const hasHighBodyFat = healthDocs.some(doc => doc.parsedData.bodyFatPercentage && doc.parsedData.bodyFatPercentage > 25);
  
  // Check for metabolic concerns
  const hasMetabolicConcerns = healthDocs.some(doc => 
    (doc.parsedData.glucose && doc.parsedData.glucose > 100) ||
    (doc.parsedData.hemoglobinA1c && doc.parsedData.hemoglobinA1c > 5.7) ||
    (doc.parsedData.cholesterolTotal && doc.parsedData.cholesterolTotal > 200)
  );

  if (hasHighBMI || hasHighBodyFat || hasMetabolicConcerns) {
    goalType = 'weight_loss';
    goalName = 'Health-Focused Weight Management';
    description = 'Gradual weight loss to improve metabolic health markers and reduce health risks.';
  }

  // Basic macro calculation
  const baseDailyCalories = goalType === 'weight_loss' ? 1600 : 2000;
  const dailyProtein = goalType === 'weight_loss' ? 120 : 100;
  const dailyCarbs = hasMetabolicConcerns ? 120 : 200;
  const dailyFat = Math.round((baseDailyCalories - (dailyProtein * 4) - (dailyCarbs * 4)) / 9);
  const dailyFiber = 30;

  return {
    goalType,
    goalName,
    description,
    macroTargets: {
      daily: {
        calories: baseDailyCalories,
        protein: dailyProtein,
        carbs: dailyCarbs,
        fat: Math.max(dailyFat, 50), // Minimum 50g fat
        fiber: dailyFiber
      },
      perMeal: {
        calories: Math.round(baseDailyCalories / 3),
        protein: Math.round(dailyProtein / 3),
        carbs: Math.round(dailyCarbs / 3),
        fat: Math.round(Math.max(dailyFat, 50) / 3),
        fiber: Math.round(dailyFiber / 3)
      }
    },
    dietaryRestrictions: analysis.recommendedRestrictions,
    healthBasedAdjustments: {
      avoidIngredients: analysis.avoidIngredients,
      recommendIngredients: analysis.recommendIngredients,
      macroModifications: analysis.macroModifications,
      supplementSuggestions: analysis.supplementSuggestions
    },
    confidence: 75,
    reasoning: analysis.reasoningPoints
  };
}

// Analyze health metrics to provide structured health insights
function analyzeHealthMetrics(healthDocs: HealthDocument[]) {
  const analysis = {
    concerns: [] as string[],
    positives: [] as string[],
    recommendedRestrictions: [] as string[],
    avoidIngredients: [] as string[],
    recommendIngredients: [] as string[],
    macroModifications: [] as string[],
    supplementSuggestions: [] as string[],
    reasoningPoints: [] as string[]
  };

  healthDocs.forEach(doc => {
    const data = doc.parsedData;

    // Cholesterol analysis
    if (data.cholesterolTotal) {
      if (data.cholesterolTotal > HEALTH_RANGES.cholesterolTotal.high) {
        analysis.concerns.push(`Elevated total cholesterol (${data.cholesterolTotal} mg/dL)`);
        analysis.recommendedRestrictions.push('low_saturated_fat');
        analysis.avoidIngredients.push('saturated fats', 'processed meats', 'fried foods');
        analysis.recommendIngredients.push('oats', 'beans', 'fatty fish', 'nuts');
        analysis.macroModifications.push('Limit saturated fat to <7% of calories');
        analysis.reasoningPoints.push('High cholesterol requires heart-healthy dietary modifications');
      } else if (data.cholesterolTotal < HEALTH_RANGES.cholesterolTotal.optimal) {
        analysis.positives.push(`Optimal total cholesterol (${data.cholesterolTotal} mg/dL)`);
      }
    }

    // Blood pressure analysis
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      if (data.bloodPressureSystolic > HEALTH_RANGES.bloodPressure.high.systolic) {
        analysis.concerns.push(`Elevated blood pressure (${data.bloodPressureSystolic}/${data.bloodPressureDiastolic} mmHg)`);
        analysis.recommendedRestrictions.push('low_sodium');
        analysis.avoidIngredients.push('high-sodium foods', 'processed foods', 'canned soups');
        analysis.recommendIngredients.push('potassium-rich foods', 'leafy greens', 'bananas');
        analysis.macroModifications.push('Limit sodium to <2300mg per day');
        analysis.reasoningPoints.push('High blood pressure requires sodium restriction and potassium emphasis');
      }
    }

    // Glucose/diabetes analysis  
    if (data.glucose) {
      if (data.glucose > HEALTH_RANGES.glucose.high) {
        analysis.concerns.push(`Elevated fasting glucose (${data.glucose} mg/dL)`);
        analysis.recommendedRestrictions.push('diabetic_friendly', 'low_glycemic');
        analysis.avoidIngredients.push('refined sugars', 'white bread', 'sugary drinks');
        analysis.recommendIngredients.push('whole grains', 'lean proteins', 'non-starchy vegetables');
        analysis.macroModifications.push('Focus on complex carbohydrates and fiber');
        analysis.reasoningPoints.push('Elevated glucose requires blood sugar management through diet');
      }
    }

    // HbA1c analysis
    if (data.hemoglobinA1c) {
      if (data.hemoglobinA1c > HEALTH_RANGES.hemoglobinA1c.high) {
        analysis.concerns.push(`Elevated HbA1c (${data.hemoglobinA1c}%)`);
        analysis.recommendedRestrictions.push('diabetic_friendly');
        analysis.macroModifications.push('Moderate carbohydrate intake with emphasis on fiber');
      }
    }

    // BMI analysis
    if (data.BMI) {
      if (data.BMI > HEALTH_RANGES.BMI.overweight) {
        analysis.concerns.push(`BMI in overweight/obese range (${data.BMI})`);
        analysis.reasoningPoints.push('Weight management needed for overall health improvement');
      } else if (data.BMI < HEALTH_RANGES.BMI.underweight) {
        analysis.concerns.push(`BMI in underweight range (${data.BMI})`);
        analysis.reasoningPoints.push('Weight gain may be beneficial for health');
      }
    }

    // Vitamin D analysis
    if (data.vitaminD) {
      if (data.vitaminD < HEALTH_RANGES.vitaminD.low) {
        analysis.concerns.push(`Low vitamin D (${data.vitaminD} ng/mL)`);
        analysis.recommendIngredients.push('fatty fish', 'fortified dairy', 'egg yolks');
        analysis.supplementSuggestions.push('Vitamin D3 (1000-2000 IU daily)');
        analysis.reasoningPoints.push('Vitamin D deficiency affects bone health and immune function');
      }
    }

    // Include document-specific recommendations
    if (data.dietaryRecommendations) {
      analysis.macroModifications.push(...data.dietaryRecommendations);
    }

    if (data.healthConcerns) {
      analysis.concerns.push(...data.healthConcerns);
    }
  });

  return analysis;
} 