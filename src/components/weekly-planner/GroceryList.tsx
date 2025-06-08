'use client';

import { useState, useEffect } from 'react';
import { WeeklyPlan, GroceryList as GroceryListType, GroceryItem } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { ShoppingCart, X, Check, Download, RefreshCw, Plus, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createGroceryList, getGroceryList, updateGroceryList } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface GroceryListProps {
  weeklyPlan: WeeklyPlan;
  userId: string;
  onClose: () => void;
}

interface ProcessedIngredient {
  name: string;
  quantity: string;
  fromRecipes: string[];
  category: string;
}

export default function GroceryList({
  weeklyPlan,
  userId,
  onClose
}: GroceryListProps) {
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroceryList();
  }, [weeklyPlan.id]);

  // Separate effect to handle plan updates without reloading grocery list
  useEffect(() => {
    if (groceryList && groceryList.weeklyPlanId === weeklyPlan.id) {
      // Plan updated but same week - keep grocery list
      console.log('Weekly plan updated for same week, preserving grocery list');
    }
  }, [weeklyPlan.updatedAt]);

  const loadGroceryList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading grocery list for weekly plan:', weeklyPlan.id);
      
      const existingList = await getGroceryList(weeklyPlan.id);
      console.log('Loaded grocery list:', existingList);
      
      setGroceryList(existingList);
      
      if (existingList) {
        console.log(`Found existing grocery list with ${existingList.items.length} items`);
      } else {
        console.log('No existing grocery list found for this weekly plan');
      }
    } catch (error: any) {
      console.error('Error loading grocery list:', error);
      setError(`Failed to load grocery list: ${error.message}`);
      toast.error('Failed to load grocery list');
    } finally {
      setIsLoading(false);
    }
  };

  // Comprehensive data validation and cleaning
  const validateAndCleanData = (data: any): any => {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (Array.isArray(data)) {
      return data
        .map(validateAndCleanData)
        .filter(item => item !== null && item !== undefined);
    }
    
    if (typeof data === 'object') {
      const cleaned: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const cleanedValue = validateAndCleanData(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      
      return cleaned;
    }
    
    // For primitive values, only exclude undefined
    return data !== undefined ? data : null;
  };

  // Smart ingredient parsing to extract base ingredient and quantity
  const parseIngredientName = (ingredient: string): { 
    baseIngredient: string; 
    fullName: string; 
    quantity?: number; 
    unit?: string;
    description?: string;
  } => {
    const cleaned = ingredient.toLowerCase().trim();
    
    // Extract quantity, unit, ingredient name, and description
    const fullPattern = /^(?:(\d+(?:\.\d+)?(?:\/\d+)?)\s+)?(cloves?|cups?|tbsp|tsp|lbs?|oz|pieces?|heads?|cans?|packages?|medium|large|small)?\s*(.+?)(?:,\s*(.+))?$/;
    const match = cleaned.match(fullPattern);
    
    if (match) {
      const [, quantityStr, unit, ingredientPart, description] = match;
      
      let baseIngredient = ingredientPart?.trim() || cleaned;
      
      // Clean up the base ingredient name
      baseIngredient = baseIngredient
        .replace(/\s*(fresh|frozen|dried|chopped|minced|sliced|diced|grated|crushed|cut\s+into.*?)\s*/g, ' ')
        .replace(/\s*(any\s+color|no\s+salt\s+added|optional)\s*.*$/g, '')
        .replace(/\([^)]*\)/g, '') // Remove parentheses content
        .replace(/\s+/g, ' ')
        .trim();
      
      // Handle plurals and common variations
      if (baseIngredient.endsWith('es') && !baseIngredient.endsWith('ses')) {
        baseIngredient = baseIngredient.slice(0, -2);
      } else if (baseIngredient.endsWith('s') && !baseIngredient.endsWith('ss') && !baseIngredient.endsWith('us')) {
        baseIngredient = baseIngredient.slice(0, -1);
      }
      
      // Parse quantity
      let quantity: number | undefined;
      if (quantityStr) {
        if (quantityStr.includes('/')) {
          const [num, den] = quantityStr.split('/').map(Number);
          quantity = num / den;
        } else {
          quantity = parseFloat(quantityStr);
        }
      }
      
      return {
        baseIngredient,
        fullName: ingredient.trim(),
        quantity,
        unit,
        description
      };
    }
    
    // Fallback - return the original
    return {
      baseIngredient: cleaned.replace(/\([^)]*\)/g, '').trim(),
      fullName: ingredient.trim()
    };
  };

  // Intelligent quantity consolidation
  const consolidateQuantities = (quantities: Array<{ quantity?: number; unit?: string; description?: string }>): string => {
    // Group by unit
    const byUnit = quantities.reduce((acc, q) => {
      const unit = q.unit || 'unit';
      if (!acc[unit]) acc[unit] = [];
      acc[unit].push(q.quantity || 1);
      return acc;
    }, {} as Record<string, number[]>);
    
    // Sum quantities for each unit
    const consolidated = Object.entries(byUnit).map(([unit, qtys]) => {
      const total = qtys.reduce((sum, qty) => sum + qty, 0);
      const formattedTotal = total % 1 === 0 ? total.toString() : total.toFixed(1);
      return unit === 'unit' ? formattedTotal : `${formattedTotal} ${unit}`;
    });
    
    return consolidated.length > 1 
      ? `Multiple preparations needed`
      : consolidated[0] || 'As needed';
  };

  // Intelligent ingredient consolidation with smart parsing and quantity combining
  const consolidateIngredients = (processedIngredients: ProcessedIngredient[]): GroceryItem[] => {
    const consolidatedMap = new Map<string, {
      item: GroceryItem;
      parsedIngredients: Array<{ parsed: ReturnType<typeof parseIngredientName>; fromRecipes: string[] }>;
    }>();
    let itemIndex = 0;

    // Filter out invalid ingredients
    const validIngredients = processedIngredients.filter(ingredient => {
      if (!ingredient || !ingredient.name || typeof ingredient.name !== 'string') {
        console.warn('Filtering out invalid ingredient:', ingredient);
        return false;
      }
      return true;
    });

    validIngredients.forEach((ingredient) => {
      // Parse the ingredient to get base name and quantity
      const parsed = parseIngredientName(ingredient.name);
      const baseKey = parsed.baseIngredient.toLowerCase().trim();
      
      // Skip empty keys
      if (!baseKey) {
        console.warn('Skipping ingredient with empty base name:', ingredient);
        return;
      }
      
      // Check if we already have this base ingredient
      const existingKey = Array.from(consolidatedMap.keys()).find(key => {
        // More intelligent matching for similar ingredients
        return key === baseKey || 
               key.includes(baseKey) || 
               baseKey.includes(key) ||
               // Handle common variations
               (key.includes('garlic') && baseKey.includes('garlic')) ||
               (key.includes('onion') && baseKey.includes('onion')) ||
               (key.includes('tomato') && baseKey.includes('tomato')) ||
               (key.includes('pepper') && baseKey.includes('pepper'));
      });
      
      if (existingKey && consolidatedMap.has(existingKey)) {
        const existing = consolidatedMap.get(existingKey)!;
        
        // Add this parsed ingredient to the collection
        existing.parsedIngredients.push({ parsed, fromRecipes: ingredient.fromRecipes });
        
        // Merge recipes safely
        if (Array.isArray(ingredient.fromRecipes)) {
          ingredient.fromRecipes.forEach(recipe => {
            if (recipe && typeof recipe === 'string' && !existing.item.fromRecipes.includes(recipe)) {
              existing.item.fromRecipes.push(recipe);
            }
          });
        }
        
        // Create consolidated quantity and name
        const allQuantities = existing.parsedIngredients.map(pi => ({
          quantity: pi.parsed.quantity,
          unit: pi.parsed.unit,
          description: pi.parsed.description
        }));
        
        const totalRecipes = existing.item.fromRecipes.length;
        const consolidatedQuantity = consolidateQuantities(allQuantities);
        
        // Use the cleanest ingredient name (capitalize first letter)
        const baseName = parsed.baseIngredient;
        const capitalizedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        
        existing.item.name = capitalizedName;
        existing.item.quantity = totalRecipes > 1 
          ? `${consolidatedQuantity} total (${totalRecipes} recipes)`
          : consolidatedQuantity;
        existing.item.priority = totalRecipes > 1 ? 'high' : 'medium';
        
      } else {
        // Create new grocery item with validation
        const groceryItem: GroceryItem = {
          id: `item_${itemIndex++}`,
          name: parsed.baseIngredient.charAt(0).toUpperCase() + parsed.baseIngredient.slice(1),
          quantity: parsed.quantity && parsed.unit 
            ? `${parsed.quantity} ${parsed.unit}`
            : ingredient.quantity || '1 serving',
          category: ingredient.category || 'General',
          fromRecipes: Array.isArray(ingredient.fromRecipes) ? [...ingredient.fromRecipes.filter(r => r && typeof r === 'string')] : [],
          isChecked: false,
          storeSection: ingredient.category || 'General',
          priority: (ingredient.fromRecipes?.length || 0) > 1 ? 'high' : 'medium'
        };
        
        consolidatedMap.set(baseKey, {
          item: groceryItem,
          parsedIngredients: [{ parsed, fromRecipes: ingredient.fromRecipes }]
        });
      }
    });
    
    return Array.from(consolidatedMap.values()).map(entry => entry.item);
  };

  // Enhanced ingredient categorization with null safety
  const categorizeIngredient = (ingredient: string | null | undefined): string => {
    // Safety check for null/undefined ingredients
    if (!ingredient || typeof ingredient !== 'string') {
      console.warn('Invalid ingredient passed to categorizeIngredient:', ingredient);
      return 'General';
    }
    
    const lower = ingredient.toLowerCase().trim();
    
    // Handle empty strings
    if (!lower) {
      return 'General';
    }
    
    const categories = {
      'Meat & Seafood': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'shrimp', 'tuna', 'bacon', 'sausage'],
      'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'sour cream', 'cottage cheese'],
      'Produce': ['tomato', 'onion', 'carrot', 'pepper', 'lettuce', 'spinach', 'broccoli', 'cucumber', 'apple', 'banana', 'lemon', 'garlic', 'ginger'],
      'Grains & Bread': ['rice', 'pasta', 'bread', 'quinoa', 'oats', 'flour', 'noodles', 'cereal', 'crackers'],
      'Pantry & Condiments': ['oil', 'vinegar', 'salt', 'pepper', 'sauce', 'honey', 'sugar', 'spice', 'herb', 'stock', 'broth'],
      'Frozen': ['frozen', 'ice cream'],
      'Canned Goods': ['canned', 'beans', 'corn', 'soup']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  };

  const generateGroceryList = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      setGenerationStep('Analyzing meal plan...');
      
      // Get all planned meals with validation
      const allMeals = Object.values(weeklyPlan.meals || {})
        .flat()
        .filter(meal => meal && typeof meal === 'object' && meal.recipeName);
      
      console.log('Found meals for grocery list:', allMeals.length);
      
      if (allMeals.length === 0) {
        toast.error('No valid meals planned for this week');
        return;
      }

      setGenerationStep('Processing ingredients...');
      
      // Process ingredients from meals
      const processedIngredients: ProcessedIngredient[] = [];

      allMeals.forEach((meal) => {
        // Validate meal object
        if (!meal || !meal.recipeName) {
          console.warn('Invalid meal object:', meal);
          return;
        }

        if (meal.recipeDetails?.ingredients && Array.isArray(meal.recipeDetails.ingredients) && meal.recipeDetails.ingredients.length > 0) {
          // Process recipe ingredients with validation
          meal.recipeDetails.ingredients.forEach((ingredient) => {
            // Filter out null/undefined/empty ingredients
            if (!ingredient || typeof ingredient !== 'string' || !ingredient.trim()) {
              console.warn('Skipping invalid ingredient:', ingredient, 'from meal:', meal.recipeName);
              return;
            }

            const category = categorizeIngredient(ingredient);
            
            processedIngredients.push({
              name: ingredient.trim(),
              quantity: `${meal.servings || 1} servings`,
              fromRecipes: [meal.recipeName],
              category
            });
          });
        } else {
          // Fallback for meals without detailed ingredients
          const category = categorizeIngredient(meal.recipeName);
          processedIngredients.push({
            name: `Ingredients for ${meal.recipeName}`,
            quantity: `${meal.servings || 1} servings`,
            fromRecipes: [meal.recipeName],
            category
          });
        }

        // Add carb bases separately with validation
        if (meal.carbBase && typeof meal.carbBase === 'string' && meal.carbBase.trim()) {
          const category = categorizeIngredient(meal.carbBase);
          processedIngredients.push({
            name: meal.carbBase.trim(),
            quantity: `${meal.servings || 1} servings`,
            fromRecipes: [meal.recipeName],
            category
          });
        }
      });

      setGenerationStep('Consolidating similar ingredients...');
      
      console.log('Processed ingredients before consolidation:', processedIngredients.length);
      console.log('Sample processed ingredients:', processedIngredients.slice(0, 3));
      
      // Consolidate ingredients intelligently
      const groceryItems = consolidateIngredients(processedIngredients);
      
      console.log('Consolidated grocery items:', groceryItems.length);

      setGenerationStep('Preserving your progress...');
      
      // Preserve checked status from existing list with improved matching
      if (groceryList && groceryList.items.length > 0) {
        console.log('Preserving checked status from existing grocery list');
        console.log('Existing items:', groceryList.items.length);
        console.log('New items:', groceryItems.length);
        
        groceryItems.forEach(newItem => {
          // Try multiple matching strategies
          const existingItem = groceryList.items.find(existing => {
            const existingName = existing.name.toLowerCase().trim();
            const newName = newItem.name.toLowerCase().trim();
            
            // Exact match
            if (existingName === newName) return true;
            
            // Substring match (either direction)
            if (existingName.includes(newName) || newName.includes(existingName)) return true;
            
            // Match by base ingredient (remove common modifiers)
            const cleanExisting = existingName.replace(/\b(fresh|frozen|dried|chopped|minced|sliced|diced|grated|crushed|organic|whole|ground)\b/g, '').trim();
            const cleanNew = newName.replace(/\b(fresh|frozen|dried|chopped|minced|sliced|diced|grated|crushed|organic|whole|ground)\b/g, '').trim();
            
            if (cleanExisting === cleanNew) return true;
            
            // Match by key words (for complex ingredient names)
            const existingWords = existingName.split(/\s+/).filter(word => word.length > 2);
            const newWords = newName.split(/\s+/).filter(word => word.length > 2);
            const commonWords = existingWords.filter(word => newWords.includes(word));
            
            // If they share significant words, consider it a match
            return commonWords.length >= Math.min(existingWords.length, newWords.length) * 0.6;
          });
          
          if (existingItem) {
            console.log(`Preserving status for "${newItem.name}" (was "${existingItem.name}"):`, existingItem.isChecked);
            newItem.isChecked = existingItem.isChecked;
            newItem.id = existingItem.id; // Keep the same ID for consistency
          }
        });
        
        const preservedCount = groceryItems.filter(item => item.isChecked).length;
        console.log(`Preserved ${preservedCount} checked items from previous list`);
      }

      setGenerationStep('Saving to database...');

      // Validate and clean all data before saving
      const cleanedItems = validateAndCleanData(groceryItems);
      
      if (groceryList) {
        // Update existing grocery list
        const updateData = {
          items: cleanedItems,
          generatedAt: Timestamp.now()
        };
        
        const cleanedUpdateData = validateAndCleanData(updateData);
        await updateGroceryList(groceryList.id, cleanedUpdateData);

        const updatedList = {
          ...groceryList,
          items: groceryItems,
          generatedAt: Timestamp.now()
        };

        setGroceryList(updatedList);
        const checkedItemsCount = groceryItems.filter(item => item.isChecked).length;
        toast.success(`Grocery list updated with ${groceryItems.length} items! ${checkedItemsCount > 0 ? `${checkedItemsCount} items remain checked.` : ''}`);
      } else {
        // Create new grocery list
        const newGroceryListData = {
          userId,
          weeklyPlanId: weeklyPlan.id,
          items: cleanedItems,
          userIngredients: [],
          generatedAt: Timestamp.now(),
          isCompleted: false
        };

        const cleanedData = validateAndCleanData(newGroceryListData);
        const listId = await createGroceryList(cleanedData);
        
        const createdList: GroceryListType = {
          id: listId,
          ...newGroceryListData,
          items: groceryItems // Use original items for UI display
        };

        setGroceryList(createdList);
        toast.success(`Grocery list generated with ${groceryItems.length} items!`);
      }
      
      setGenerationStep('');
      
    } catch (error: any) {
      console.error('Error generating grocery list:', error);
      setError(`Failed to generate grocery list: ${error.message}`);
      toast.error('Failed to generate grocery list');
      setGenerationStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItemChecked = async (itemId: string) => {
    if (!groceryList) return;

    console.log('Toggling item:', itemId);

    // Optimistically update UI
    const updatedItems = groceryList.items.map(item =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );

    const updatedList = { ...groceryList, items: updatedItems };
    setGroceryList(updatedList);

    try {
      // Clean and save to database
      const cleanedItems = validateAndCleanData(updatedItems);
      const isCompleted = updatedItems.every(item => item.isChecked);
      
      const updateData = validateAndCleanData({ 
        items: cleanedItems,
        isCompleted 
      });
      
      await updateGroceryList(groceryList.id, updateData);
      console.log('Successfully saved checked status');
    } catch (error: any) {
      console.error('Error updating grocery list:', error);
      toast.error('Failed to update item');
      
      // Revert optimistic update on error
      setGroceryList(groceryList);
    }
  };

  const getItemsByCategory = () => {
    if (!groceryList) return {};
    
    return groceryList.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);
  };

  const getCompletionStats = () => {
    if (!groceryList) return { total: 0, completed: 0, percentage: 0 };
    
    const total = groceryList.items.length;
    const completed = groceryList.items.filter(item => item.isChecked).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  const { total, completed, percentage } = getCompletionStats();
  const itemsByCategory = getItemsByCategory();

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Grocery List
            </h3>
            {groceryList && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {completed} of {total} items completed ({percentage}%)
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {generationStep || 'Generating grocery list...'}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          onClick={generateGroceryList}
          disabled={isGenerating}
          className="flex-1 sm:flex-none"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {groceryList ? 'Regenerate List' : 'Generate List'}
        </Button>
        
        {groceryList && (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {groceryList && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Shopping progress: {percentage}% complete
          </p>
        </div>
      )}

      {/* Grocery Items */}
      {groceryList ? (
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                {category}
                <Badge variant="secondary" className="ml-2">
                  {items.length}
                </Badge>
              </h4>
              
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                      ${item.isChecked 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                    onClick={() => toggleItemChecked(item.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`
                        flex items-center justify-center w-5 h-5 rounded border-2 transition-colors
                        ${item.isChecked 
                          ? 'bg-emerald-600 border-emerald-600' 
                          : 'border-gray-300 dark:border-gray-600'
                        }
                      `}>
                        {item.isChecked && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`
                          text-sm font-medium transition-colors
                          ${item.isChecked 
                            ? 'text-emerald-700 dark:text-emerald-300 line-through' 
                            : 'text-gray-900 dark:text-white'
                          }
                        `}>
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} • From: {item.fromRecipes.join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    {item.priority === 'high' && (
                      <Badge variant="default" className="text-xs">
                        Multiple recipes
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Completion Status */}
          {percentage === 100 && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-lg font-medium text-emerald-600 mb-1">
                Shopping Complete!
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You've checked off all items on your grocery list.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No grocery list yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Generate a grocery list from your weekly meal plan
          </p>
          <Button onClick={generateGroceryList} disabled={isGenerating}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Grocery List
          </Button>
        </div>
      )}
    </div>
  );
} 