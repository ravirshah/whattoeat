'use client';

import { useState, useEffect } from 'react';
import { WeeklyPlan, GroceryList as GroceryListType, GroceryItem } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { ShoppingCart, X, Check, Download, RefreshCw, Plus } from 'lucide-react';
import { createGroceryList, getGroceryList, updateGroceryList } from '@/lib/weekly-planner-db';
import { getSavedRecipes } from '@/lib/db';
import { toast } from 'sonner';

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

  useEffect(() => {
    loadGroceryList();
  }, [weeklyPlan.id]);

  const loadGroceryList = async () => {
    try {
      setIsLoading(true);
      const existingList = await getGroceryList(weeklyPlan.id);
      setGroceryList(existingList);
    } catch (error) {
      console.error('Error loading grocery list:', error);
    } finally {
      setIsLoading(false);
    }
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
          // Add each ingredient from the recipe
          meal.recipeDetails.ingredients.forEach((ingredient) => {
            // Check if this ingredient already exists in the list
            const existingItem = groceryItems.find(item => 
              item.name.toLowerCase().includes(ingredient.toLowerCase()) ||
              ingredient.toLowerCase().includes(item.name.toLowerCase())
            );

            if (existingItem) {
              // Add this recipe to the existing item's fromRecipes
              if (!existingItem.fromRecipes.includes(meal.recipeName)) {
                existingItem.fromRecipes.push(meal.recipeName);
              }
            } else {
              // Create new grocery item
              groceryItems.push({
                id: `item_${itemIndex++}`,
                name: ingredient,
                quantity: `${meal.servings} servings`,
                category: categorizeIngredient(ingredient),
                fromRecipes: [meal.recipeName],
                isChecked: false
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
            isChecked: false
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
        groceryItems.push({
          id: `carb_${itemIndex++}`,
          name: base,
          quantity: `${relatedMeals.reduce((sum, meal) => sum + meal.servings, 0)} servings`,
          category: 'Grains & Starches',
          fromRecipes: relatedMeals.map(meal => meal.recipeName),
          isChecked: false
        });
      });

      const newGroceryList: Omit<GroceryListType, 'id'> = {
        userId,
        weeklyPlanId: weeklyPlan.id,
        items: groceryItems,
        userIngredients,
        generatedAt: new Date() as any,
        isCompleted: false
      };

      const listId = await createGroceryList(newGroceryList);
      const createdList: GroceryListType = {
        id: listId,
        ...newGroceryList
      };

      setGroceryList(createdList);
      toast.success(`Grocery list generated with ${groceryItems.length} items!`);
    } catch (error) {
      console.error('Error generating grocery list:', error);
      toast.error('Failed to generate grocery list');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to categorize ingredients
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

  const toggleItemChecked = async (itemId: string) => {
    if (!groceryList) return;

    const updatedItems = groceryList.items.map(item =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );

    const updatedList = { ...groceryList, items: updatedItems };
    setGroceryList(updatedList);

    try {
      await updateGroceryList(groceryList.id, { items: updatedItems });
    } catch (error) {
      console.error('Error updating grocery list:', error);
      toast.error('Failed to update item');
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

  const getCompletionStats = () => {
    if (!groceryList) return { total: 0, completed: 0 };
    
    const total = groceryList.items.length;
    const completed = groceryList.items.filter(item => item.isChecked).length;
    return { total, completed };
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
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                {category}
              </h4>
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
          ))}
          
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