'use client';

import { useState, useEffect } from 'react';
import { RecipeHistory as RecipeHistoryType, FavoriteRecipe } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { History, X, Star, Clock, Users, Calendar, Heart, Plus } from 'lucide-react';
import { getUserRecipeHistory, addToFavorites, isFavoriteRecipe } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';

interface RecipeHistoryProps {
  userId: string;
  onClose: () => void;
  onSelectRecipe?: (recipeName: string) => void;
}

export default function RecipeHistory({
  userId,
  onClose,
  onSelectRecipe
}: RecipeHistoryProps) {
  const [history, setHistory] = useState<RecipeHistoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRecipeHistory();
  }, [userId]);

  const loadRecipeHistory = async () => {
    try {
      setIsLoading(true);
      const historyData = await getUserRecipeHistory(userId, 100);
      setHistory(historyData);

      // Check favorite status for each recipe
      const statusChecks = historyData.map(async (recipe) => {
        const isFav = await isFavoriteRecipe(userId, recipe.recipeName);
        return { recipeName: recipe.recipeName, isFavorite: isFav };
      });

      const statuses = await Promise.all(statusChecks);
      const statusMap = statuses.reduce((acc, status) => {
        acc[status.recipeName] = status.isFavorite;
        return acc;
      }, {} as Record<string, boolean>);

      setFavoriteStatus(statusMap);
    } catch (error) {
      console.error('Error loading recipe history:', error);
      toast.error('Failed to load recipe history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToFavorites = async (recipe: RecipeHistoryType) => {
    try {
      const favoriteData: Omit<FavoriteRecipe, 'id' | 'addedAt'> = {
        userId,
        recipeName: recipe.recipeName,
        recipeDetails: {
          ingredients: [], // Would need to be stored in history
          instructions: [],
          nutritionalFacts: {
            calories: recipe.nutritionalInfo.calories,
            protein: recipe.nutritionalInfo.protein,
            carbs: recipe.nutritionalInfo.carbs,
            fat: recipe.nutritionalInfo.fat,
            fiber: recipe.nutritionalInfo.fiber,
            sugar: 0,
            sodium: 0
          },
          times: '30 mins' // Placeholder
        },
        rating: recipe.rating || 5,
        timesCooked: 1
      };

      await addToFavorites(favoriteData as Omit<FavoriteRecipe, 'id'>);
      setFavoriteStatus(prev => ({ ...prev, [recipe.recipeName]: true }));
      toast.success(`Added "${recipe.recipeName}" to favorites!`);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      toast.error('Failed to add to favorites');
    }
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRecipeFrequency = (recipeName: string) => {
    return history.filter(h => h.recipeName === recipeName).length;
  };

  const getUniqueRecipes = () => {
    const seen = new Set();
    return history.filter(recipe => {
      if (seen.has(recipe.recipeName)) {
        return false;
      }
      seen.add(recipe.recipeName);
      return true;
    });
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

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <History className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Recipe History
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {history.length} recipes cooked • {getUniqueRecipes().length} unique recipes
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Recipe History List */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No cooking history yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Start cooking recipes to see your history here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {getUniqueRecipes().map((recipe) => {
            const frequency = getRecipeFrequency(recipe.recipeName);
            const lastCooked = history.find(h => h.recipeName === recipe.recipeName);
            const isFav = favoriteStatus[recipe.recipeName];

            return (
              <div
                key={recipe.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {recipe.recipeName}
                      </h4>
                      {isFav && (
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Last: {formatDate(lastCooked?.cookedAt)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {frequency}x cooked
                      </div>
                      {recipe.rating && (
                        <div className="flex items-center">
                          <Star className="h-3 w-3 mr-1 text-yellow-500" />
                          {recipe.rating}/5
                        </div>
                      )}
                    </div>

                    {/* Nutrition Summary */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {recipe.nutritionalInfo.calories}
                        </div>
                        <div className="text-gray-500">cal</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {recipe.nutritionalInfo.protein}g
                        </div>
                        <div className="text-gray-500">protein</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {recipe.nutritionalInfo.carbs}g
                        </div>
                        <div className="text-gray-500">carbs</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {recipe.nutritionalInfo.fat}g
                        </div>
                        <div className="text-gray-500">fat</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {!isFav && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToFavorites(recipe)}
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        Favorite
                      </Button>
                    )}
                    {onSelectRecipe && (
                      <Button
                        size="sm"
                        onClick={() => onSelectRecipe(recipe.recipeName)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Plan
                      </Button>
                    )}
                  </div>
                </div>

                {/* Frequency Badge */}
                {frequency > 1 && (
                  <div className="flex justify-end">
                    <Badge variant="secondary" className="text-xs">
                      Cooked {frequency} times
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 