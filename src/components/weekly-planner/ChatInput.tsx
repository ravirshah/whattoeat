'use client';

import { useState, useRef } from 'react';
import { Button, Badge } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Upload, 
  FileText, 
  Loader2, 
  Plus, 
  Heart,
  X,
  MessageCircle,
  Target,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/AuthContext';

interface ParsedNutritionItem {
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
}

interface ParsedNutritionEntry {
  items: ParsedNutritionItem[];
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
}

interface ParsedRecipe {
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
}

interface ChatInputProps {
  mealType: string;
  servings: number;
  onRecipeSelect: (recipe: any) => void;
  onFavorite?: (item: any) => void;
}

export default function ChatInput({
  mealType,
  servings,
  onRecipeSelect,
  onFavorite
}: ChatInputProps) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<{
    nutritionEntry?: ParsedNutritionEntry;
    recipe?: ParsedRecipe;
    inputType?: string;
  } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'result';
    content: any;
    timestamp: Date;
  }>>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a text file, PDF, or Word document');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'll read as text (this is a simplified approach)
        // In a production app, you'd want to use a PDF parsing library
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleSubmit = async () => {
    if (!chatInput.trim() && !selectedFile) {
      toast.error('Please enter some text or select a file');
      return;
    }

    if (!currentUser) {
      toast.error('Please sign in to use this feature');
      return;
    }

    setIsProcessing(true);

    try {
      let fileContent = '';
      let inputType = 'simple_nutrition';

      // Read file content if file is selected
      if (selectedFile) {
        try {
          fileContent = await readFileContent(selectedFile);
          inputType = 'recipe_file';
          console.log('File content read successfully');
        } catch (fileError) {
          console.error('Error reading file:', fileError);
          toast.error('Failed to read file content');
          setIsProcessing(false);
          return;
        }
      }

      // Determine input type based on content length and keywords
      if (chatInput.length > 200 || chatInput.toLowerCase().includes('recipe') || chatInput.toLowerCase().includes('instructions')) {
        inputType = 'recipe_text';
      }

      // Get auth token
      const token = await currentUser.getIdToken();

      // Call the nutrition parsing API
      const response = await fetch('/whattoeat/api/parse-nutrition-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          textInput: chatInput.trim(),
          fileContent: fileContent || undefined,
          inputType: inputType,
          mealType: mealType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to parse nutrition input');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Set the parsed result
      setParsedResult(data);

      // Add to conversation history
      const newHistoryItem = {
        type: 'user' as const,
        content: {
          input: chatInput,
          fileName: selectedFile?.name,
          result: data
        },
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, newHistoryItem]);

      // Clear inputs
      setChatInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show success message
      if (data.nutritionEntry) {
        toast.success(`Parsed nutrition for ${data.nutritionEntry.items?.length || 0} items`);
      } else if (data.recipe) {
        toast.success(`Successfully parsed recipe: ${data.recipe.name}`);
      }

    } catch (error) {
      console.error('Error processing chat input:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToMealPlan = (result: any) => {
    if (result.recipe) {
      // Convert recipe to meal format
      const meal = {
        id: `chat_${Date.now()}`,
        recipeName: result.recipe.name,
        mealType: mealType as any,
        servings: servings,
        plannedAt: new Date() as any,
        recipeDetails: {
          ingredients: result.recipe.ingredients,
          instructions: result.recipe.instructions,
          nutritionalFacts: result.recipe.nutritionalFacts,
          times: result.recipe.times,
          goalAlignment: {
            macroFit: 'Parsed from chat input',
            calorieTarget: 'User specified'
          }
        },
        notes: result.recipe.notes
      };
      
      onRecipeSelect(meal);
      toast.success(`Added "${result.recipe.name}" to your meal plan`);
    } else if (result.nutritionEntry) {
      // Convert nutrition entry to a simple meal format
      const mealName = result.nutritionEntry.items.map((item: ParsedNutritionItem) => 
        `${item.amount} ${item.name}`).join(' + ');
      
      const meal = {
        id: `chat_nutrition_${Date.now()}`,
        recipeName: mealName || 'Chat Nutrition Entry',
        mealType: mealType as any,
        servings: servings,
        plannedAt: new Date() as any,
        recipeDetails: {
          ingredients: result.nutritionEntry.items.map((item: ParsedNutritionItem) => 
            `${item.amount} ${item.name}`),
          instructions: ['Log the nutrition information as consumed'],
          nutritionalFacts: result.nutritionEntry.totalNutrition,
          times: 'Immediate',
          goalAlignment: {
            macroFit: 'Nutrition tracking entry',
            calorieTarget: 'As consumed'
          }
        },
        notes: 'Parsed from nutrition input'
      };
      
      onRecipeSelect(meal);
      toast.success('Added nutrition entry to your meal plan');
    }
  };

  const handleFavorite = (result: any) => {
    if (onFavorite) {
      onFavorite(result);
      toast.success('Added to favorites!');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <MessageCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Input by Chat
        </h4>
        <p className="text-gray-600 dark:text-gray-400">
          Describe what you ate or paste a recipe, and I'll extract the nutritional information for you
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Describe your meal or paste a recipe
          </label>
          <Textarea
            value={chatInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setChatInput(e.target.value)}
            placeholder="For breakfast I had 9 oz of 2% milk and 2 scoops of legion protein..."
            className="min-h-[100px]"
            disabled={isProcessing}
          />
        </div>

        {/* File Upload */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Recipe File (PDF, TXT, DOC)
            </Button>
          </div>
        </div>

        {/* Selected File Display */}
        {selectedFile && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || (!chatInput.trim() && !selectedFile)}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Parse Nutrition Info
            </>
          )}
        </Button>
      </div>

      {/* Results Section */}
      {parsedResult && (
        <div className="border-t pt-6">
          <h5 className="font-medium text-gray-900 dark:text-white mb-4">
            Parsed Results
          </h5>
          
          {parsedResult.nutritionEntry && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h6 className="font-medium text-green-800 dark:text-green-200 mb-3">
                  Nutrition Breakdown
                  {parsedResult.nutritionEntry.mealType && (
                    <Badge variant="outline" className="ml-2">
                      {parsedResult.nutritionEntry.mealType}
                    </Badge>
                  )}
                </h6>
                
                {/* Individual Items */}
                <div className="space-y-2 mb-4">
                  {parsedResult.nutritionEntry.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>{item.amount} {item.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.nutritionalFacts.calories} cal, {item.nutritionalFacts.protein}g protein
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total Nutrition */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.nutritionEntry.totalNutrition.calories}
                    </div>
                    <div className="text-xs text-gray-500">cal</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.nutritionEntry.totalNutrition.protein}g
                    </div>
                    <div className="text-xs text-gray-500">protein</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.nutritionEntry.totalNutrition.carbs}g
                    </div>
                    <div className="text-xs text-gray-500">carbs</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.nutritionEntry.totalNutrition.fat}g
                    </div>
                    <div className="text-xs text-gray-500">fat</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddToMealPlan(parsedResult)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add to Plan
                  </Button>
                  {onFavorite && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFavorite(parsedResult)}
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      Favorite
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {parsedResult.recipe && (
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-900 dark:text-white mb-1">
                      {parsedResult.recipe.name}
                    </h6>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {parsedResult.recipe.times}
                      </div>
                      <div className="flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        {parsedResult.recipe.servings}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nutrition Summary */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.recipe.nutritionalFacts.calories}
                    </div>
                    <div className="text-gray-500">cal</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.recipe.nutritionalFacts.protein}g
                    </div>
                    <div className="text-gray-500">protein</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.recipe.nutritionalFacts.carbs}g
                    </div>
                    <div className="text-gray-500">carbs</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {parsedResult.recipe.nutritionalFacts.fat}g
                    </div>
                    <div className="text-gray-500">fat</div>
                  </div>
                </div>

                {/* Ingredients Preview */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {parsedResult.recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {ingredient.split(' ').slice(0, 2).join(' ')}
                      </Badge>
                    ))}
                    {parsedResult.recipe.ingredients.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{parsedResult.recipe.ingredients.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddToMealPlan(parsedResult)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add to Plan
                  </Button>
                  {onFavorite && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFavorite(parsedResult)}
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      Favorite
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="border-t pt-6">
          <h5 className="font-medium text-gray-900 dark:text-white mb-4">
            Recent Entries ({conversationHistory.length})
          </h5>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {conversationHistory.slice(-3).reverse().map((entry, idx) => (
              <div key={idx} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-gray-600 dark:text-gray-400">
                  {entry.content.input.substring(0, 50)}...
                </div>
                <div className="text-xs text-gray-500">
                  {entry.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 