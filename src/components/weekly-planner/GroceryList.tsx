'use client';

import { useState, useEffect, useMemo } from 'react';
import { WeeklyPlan, GroceryList as GroceryListType, GroceryItem } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { 
  ShoppingCart, X, Check, Download, RefreshCw, Plus, Store, 
  AlertCircle, CheckCircle2, Filter, Search, Star, Clock,
  Utensils, Package, Milk, Beef, Grape, Sandwich, Snowflake, ArrowUpDown
} from 'lucide-react';
import { IngredientMatcher, SmartCategorizer } from '@/lib/ingredient-intelligence';
import StoreLayoutManager from './StoreLayoutManager';
import { createGroceryList, getGroceryList, updateGroceryList } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface GroceryListProps {
  weeklyPlan: WeeklyPlan;
  userId: string;
  onClose: () => void;
}

interface IngredientMatch {
  baseIngredient: string;
  totalQuantity: number;
  unit: string;
  fromRecipes: Array<{
    recipeName: string;
    quantity: number;
    unit: string;
    originalText: string;
  }>;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
  shelfLife: number;
}

// Modern ingredient intelligence system
const INGREDIENT_DATABASE = {
  // Proteins
  'chicken': { 
    category: 'Meat & Poultry', 
    icon: '🐔', 
    shelfLife: 3, 
    costPerUnit: 8.99, 
    unit: 'lb',
    keywords: ['chicken breast', 'chicken thigh', 'chicken leg', 'whole chicken', 'rotisserie chicken']
  },
  'beef': { 
    category: 'Meat & Poultry', 
    icon: '🥩', 
    shelfLife: 4, 
    costPerUnit: 12.99, 
    unit: 'lb',
    keywords: ['ground beef', 'beef chuck', 'steak', 'beef roast', 'ribeye', 'sirloin']
  },
  'salmon': { 
    category: 'Seafood', 
    icon: '🐟', 
    shelfLife: 2, 
    costPerUnit: 14.99, 
    unit: 'lb',
    keywords: ['salmon fillet', 'salmon steak', 'smoked salmon', 'atlantic salmon']
  },
  'eggs': { 
    category: 'Dairy & Eggs', 
    icon: '🥚', 
    shelfLife: 21, 
    costPerUnit: 3.99, 
    unit: 'dozen',
    keywords: ['large eggs', 'egg whites', 'whole eggs', 'organic eggs']
  },
  
  // Produce
  'onion': { 
    category: 'Produce', 
    icon: '🧅', 
    shelfLife: 14, 
    costPerUnit: 1.99, 
    unit: 'lb',
    keywords: ['yellow onion', 'red onion', 'white onion', 'sweet onion', 'green onion']
  },
  'garlic': { 
    category: 'Produce', 
    icon: '🧄', 
    shelfLife: 30, 
    costPerUnit: 0.99, 
    unit: 'head',
    keywords: ['garlic cloves', 'fresh garlic', 'garlic bulb', 'minced garlic']
  },
  'tomato': { 
    category: 'Produce', 
    icon: '🍅', 
    shelfLife: 7, 
    costPerUnit: 2.99, 
    unit: 'lb',
    keywords: ['roma tomatoes', 'cherry tomatoes', 'beefsteak tomatoes', 'grape tomatoes']
  },
  
  // Dairy
  'milk': { 
    category: 'Dairy & Eggs', 
    icon: '🥛', 
    shelfLife: 7, 
    costPerUnit: 3.49, 
    unit: 'gallon',
    keywords: ['whole milk', '2% milk', 'skim milk', 'almond milk', 'soy milk']
  },
  'cheese': { 
    category: 'Dairy & Eggs', 
    icon: '🧀', 
    shelfLife: 14, 
    costPerUnit: 4.99, 
    unit: 'package',
    keywords: ['cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese', 'cream cheese']
  },
  
  // Pantry
  'rice': { 
    category: 'Grains & Pasta', 
    icon: '🍚', 
    shelfLife: 365, 
    costPerUnit: 2.99, 
    unit: 'bag',
    keywords: ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice']
  },
  'pasta': { 
    category: 'Grains & Pasta', 
    icon: '🍝', 
    shelfLife: 365, 
    costPerUnit: 1.99, 
    unit: 'box',
    keywords: ['spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine']
  },
  'olive oil': { 
    category: 'Condiments & Oils', 
    icon: '🫒', 
    shelfLife: 365, 
    costPerUnit: 7.99, 
    unit: 'bottle',
    keywords: ['extra virgin olive oil', 'olive oil', 'cooking oil']
  }
};

const CATEGORY_ICONS = {
  'Meat & Poultry': Beef,
  'Seafood': Package,
  'Dairy & Eggs': Milk,
  'Produce': Grape,
  'Grains & Pasta': Sandwich,
  'Condiments & Oils': Package,
  'Frozen': Snowflake,
  'Beverages': Package,
  'Snacks': Package,
  'General': Package
} as const;

const CATEGORY_COLORS = {
  'Meat & Poultry': 'bg-red-100 text-red-800 border-red-200',
  'Seafood': 'bg-blue-100 text-blue-800 border-blue-200',
  'Dairy & Eggs': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Produce': 'bg-green-100 text-green-800 border-green-200',
  'Grains & Pasta': 'bg-amber-100 text-amber-800 border-amber-200',
  'Condiments & Oils': 'bg-purple-100 text-purple-800 border-purple-200',
  'Frozen': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Beverages': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Snacks': 'bg-pink-100 text-pink-800 border-pink-200',
  'General': 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function GroceryList({ weeklyPlan, userId, onClose }: GroceryListProps) {
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'priority'>('category');
  const [showStoreLayout, setShowStoreLayout] = useState(false);
  const [estimatedShoppingTime, setEstimatedShoppingTime] = useState(25);

  // Smart ingredient extraction with semantic matching
  const extractIngredientsFromRecipes = (weeklyPlan: WeeklyPlan): IngredientMatch[] => {
    const ingredientMap = new Map<string, IngredientMatch>();
    
    // Get all meals from the week
    const allMeals = Object.values(weeklyPlan.meals || {}).flat().filter(meal => 
      meal && meal.recipeName && meal.recipeDetails?.ingredients
    );

    console.log(`Processing ${allMeals.length} meals for grocery list generation`);

    allMeals.forEach(meal => {
      const { recipeName, servings = 1, recipeDetails } = meal;
      
      if (!recipeDetails?.ingredients) return;

      recipeDetails.ingredients.forEach(ingredientText => {
        if (!ingredientText || typeof ingredientText !== 'string') return;

        const processed = processIngredientText(ingredientText, recipeName, servings);
        if (!processed) return;

        const { baseIngredient, quantity, unit, category, priority } = processed;
        const key = baseIngredient.toLowerCase();

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.totalQuantity += quantity;
          existing.fromRecipes.push({
            recipeName,
            quantity,
            unit,
            originalText: ingredientText
          });
          
          // Update priority if multiple recipes use this ingredient
          if (existing.fromRecipes.length > 1) {
            existing.priority = 'high';
          }
        } else {
          const ingredientInfo = findIngredientInfo(baseIngredient);
          
          ingredientMap.set(key, {
            baseIngredient,
            totalQuantity: quantity,
            unit,
            fromRecipes: [{
              recipeName,
              quantity,
              unit,
              originalText: ingredientText
            }],
            category,
            priority,
            estimatedCost: ingredientInfo?.costPerUnit || 2.99,
            shelfLife: ingredientInfo?.shelfLife || 7
          });
        }
      });

      // Add carb base if specified
      if (meal.carbBase) {
        const processed = processIngredientText(meal.carbBase, recipeName, servings);
        if (processed) {
          const { baseIngredient, quantity, unit, category } = processed;
          const key = baseIngredient.toLowerCase();
          
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, {
              baseIngredient,
              totalQuantity: quantity,
              unit,
              fromRecipes: [{ recipeName, quantity, unit, originalText: meal.carbBase }],
              category,
              priority: 'medium',
              estimatedCost: 2.99,
              shelfLife: 7
            });
          }
        }
      }
    });

    return Array.from(ingredientMap.values());
  };

    // Process individual ingredient text with smart parsing using intelligence system
  const processIngredientText = (text: string, recipeName: string, servings: number) => {
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return null;

    // Use intelligent ingredient matching
    const { quantity, unit, cleanedIngredient } = IngredientMatcher.extractQuantityAndUnit(text);
    const scaledQuantity = quantity * servings;

    if (!cleanedIngredient) return null;

    // Use smart categorization
    const category = SmartCategorizer.categorizeIngredient(cleanedIngredient);
    const priority = determinePriority(cleanedIngredient, category);

    return {
      baseIngredient: capitalizeFirst(cleanedIngredient),
      quantity: scaledQuantity,
      unit,
      category,
      priority
    };
  };

  // Find ingredient info from database
  const findIngredientInfo = (ingredient: string) => {
    const lower = ingredient.toLowerCase();
    
    for (const [key, info] of Object.entries(INGREDIENT_DATABASE)) {
      if (lower.includes(key) || info.keywords.some(keyword => lower.includes(keyword))) {
        return info;
      }
    }
    
    return null;
  };

  // Improved categorization
  const categorizeIngredient = (ingredient: string): string => {
    const lower = ingredient.toLowerCase();
    
    const categories = {
      'Meat & Poultry': ['chicken', 'beef', 'pork', 'turkey', 'duck', 'bacon', 'sausage', 'ham'],
      'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallops', 'cod'],
      'Dairy & Eggs': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'eggs', 'sour cream'],
      'Produce': ['onion', 'garlic', 'tomato', 'pepper', 'carrot', 'celery', 'lettuce', 'spinach', 'broccoli', 'potato', 'lemon', 'lime', 'apple', 'banana'],
      'Grains & Pasta': ['rice', 'pasta', 'bread', 'flour', 'oats', 'quinoa', 'noodles', 'cereal'],
      'Condiments & Oils': ['oil', 'vinegar', 'sauce', 'dressing', 'mayo', 'mustard', 'ketchup'],
      'Frozen': ['frozen'],
      'Beverages': ['juice', 'soda', 'water', 'tea', 'coffee', 'wine', 'beer'],
      'Snacks': ['chips', 'crackers', 'nuts', 'cookies', 'candy']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  };

  const determinePriority = (ingredient: string, category: string): 'high' | 'medium' | 'low' => {
    if (category === 'Meat & Poultry' || category === 'Seafood') return 'high';
    if (category === 'Dairy & Eggs' || category === 'Produce') return 'medium';
    return 'low';
  };

  const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Intelligent shopping time calculation
  const calculateShoppingTime = (items: GroceryItem[]): number => {
    // Base time for navigation and checkout
    let baseTime = 8;
    
    // Time per item varies by category
    const categoryTimeMap: Record<string, number> = {
      'Produce': 1.5, // Fresh items need selection time
      'Meat & Poultry': 2.0, // Need to check quality/dates
      'Seafood': 2.0, // Similar to meat
      'Dairy & Eggs': 1.0, // Quick grab items
      'Frozen': 0.8, // Usually standardized
      'Beverages': 0.5, // Simple selection
      'Grains & Pasta': 0.7, // Pantry staples
      'Condiments & Oils': 0.8, // Small items
      'Snacks': 0.6, // Quick picks
      'General': 1.0 // Default
    };

    // Calculate time by category grouping
    const categoriesUsed = new Set(items.map(item => item.category));
    const categoryTime = categoriesUsed.size * 2; // 2 min per category section

    // Individual item time
    const itemTime = items.reduce((total, item) => {
      const timePerItem = categoryTimeMap[item.category] || 1.0;
      return total + timePerItem;
    }, 0);

    // Priority adjustment (high priority items take slightly longer due to careful selection)
    const priorityAdjustment = items.filter(item => item.priority === 'high').length * 0.3;

    const totalTime = baseTime + categoryTime + itemTime + priorityAdjustment;
    
    // Round to nearest 5 minutes and ensure minimum of 15 minutes
    return Math.max(15, Math.round(totalTime / 5) * 5);
  };

  // Generate optimized grocery list
  const generateGroceryList = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Starting intelligent grocery list generation...');
      
      const ingredientMatches = extractIngredientsFromRecipes(weeklyPlan);
      console.log(`Extracted ${ingredientMatches.length} consolidated ingredients`);

      // Convert to GroceryItem format
      const groceryItems: GroceryItem[] = ingredientMatches.map((match, index) => ({
        id: `item_${index}`,
        name: match.baseIngredient,
        quantity: formatQuantity(match.totalQuantity, match.unit),
        category: match.category,
        fromRecipes: match.fromRecipes.map(r => r.recipeName),
        isChecked: false,
        priority: match.priority,
        estimatedCost: match.estimatedCost,
        shelfLife: match.shelfLife,
        storeSection: match.category
      }));

      // Preserve existing checked states
      if (groceryList?.items) {
        groceryItems.forEach(newItem => {
          const existingItem = groceryList.items.find(existing => 
            existing.name.toLowerCase() === newItem.name.toLowerCase() ||
            existing.name.toLowerCase().includes(newItem.name.toLowerCase()) ||
            newItem.name.toLowerCase().includes(existing.name.toLowerCase())
          );
          
          if (existingItem) {
            newItem.isChecked = existingItem.isChecked;
            newItem.id = existingItem.id;
          }
        });
      }

      // Save to database
      const listData = {
        userId,
        weeklyPlanId: weeklyPlan.id,
        items: groceryItems,
        userIngredients: [],
        generatedAt: Timestamp.now(),
        isCompleted: false
      };

      if (groceryList) {
        await updateGroceryList(groceryList.id, {
          items: groceryItems,
          generatedAt: Timestamp.now()
        });
        
        setGroceryList({
          ...groceryList,
          items: groceryItems,
          generatedAt: Timestamp.now()
        });
      } else {
        const listId = await createGroceryList(listData);
        setGroceryList({
          id: listId,
          ...listData
        });
      }

      // Calculate intelligent shopping time estimate
      const timeEstimate = calculateShoppingTime(groceryItems);
      setEstimatedShoppingTime(timeEstimate);

      const preservedCount = groceryItems.filter(item => item.isChecked).length;
      toast.success(
        `Smart grocery list generated with ${groceryItems.length} items!${
          preservedCount > 0 ? ` ${preservedCount} items remain checked.` : ''
        }`
      );

    } catch (error: any) {
      console.error('Error generating grocery list:', error);
      setError(error.message);
      toast.error('Failed to generate grocery list');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatQuantity = (quantity: number, unit: string): string => {
    if (quantity === 1 && unit === 'serving') return 'As needed';
    
    if (quantity % 1 === 0) {
      return `${quantity} ${unit}${quantity > 1 ? 's' : ''}`;
    } else {
      return `${quantity.toFixed(1)} ${unit}${quantity > 1 ? 's' : ''}`;
    }
  };

  // Load existing grocery list
  useEffect(() => {
    const loadGroceryList = async () => {
      try {
        setIsLoading(true);
        const existingList = await getGroceryList(weeklyPlan.id);
        setGroceryList(existingList);
      } catch (error: any) {
        console.error('Error loading grocery list:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroceryList();
  }, [weeklyPlan.id]);

  // Toggle item checked status
  const toggleItemChecked = async (itemId: string) => {
    if (!groceryList) return;

    const updatedItems = groceryList.items.map(item =>
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );

    // Optimistic update
    const updatedList = { ...groceryList, items: updatedItems };
    setGroceryList(updatedList);

    try {
      const isCompleted = updatedItems.every(item => item.isChecked);
      await updateGroceryList(groceryList.id, {
        items: updatedItems,
        isCompleted
      });
    } catch (error: any) {
      console.error('Error updating item:', error);
      setGroceryList(groceryList); // Revert on error
      toast.error('Failed to update item');
    }
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    if (!groceryList) return [];

    let items = groceryList.items;

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fromRecipes.some(recipe => recipe.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Sort items
    items.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2);
      }
      return a.category.localeCompare(b.category);
    });

    return items;
  }, [groceryList, searchTerm, selectedCategory, sortBy]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);
  }, [filteredItems]);

  // Get completion stats
  const stats = useMemo(() => {
    if (!groceryList) return { total: 0, completed: 0, percentage: 0, totalCost: 0 };
    
    const total = groceryList.items.length;
    const completed = groceryList.items.filter(item => item.isChecked).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalCost = groceryList.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    
    return { total, completed, percentage, totalCost };
  }, [groceryList]);

  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    if (!groceryList) return [];
    const categories = [...new Set(groceryList.items.map(item => item.category))];
    return categories.sort();
  }, [groceryList]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Smart Grocery List</h3>
              {groceryList && (
                <div className="flex items-center space-x-4 mt-1 text-emerald-100">
                  <span className="text-sm">{stats.completed}/{stats.total} items</span>
                  <span className="text-sm">≈ ${stats.totalCost.toFixed(2)}</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">Est. {estimatedShoppingTime} min</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        {groceryList && (
          <div className="mt-4">
            <div className="w-full bg-emerald-400/30 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Generation Status */}
        {isGenerating && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Generating intelligent grocery list...
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={generateGroceryList}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {groceryList ? 'Regenerate List' : 'Generate Smart List'}
          </Button>
          
          {groceryList && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStoreLayout(true)}
              >
                <Store className="h-4 w-4 mr-2" />
                Store Layout
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        {groceryList && groceryList.items.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ingredients or recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg px-4 py-2 pr-8 text-emerald-700 dark:text-emerald-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:shadow-md"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
                </div>
                
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'priority')}
                    className="appearance-none bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2 pr-8 text-blue-700 dark:text-blue-300 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:shadow-md"
                  >
                    <option value="category">Sort by Category</option>
                    <option value="name">Sort by Name</option>
                    <option value="priority">Sort by Priority</option>
                  </select>
                  <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grocery Items */}
        {groceryList ? (
          <div className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Package;
              const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100 text-gray-800 border-gray-200';
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">{category}</h4>
                    <Badge className={`${categoryColor} text-xs`}>
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`
                          group flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md
                          ${item.isChecked 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }
                        `}
                        onClick={() => toggleItemChecked(item.id)}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`
                            flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200
                            ${item.isChecked 
                              ? 'bg-emerald-600 border-emerald-600 scale-110' 
                              : 'border-gray-300 dark:border-gray-600 group-hover:border-emerald-500'
                            }
                          `}>
                            {item.isChecked && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className={`
                                font-medium transition-all duration-200
                                ${item.isChecked 
                                  ? 'text-emerald-700 dark:text-emerald-300 line-through' 
                                  : 'text-gray-900 dark:text-white'
                                }
                              `}>
                                {item.name}
                              </p>
                              {item.priority === 'high' && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.quantity}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-500">
                                ${item.estimatedCost?.toFixed(2) || '0.00'}
                              </span>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Utensils className="h-3 w-3" />
                                <span>{item.fromRecipes.length} recipe{item.fromRecipes.length > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            
                            {!item.isChecked && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                From: {item.fromRecipes.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Completion Celebration */}
            {stats.percentage === 100 && (
              <div className="text-center py-8 px-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                  Shopping Complete! 🎉
                </h4>
                <p className="text-emerald-600 dark:text-emerald-400 mb-4">
                  You've checked off all {stats.total} items on your grocery list.
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Total estimated cost: ${stats.totalCost.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No grocery list yet
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Generate an intelligent grocery list from your weekly meal plan with smart ingredient consolidation and optimization.
            </p>
            <Button 
              onClick={generateGroceryList} 
              disabled={isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Smart Grocery List
            </Button>
          </div>
        )}

        {/* Store Layout Manager Modal */}
        {showStoreLayout && groceryList && (
          <StoreLayoutManager
            groceryItems={groceryList.items}
            onClose={() => setShowStoreLayout(false)}
            onOptimize={(optimizedItems, estimatedTime) => {
              // Update grocery list with optimized store sections
              const updatedList = {
                ...groceryList,
                items: optimizedItems
              };
              setGroceryList(updatedList);
              
              // Update time estimate to match store layout
              if (estimatedTime) {
                setEstimatedShoppingTime(estimatedTime);
              }
              
              // Save to database
              updateGroceryList(groceryList.id, {
                items: optimizedItems
              }).catch(error => {
                console.error('Error saving optimized list:', error);
              });
              
              setShowStoreLayout(false);
            }}
          />
        )}
      </div>
    </div>
  );
} 