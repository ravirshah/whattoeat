'use client';

import { useState, useEffect } from 'react';
import { WeeklyPlan, GroceryList as GroceryListType, GroceryItem, StoreLayout } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { ShoppingCart, X, Check, Download, RefreshCw, Plus, MapPin, Settings } from 'lucide-react';
import { createGroceryList, getGroceryList, updateGroceryList, getUserStoreLayouts, getDefaultStoreLayout } from '@/lib/weekly-planner-db';
import { getSavedRecipes } from '@/lib/db';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface GroceryListProps {
  weeklyPlan: WeeklyPlan;
  userId: string;
  onClose: () => void;
}

export default function GroceryList({
  weeklyPlan,
  userId,
  onClose
}: GroceryListProps) {
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [storeLayouts, setStoreLayouts] = useState<StoreLayout[]>([]);
  const [selectedStoreLayout, setSelectedStoreLayout] = useState<StoreLayout | null>(null);
  const [showStoreLayoutEditor, setShowStoreLayoutEditor] = useState(false);
  const [sortByStore, setSortByStore] = useState(false);

  useEffect(() => {
    loadGroceryList();
    loadStoreLayouts();
  }, [weeklyPlan.id]);

  const loadGroceryList = async () => {
    try {
      setIsLoading(true);
      console.log('Loading grocery list for weekly plan:', weeklyPlan.id);
      console.log('Weekly plan user ID:', weeklyPlan.userId);
      
      const existingList = await getGroceryList(weeklyPlan.id);
      console.log('Loaded grocery list:', existingList);
      
      if (existingList) {
        console.log('Found existing grocery list with', existingList.items.length, 'items');
        console.log('Checked items:', existingList.items.filter(item => item.isChecked).length);
      } else {
        console.log('No existing grocery list found for this weekly plan');
      }
      
      setGroceryList(existingList);
    } catch (error: any) {
      console.error('Error loading grocery list:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied loading grocery list - user may not have access');
        toast.error('Unable to load grocery list - permission denied');
      } else {
        toast.error('Failed to load grocery list');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoreLayouts = async () => {
    try {
      // Temporarily disable store layouts due to missing Firestore index
      // TODO: Create the Firestore index and re-enable this
      // const layouts = await getUserStoreLayouts(userId);
      const layouts: StoreLayout[] = [];
      setStoreLayouts(layouts);
      
      // Set default store layout if available
      const defaultLayout = layouts.find(layout => layout.isDefault) || layouts[0];
      if (defaultLayout) {
        setSelectedStoreLayout(defaultLayout);
      }
    } catch (error) {
      console.error('Error loading store layouts:', error);
    }
  };

  // Helper function to extract original servings from recipe details
  const extractServingsFromRecipe = (recipeDetails: any): number => {
    // Try to extract from times field (e.g., "Serves 4" or "4 servings")
    if (recipeDetails.times) {
      const servesMatch = recipeDetails.times.match(/serves?\s+(\d+)/i);
      if (servesMatch) return parseInt(servesMatch[1]);
      
      const servingsMatch = recipeDetails.times.match(/(\d+)\s+servings?/i);
      if (servingsMatch) return parseInt(servingsMatch[1]);
    }
    
    // Default to 1 if not found
    return 1;
  };

  const generateGroceryList = async () => {
    setIsGenerating(true);
    try {
      // Get all planned meals
      const allMeals = Object.values(weeklyPlan.meals).flat();
      
      if (allMeals.length === 0) {
        toast.error('No meals planned for this week');
        return;
      }

      // Extract ingredients from meals that have recipe details
      const groceryItems: GroceryItem[] = [];
      let itemIndex = 0;

      allMeals.forEach((meal) => {
        if (meal.recipeDetails && meal.recipeDetails.ingredients) {
          // Scale ingredients based on serving size difference
          // Extract original servings from recipe name or default to 1
          const originalServings = extractServingsFromRecipe(meal.recipeDetails) || 1;
          const scalingFactor = meal.servings / originalServings;
          
          // Add each ingredient from the recipe
          meal.recipeDetails.ingredients.forEach((ingredient) => {
            // Scale ingredient quantities
            const scaledIngredient = scaleIngredient(ingredient, scalingFactor);
            
            // Check if this ingredient already exists in the list
            const existingItem = groceryItems.find(item => 
              item.name.toLowerCase().includes(scaledIngredient.toLowerCase()) ||
              scaledIngredient.toLowerCase().includes(item.name.toLowerCase())
            );

            if (existingItem) {
              // Add this recipe to the existing item's fromRecipes
              if (!existingItem.fromRecipes.includes(meal.recipeName)) {
                existingItem.fromRecipes.push(meal.recipeName);
              }
            } else {
              // Create new grocery item
              const storeLocation = getStoreLocationForIngredient(scaledIngredient);
              groceryItems.push({
                id: `item_${itemIndex++}`,
                name: scaledIngredient,
                quantity: `${meal.servings} servings`,
                category: storeLocation.category,
                fromRecipes: [meal.recipeName],
                isChecked: false,
                storeSection: storeLocation.storeSection,
                ...(storeLocation.aisle && { aisle: storeLocation.aisle })
              });
            }
          });
        } else {
          // Fallback for meals without recipe details
          groceryItems.push({
            id: `item_${itemIndex++}`,
            name: `Ingredients for ${meal.recipeName}`,
            quantity: `${meal.servings} servings`,
            category: 'General',
            fromRecipes: [meal.recipeName],
            isChecked: false,
            storeSection: 'General'
          });
        }
      });

      // Add carb bases as separate items
      const carbBases = allMeals
        .filter(meal => meal.carbBase)
        .map(meal => meal.carbBase!)
        .filter((base, index, array) => array.indexOf(base) === index);
      
      carbBases.forEach((base) => {
        const relatedMeals = allMeals.filter(meal => meal.carbBase === base);
        const storeLocation = getStoreLocationForIngredient(base);
        groceryItems.push({
          id: `carb_${itemIndex++}`,
          name: base,
          quantity: `${relatedMeals.reduce((sum, meal) => sum + meal.servings, 0)} servings`,
          category: 'Grains & Starches',
          fromRecipes: relatedMeals.map(meal => meal.recipeName),
          isChecked: false,
          storeSection: storeLocation.storeSection,
          ...(storeLocation.aisle && { aisle: storeLocation.aisle })
        });
      });

      // Preserve checked status from existing list
      if (groceryList) {
        groceryItems.forEach(newItem => {
          const existingItem = groceryList.items.find(existing => 
            existing.name.toLowerCase() === newItem.name.toLowerCase()
          );
          if (existingItem) {
            newItem.isChecked = existingItem.isChecked;
            newItem.id = existingItem.id; // Keep the same ID
          }
        });
      }

      if (groceryList) {
        // Update existing grocery list
        const updatedList = {
          ...groceryList,
          items: groceryItems,
          generatedAt: Timestamp.now()
        };

        await updateGroceryList(groceryList.id, {
          items: cleanUndefinedValues(groceryItems),
          generatedAt: Timestamp.now()
        });

        setGroceryList(updatedList);
        toast.success(`Grocery list updated with ${groceryItems.length} items!`);
      } else {
        // Create new grocery list
        const newGroceryList: Omit<GroceryListType, 'id'> = {
          userId,
          weeklyPlanId: weeklyPlan.id,
          items: groceryItems,
          userIngredients,
          generatedAt: Timestamp.now(),
          isCompleted: false
        };

        const listId = await createGroceryList(cleanUndefinedValues(newGroceryList));
        const createdList: GroceryListType = {
          id: listId,
          ...newGroceryList
        };

        setGroceryList(createdList);
        toast.success(`Grocery list generated with ${groceryItems.length} items!`);
      }
    } catch (error) {
      console.error('Error generating grocery list:', error);
      toast.error('Failed to generate grocery list');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to scale ingredient quantities
  const scaleIngredient = (ingredient: string, scalingFactor: number): string => {
    if (scalingFactor === 1) return ingredient;
    
    // Pattern to match numbers (including fractions) at the start of ingredients
    const numberPattern = /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.+)/;
    const match = ingredient.match(numberPattern);
    
    if (match) {
      const originalAmount = parseFloat(match[1]);
      const restOfIngredient = match[2];
      const scaledAmount = originalAmount * scalingFactor;
      
      // Format the scaled amount nicely
      let formattedAmount: string;
      if (scaledAmount % 1 === 0) {
        formattedAmount = scaledAmount.toString();
      } else if (scaledAmount < 1) {
        // Convert to fraction for small amounts
        if (scaledAmount === 0.5) formattedAmount = '1/2';
        else if (scaledAmount === 0.25) formattedAmount = '1/4';
        else if (scaledAmount === 0.75) formattedAmount = '3/4';
        else formattedAmount = scaledAmount.toFixed(2);
      } else {
        formattedAmount = scaledAmount.toFixed(1).replace('.0', '');
      }
      
      return `${formattedAmount} ${restOfIngredient}`;
    }
    
    // If no number found, return original ingredient with scaling note
    return scalingFactor < 1 ? `${ingredient} (scaled for ${scalingFactor.toFixed(1)}x)` : ingredient;
  };

  // Helper function to categorize ingredients with store layout
  const categorizeIngredient = (ingredient: string): string => {
    const lowerIngredient = ingredient.toLowerCase();
    
    if (lowerIngredient.includes('chicken') || lowerIngredient.includes('beef') || 
        lowerIngredient.includes('pork') || lowerIngredient.includes('fish') ||
        lowerIngredient.includes('salmon') || lowerIngredient.includes('turkey')) {
      return 'Meat & Seafood';
    }
    
    if (lowerIngredient.includes('milk') || lowerIngredient.includes('cheese') || 
        lowerIngredient.includes('yogurt') || lowerIngredient.includes('butter') ||
        lowerIngredient.includes('cream')) {
      return 'Dairy';
    }
    
    if (lowerIngredient.includes('tomato') || lowerIngredient.includes('onion') || 
        lowerIngredient.includes('carrot') || lowerIngredient.includes('pepper') ||
        lowerIngredient.includes('lettuce') || lowerIngredient.includes('spinach') ||
        lowerIngredient.includes('broccoli') || lowerIngredient.includes('cucumber')) {
      return 'Produce';
    }
    
    if (lowerIngredient.includes('rice') || lowerIngredient.includes('pasta') || 
        lowerIngredient.includes('bread') || lowerIngredient.includes('quinoa') ||
        lowerIngredient.includes('oats') || lowerIngredient.includes('flour')) {
      return 'Grains & Starches';
    }
    
    if (lowerIngredient.includes('oil') || lowerIngredient.includes('vinegar') || 
        lowerIngredient.includes('salt') || lowerIngredient.includes('pepper') ||
        lowerIngredient.includes('spice') || lowerIngredient.includes('herb')) {
      return 'Pantry';
    }
    
    return 'General';
  };

  // Enhanced function to get store section and aisle for an ingredient
  const getStoreLocationForIngredient = (ingredient: string) => {
    const category = categorizeIngredient(ingredient);
    
    if (!selectedStoreLayout) {
      return { category, storeSection: category, aisle: undefined };
    }

    // Find the store section that contains this category
    const storeSection = selectedStoreLayout.sections.find(section => 
      section.categories.includes(category)
    );

    return {
      category,
      storeSection: storeSection?.name || category,
      aisle: storeSection?.aisle
    };
  };

  const toggleItemChecked = async (itemId: string) => {
    if (!groceryList) return;

    console.log('Toggling item:', itemId);
    console.log('Current grocery list:', groceryList.id);

    // Optimistically update UI
    const updatedItems = groceryList.items.map(item =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );

    const updatedList = { ...groceryList, items: updatedItems };
    setGroceryList(updatedList);

    try {
      // Save to database
      console.log('Saving checked status to database...');
      await updateGroceryList(groceryList.id, { 
        items: cleanUndefinedValues(updatedItems),
        isCompleted: updatedItems.every(item => item.isChecked)
      });
      console.log('Successfully saved checked status');
    } catch (error) {
      console.error('Error updating grocery list:', error);
      toast.error('Failed to update item');
      
      // Revert optimistic update on error
      setGroceryList(groceryList);
    }
  };

  const addUserIngredient = () => {
    if (newIngredient.trim() && !userIngredients.includes(newIngredient.trim())) {
      setUserIngredients([...userIngredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeUserIngredient = (ingredient: string) => {
    setUserIngredients(userIngredients.filter(ing => ing !== ingredient));
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

  const getItemsByStoreLayout = () => {
    if (!groceryList || !selectedStoreLayout) return {};
    
    // Group items by store section and sort by aisle
    const itemsBySection = groceryList.items.reduce((acc, item) => {
      const sectionName = item.storeSection || item.category;
      if (!acc[sectionName]) {
        acc[sectionName] = [];
      }
      acc[sectionName].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    // Sort sections by their order in the store layout
    const sortedSections: Record<string, GroceryItem[]> = {};
    
    // First add sections from the store layout in order
    selectedStoreLayout.sections
      .sort((a, b) => a.order - b.order)
      .forEach(section => {
        if (itemsBySection[section.name]) {
          sortedSections[section.name] = itemsBySection[section.name];
        }
      });

    // Then add any remaining sections not in the layout
    Object.keys(itemsBySection).forEach(sectionName => {
      if (!sortedSections[sectionName]) {
        sortedSections[sectionName] = itemsBySection[sectionName];
      }
    });

    return sortedSections;
  };

  const getCompletionStats = () => {
    if (!groceryList) return { total: 0, completed: 0 };
    
    const total = groceryList.items.length;
    const completed = groceryList.items.filter(item => item.isChecked).length;
    return { total, completed };
  };

  // Helper function to remove undefined values from objects before saving to Firestore
  const cleanUndefinedValues = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanUndefinedValues);
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    return obj;
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

  const { total, completed } = getCompletionStats();
  const itemsByCategory = getItemsByCategory();
  const itemsByStoreLayout = getItemsByStoreLayout();
  const itemsToDisplay = sortByStore && selectedStoreLayout ? itemsByStoreLayout : itemsByCategory;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Grocery List
          </h3>
          {groceryList && (
            <Badge variant="outline">
              {completed}/{total} items
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateGroceryList}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {groceryList ? 'Regenerate' : 'Generate'}
          </Button>
          
          {/* Store Layout Controls */}
          {storeLayouts.length > 0 && (
            <>
              <select
                value={selectedStoreLayout?.id || ''}
                onChange={(e) => {
                  const layout = storeLayouts.find(l => l.id === e.target.value);
                  setSelectedStoreLayout(layout || null);
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">No Store Layout</option>
                {storeLayouts.map(layout => (
                  <option key={layout.id} value={layout.id}>
                    {layout.storeName}
                  </option>
                ))}
              </select>
              
              {selectedStoreLayout && (
                <Button
                  variant={sortByStore ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortByStore(!sortByStore)}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Store Layout
                </Button>
              )}
            </>
          )}
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* User Ingredients Section */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Ingredients I Already Have</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {userIngredients.map(ingredient => (
            <Badge
              key={ingredient}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeUserIngredient(ingredient)}
            >
              {ingredient}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addUserIngredient()}
            placeholder="Add ingredient you have..."
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button size="sm" onClick={addUserIngredient}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grocery List Content */}
      {!groceryList ? (
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No grocery list yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a grocery list based on your planned meals
          </p>
          <Button onClick={generateGroceryList} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Grocery List'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(itemsToDisplay).map(([sectionName, items]) => {
            const sectionInfo = sortByStore && selectedStoreLayout 
              ? selectedStoreLayout.sections.find(s => s.name === sectionName)
              : null;
            
            return (
              <div key={sectionName}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {sectionName}
                  </h4>
                  {sectionInfo?.aisle && (
                    <Badge variant="outline" className="text-xs">
                      Aisle {sectionInfo.aisle}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        item.isChecked
                          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <button
                        onClick={() => toggleItemChecked(item.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          item.isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {item.isChecked && <Check className="h-3 w-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className={`font-medium ${
                          item.isChecked ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.quantity}
                        </div>
                        {item.fromRecipes.length > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            For: {item.fromRecipes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Export Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Grocery List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 