import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { adminAuth } from '@/lib/firebase-admin';

type HealthDocumentResponse = {
  parsedData?: any;
  aiSummary?: string;
  error?: string;
  apiInfo?: {
    error?: string;
    model?: string;
  };
};

// Enhanced health document parsing prompt for complex medical documents
const buildHealthDocumentPrompt = (fileContent: string, fileType: string) => {
  return `You are an expert medical AI assistant specializing in interpreting complex health documents for nutritional planning. Analyze the following ${fileType} document, which may contain tables, technical data, images, and complex formatting. Extract all relevant health data that can inform dietary recommendations.

## DOCUMENT CONTENT:
${fileContent}

## ENHANCED EXTRACTION REQUIREMENTS:

**IMPORTANT**: This document may be a complex medical report with:
- Laboratory test results in tables or formatted layouts
- Multiple sections and headers
- Reference ranges and normal values
- Technical medical terminology
- Abnormal markers flagged with indicators

Parse carefully and extract ALL numerical health values. Look for these patterns:
- Lab values: "Cholesterol: 220 mg/dL", "Glucose 180 mg/dL (H)", "Vitamin D 15 ng/mL (L)"
- Table formats with test names, values, units, and reference ranges
- Abnormal flags: (H) for High, (L) for Low, asterisks (*), arrows (↑↓)
- Multiple measurement units: mg/dL, ng/mL, pg/mL, μg/dL, mIU/L, mmol/L, etc.

**For Blood Panel/Lab Reports:**
- Total Cholesterol (normal: <200 mg/dL) - look for "Total Cholesterol", "CHOL TOTAL", "Cholesterol, Total"
- LDL Cholesterol (normal: <100 mg/dL) - look for "LDL", "LDL Cholesterol", "Cholesterol, LDL"
- HDL Cholesterol (normal: >40 men, >50 women) - look for "HDL", "HDL Cholesterol", "Cholesterol, HDL"
- Triglycerides (normal: <150 mg/dL) - look for "Triglycerides", "TRIG", "Trigs"
- Glucose (fasting normal: 70-100 mg/dL) - look for "Glucose", "Blood Sugar", "GLU", "Plasma Glucose"
- HbA1c (normal: <5.7%) - look for "HbA1c", "Hemoglobin A1c", "A1C", "Glycated Hemoglobin"
- Vitamin D (normal: 30-100 ng/mL) - look for "25-OH Vitamin D", "Vitamin D, 25-Hydroxy", "25(OH)D"
- Vitamin B12 (normal: 200-900 pg/mL) - look for "Vitamin B12", "B12", "Cobalamin"
- Iron (normal: 60-170 μg/dL) - look for "Iron", "Serum Iron", "Fe"
- Ferritin - look for "Ferritin"
- TSH (normal: 0.4-4.0 mIU/L) - look for "TSH", "Thyroid Stimulating Hormone"
- Creatinine - look for "Creatinine", "CREAT"
- BUN - look for "BUN", "Blood Urea Nitrogen"
- Complete Blood Count (CBC) values
- Liver function tests (ALT, AST, Bilirubin)
- Inflammatory markers (CRP, ESR)

**For Body Composition Scans (InBody/DEXA):**
- Body fat percentage - look for "Body Fat%", "Fat%", "Adipose Tissue"
- Muscle mass - look for "Muscle Mass", "Lean Body Mass", "Skeletal Muscle Mass"
- BMI - look for "BMI", "Body Mass Index"
- Visceral fat - look for "Visceral Fat", "VAT", "Visceral Adipose Tissue"
- Basal metabolic rate - look for "BMR", "Basal Metabolic Rate", "Resting Energy Expenditure"
- Body weight - look for "Weight", "Body Weight"
- Bone density (for DEXA) - look for "Bone Density", "T-Score", "Z-Score"

**For General Health Indicators:**
- Blood pressure - look for "BP", "Blood Pressure", systolic/diastolic values like "120/80"
- Heart rate - look for "HR", "Heart Rate", "Pulse", "BPM"
- Any explicit dietary recommendations or restrictions mentioned
- Health conditions, risk factors, or concerns noted by physician

## OUTPUT FORMAT (JSON ONLY):

Return ONLY a valid JSON object with this exact structure:

{
  "parsedData": {
    "cholesterolTotal": [number or null],
    "cholesterolLDL": [number or null],
    "cholesterolHDL": [number or null],
    "triglycerides": [number or null],
    "glucose": [number or null],
    "hemoglobinA1c": [number or null],
    "vitaminD": [number or null],
    "vitaminB12": [number or null],
    "iron": [number or null],
    "ferritin": [number or null],
    "tsh": [number or null],
    "creatinine": [number or null],
    "bodyFatPercentage": [number or null],
    "muscleMass": [number or null],
    "bodyWeight": [number or null],
    "BMI": [number or null],
    "visceralFat": [number or null],
    "basalMetabolicRate": [number or null],
    "bloodPressureSystolic": [number or null],
    "bloodPressureDiastolic": [number or null],
    "restingHeartRate": [number or null],
    "dietaryRecommendations": ["specific dietary advice explicitly mentioned in document"],
    "healthConcerns": ["specific conditions, risk factors, or abnormal values noted"],
    "rawExtractedText": "comprehensive summary of all key findings with units and reference ranges",
    "abnormalValues": ["list of values outside normal ranges with their actual values and normal ranges"]
  },
  "aiSummary": "3-4 sentence summary focusing on actionable dietary insights based on extracted data. Highlight any abnormal values and specific nutritional recommendations. Example: 'Elevated cholesterol (220 mg/dL, normal <200) and low vitamin D (15 ng/mL, normal 30-100) indicate need for dietary modifications. Recommend increasing omega-3 rich foods like fatty fish, reducing saturated fats, and adding vitamin D sources or supplements. Consider adding more fiber-rich foods to help lower cholesterol naturally.'"
}

## CRITICAL EXTRACTION GUIDELINES:
- Extract ALL numerical values found in the document, even if some seem redundant
- ALWAYS preserve original units when recording in rawExtractedText
- For abnormal values, note both the actual value and the reference range
- If multiple test dates exist, use the most recent values
- Convert units when necessary (e.g., mmol/L to mg/dL for glucose: multiply by 18)
- Be extremely thorough - medical documents often have values in unexpected locations
- Look for patterns like test name + colon + value + unit + (reference range)
- Check for continuation across multiple lines or pages
- Pay attention to footnotes and additional notes
- If document mentions "see page X" or references other sections, note this

## IMPORTANT SAFETY & ACCURACY GUIDELINES:
- Only extract explicitly stated numerical values from the document
- Do not make medical diagnoses or provide treatment advice
- Focus on nutritional implications rather than medical interpretations
- If a value is unclear or ambiguous, set it to null
- Validate extracted numbers are within physiological ranges:
  * Cholesterol: 50-500 mg/dL
  * Glucose: 40-500 mg/dL  
  * Blood pressure: 50-250 mmHg
  * Body fat: 2-60%
  * BMI: 10-80
  * Vitamin D: 5-150 ng/mL
- If document quality is poor or contains mostly images/scans, note this limitation
- Be conservative with extraction - accuracy is more important than completeness`;
};

// Enhanced PDF extraction with better error handling for complex documents
const extractPDFText = async (base64Data: string): Promise<string> => {
  try {
    console.log('Starting enhanced PDF text extraction...');
    
    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    // Use robust PDF parsing with comprehensive error handling
    let pdfData: any;
    
    try {
      // First, try the simplest possible approach
      console.log('Attempting PDF text extraction...');
      
      // Dynamically require pdf-parse to avoid import issues
      const pdfParse = eval('require')('pdf-parse');
      
      // Use minimal options to avoid triggering test file issues
      pdfData = await pdfParse(pdfBuffer);
      
      console.log(`PDF parsing successful: ${pdfData.numpages} pages, ${pdfData.text?.length || 0} characters`);
      
    } catch (pdfError: any) {
      console.error('PDF parsing failed:', pdfError);
      
      // If it's the known test file error, provide a clear message
      if (pdfError.message && pdfError.message.includes('test/data/05-versions-space.pdf')) {
        console.log('Detected pdf-parse library test file issue');
        throw new Error('PDF processing temporarily unavailable due to library configuration. Please try converting your PDF to text format or contact support.');
      }
      
      // For other PDF errors, provide helpful guidance
      if (pdfError.message && pdfError.message.includes('Invalid PDF')) {
        throw new Error('The uploaded file appears to be corrupted or is not a valid PDF. Please check the file and try again.');
      }
      
      if (pdfError.message && pdfError.message.includes('Password')) {
        throw new Error('This PDF is password-protected. Please remove the password protection and try again.');
      }
      
      // Generic PDF error
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}. The PDF may be scanned, image-based, or have complex formatting. Try converting to text format first.`);
    }
    let extractedText = pdfData.text;
    
    console.log(`PDF extraction results:`);
    console.log(`- Pages: ${pdfData.numpages}`);
    console.log(`- Characters extracted: ${extractedText.length}`);
    console.log(`- Info:`, pdfData.info);
    
    // Enhanced text cleaning for medical documents
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
      .trim();
    
    // Check for minimal content (likely scanned/image-based PDF)
    if (extractedText.length < 50) {
      throw new Error(`PDF text extraction returned minimal content (${extractedText.length} chars). The PDF may be scanned, image-based, or password-protected.`);
    }
    
    // Check for medical document indicators
    const medicalIndicators = [
      'mg/dl', 'mg/dL', 'ng/ml', 'ng/mL', 'pg/ml', 'pg/mL', 'miu/l', 'mIU/L',
      'cholesterol', 'glucose', 'vitamin', 'hemoglobin', 'triglyceride',
      'reference', 'normal', 'abnormal', 'high', 'low', 'lab', 'test', 'result'
    ];
    
    const hasmedicalContent = medicalIndicators.some(indicator => 
      extractedText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (!hasmedicalContent) {
      console.warn('PDF does not appear to contain typical medical lab data');
    }
    
    console.log(`Successfully extracted and processed PDF text (${extractedText.length} characters)`);
    return extractedText;
    
  } catch (pdfError) {
    console.error('Enhanced PDF extraction error:', pdfError);
    throw new Error(`Failed to extract text from PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF processing error'}`);
  }
};

export async function POST(request: NextRequest) {
  console.log("Enhanced health document processing API called");
  
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
    const { fileContent, fileType, fileName } = await request.json();
    
    if (!fileContent || !fileType) {
      return NextResponse.json({ error: 'File content and type are required' }, { status: 400 });
    }

    console.log(`Processing health document: ${fileName}, type: ${fileType}, content length: ${fileContent.length}`);

    // Enhanced PDF data extraction
    let processedFileContent = fileContent;
    if (fileContent.startsWith('[PDF_BASE64_DATA]')) {
      console.log('Detected PDF base64 data, using enhanced extraction...');
      try {
        // Remove the marker and extract base64 data
        const base64Data = fileContent.replace('[PDF_BASE64_DATA]data:application/pdf;base64,', '');
        
        // Use enhanced PDF extraction
        processedFileContent = await extractPDFText(base64Data);
        
        console.log(`Enhanced PDF extraction successful: ${processedFileContent.length} characters`);
        
        // Log first 1000 characters for debugging complex documents
        console.log('PDF content preview (first 1000 chars):', processedFileContent.substring(0, 1000));
        
      } catch (pdfError) {
        console.error('Enhanced PDF extraction failed:', pdfError);
        
        // Provide specific guidance based on error type
        let errorMessage = 'PDF Processing Failed';
        let detailsMessage = 'Please try one of the following alternatives:';
        let suggestions = [
          '1. Save your PDF as a text file (.txt) and upload that instead',
          '2. Copy the text content from your PDF and paste it into a text file',
          '3. Try a different PDF viewer to export as text',
          '4. Use an online PDF-to-text converter tool'
        ];
        
        if (pdfError instanceof Error) {
          const errorMsg = pdfError.message;
          
          if (errorMsg.includes('test/data/05-versions-space.pdf')) {
            errorMessage = 'PDF Library Configuration Issue';
            detailsMessage = 'Our PDF processing is temporarily experiencing technical difficulties. ' + detailsMessage;
          } else if (errorMsg.includes('password') || errorMsg.includes('Password')) {
            errorMessage = 'Password-Protected PDF';
            detailsMessage = 'This PDF requires a password. Please remove password protection first, or ' + detailsMessage;
          } else if (errorMsg.includes('scanned') || errorMsg.includes('image')) {
            errorMessage = 'Scanned/Image-Based PDF';
            detailsMessage = 'This appears to be a scanned document. ' + detailsMessage;
          }
        }
        
        return NextResponse.json({ 
          error: errorMessage,
          details: detailsMessage,
          suggestions: suggestions,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
    }

    // Enhanced AI processing with Gemini API
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("No Gemini API key found");
        throw new Error("Gemini API key not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = buildHealthDocumentPrompt(processedFileContent, fileType);
      
      console.log("Sending enhanced health document to Gemini API...");
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Very low temperature for precise medical data extraction
          maxOutputTokens: 4096, // Increased for complex documents
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
      
      console.log("Successfully received enhanced health document analysis from Gemini API");
      console.log("AI response preview:", text.substring(0, 500));
      
      // Enhanced JSON parsing with better error handling
      try {
        // Clean the response to extract JSON
        let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Find JSON object boundaries
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
          console.error("No valid JSON found in AI response");
          throw new Error("Invalid AI response format - no JSON found");
        }
        
        const jsonStr = cleanedText.substring(jsonStart, jsonEnd);
        const analysisResult = JSON.parse(jsonStr);
        
        // Validate the response structure
        if (!analysisResult.parsedData) {
          throw new Error("Invalid analysis format - missing parsedData");
        }
        
        // Ensure required fields exist
        analysisResult.parsedData = {
          cholesterolTotal: null,
          cholesterolLDL: null,
          cholesterolHDL: null,
          triglycerides: null,
          glucose: null,
          hemoglobinA1c: null,
          vitaminD: null,
          vitaminB12: null,
          iron: null,
          bodyFatPercentage: null,
          muscleMass: null,
          bodyWeight: null,
          BMI: null,
          visceralFat: null,
          basalMetabolicRate: null,
          bloodPressureSystolic: null,
          bloodPressureDiastolic: null,
          restingHeartRate: null,
          dietaryRecommendations: [],
          healthConcerns: [],
          rawExtractedText: "No data extracted",
          ...analysisResult.parsedData // Override with actual extracted data
        };
        
        console.log("Successfully parsed enhanced health document data");
        console.log("Extracted data summary:", {
          cholesterol: analysisResult.parsedData.cholesterolTotal,
          glucose: analysisResult.parsedData.glucose,
          vitaminD: analysisResult.parsedData.vitaminD,
          hasRecommendations: analysisResult.parsedData.dietaryRecommendations?.length > 0
        });
        
        return NextResponse.json(analysisResult);
        
      } catch (parseError) {
        console.error("Error parsing enhanced Gemini response:", parseError);
        console.error("Raw response text (first 1000 chars):", text.substring(0, 1000));
        throw new Error(`Failed to parse AI analysis: ${parseError instanceof Error ? parseError.message : 'JSON parsing error'}`);
      }
      
    } catch (geminiError) {
      console.error("Enhanced Gemini API error:", geminiError);
      console.log("Using enhanced fallback health data processing");
      
      // Enhanced fallback with basic text analysis
      const basicAnalysis = performBasicHealthAnalysis(processedFileContent);
      
      return NextResponse.json({ 
        parsedData: {
          cholesterolTotal: basicAnalysis.cholesterol,
          cholesterolLDL: null,
          cholesterolHDL: null,
          triglycerides: null,
          glucose: basicAnalysis.glucose,
          hemoglobinA1c: null,
          vitaminD: basicAnalysis.vitaminD,
          vitaminB12: null,
          iron: null,
          bodyFatPercentage: null,
          muscleMass: null,
          bodyWeight: null,
          BMI: null,
          visceralFat: null,
          basalMetabolicRate: null,
          bloodPressureSystolic: null,
          bloodPressureDiastolic: null,
          restingHeartRate: null,
          dietaryRecommendations: [],
          healthConcerns: basicAnalysis.concerns,
          rawExtractedText: `Basic analysis performed on ${processedFileContent.length} characters. AI processing unavailable.`,
          abnormalValues: []
        },
        aiSummary: "Health document processed with basic analysis. AI service temporarily unavailable - consider manual review for complete meal planning insights.",
        apiInfo: {
          error: geminiError instanceof Error ? geminiError.message : String(geminiError),
          model: "enhanced_fallback",
          extractedChars: processedFileContent.length,
          documentType: fileType
        }
      });
    }
  } catch (error) {
    console.error('Error processing enhanced health document:', error);
    return NextResponse.json({ 
      error: 'Failed to process health document',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Basic health analysis fallback for when AI is unavailable
const performBasicHealthAnalysis = (text: string) => {
  const lowercaseText = text.toLowerCase();
  const analysis = {
    cholesterol: null as number | null,
    glucose: null as number | null,
    vitaminD: null as number | null,
    concerns: [] as string[]
  };
  
  // Basic pattern matching for common health markers
  const patterns = [
    { name: 'cholesterol', regex: /cholesterol[:\s]+(\d+(?:\.\d+)?)/i, type: 'cholesterol' },
    { name: 'glucose', regex: /glucose[:\s]+(\d+(?:\.\d+)?)/i, type: 'glucose' },
    { name: 'vitamin d', regex: /vitamin\s*d[:\s]+(\d+(?:\.\d+)?)/i, type: 'vitaminD' }
  ];
  
  patterns.forEach(pattern => {
    const match = text.match(pattern.regex);
    if (match && match[1]) {
      const value = parseFloat(match[1]);
      if (value > 0 && value < 1000) { // Basic validation
        (analysis as any)[pattern.type] = value;
      }
    }
  });
  
  // Basic concern detection
  const concernKeywords = ['high', 'elevated', 'low', 'deficient', 'abnormal', 'outside range'];
  concernKeywords.forEach(keyword => {
    if (lowercaseText.includes(keyword)) {
      analysis.concerns.push(`Document mentions "${keyword}" values`);
    }
  });
  
  return analysis;
}; 