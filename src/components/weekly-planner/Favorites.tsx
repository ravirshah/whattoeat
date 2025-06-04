'use client';

import { useState, useEffect } from 'react';
import { FavoriteRecipe } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { Heart, X, Star, Clock, Users, Plus, Trash2, Calendar } from 'lucide-react';
import { getUserFavorites, removeFromFavorites, updateFavoriteRecipe } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';

interface FavoritesProps {
  userId: string;
  onClose: () => void;
  onSelectRecipe?: (recipe: FavoriteRecipe) => void;
}

export default function Favorites({
  userId,
  onClose,
  onSelectRecipe
}: FavoritesProps) {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'added' | 'rating' | 'cooked'>('added');

  useEffect(() => {
    loadFavorites();
  }, [userId]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favoritesData = await getUserFavorites(userId);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorite recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string, recipeName: string) => {
    try {
      await removeFromFavorites(favoriteId);
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast.success(`Removed "${recipeName}" from favorites`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  const handleUpdateRating = async (favoriteId: string, newRating: number) => {
    try {
      await updateFavoriteRecipe(favoriteId, { rating: newRating });
      setFavorites(prev => prev.map(fav => 
        fav.id === favoriteId ? { ...fav, rating: newRating } : fav
      ));
      toast.success('Rating updated!');
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error('Failed to update rating');
    }
  };

  const getSortedFavorites = () => {
    return [...favorites].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'cooked':
          return b.timesCooked - a.timesCooked;
        case 'added':
        default:
          const aTime = (a.addedAt as any)?.seconds || new Date(a.addedAt as any).getTime() / 1000;
          const bTime = (b.addedAt as any)?.seconds || new Date(b.addedAt as any).getTime() / 1000;
          return bTime - aTime;
      }
    });
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStarRating = (favorite: FavoriteRecipe) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleUpdateRating(favorite.id, star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-3 w-3 transition-colors ${
                star <= favorite.rating
                  ? 'text-yellow-500 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-1">{favorite.rating}/5</span>
      </div>
    );
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
          <Heart className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Favorite Recipes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {favorites.length} favorite recipes
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sort Controls */}
      {favorites.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <div className="flex space-x-1">
            {[
              { key: 'added', label: 'Date Added' },
              { key: 'rating', label: 'Rating' },
              { key: 'cooked', label: 'Times Cooked' }
            ].map((sort) => (
              <Button
                key={sort.key}
                variant={sortBy === sort.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sort.key as any)}
                className="text-xs"
              >
                {sort.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Favorites List */}
      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No favorite recipes yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Add recipes to your favorites to see them here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {getSortedFavorites().map((favorite) => (
            <div
              key={favorite.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {favorite.recipeName}
                    </h4>
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Added: {formatDate(favorite.addedAt)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {favorite.timesCooked}x cooked
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-3">
                    {renderStarRating(favorite)}
                  </div>

                  {/* Nutrition Summary */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {favorite.recipeDetails.nutritionalFacts.calories}
                      </div>
                      <div className="text-gray-500">cal</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {favorite.recipeDetails.nutritionalFacts.protein}g
                      </div>
                      <div className="text-gray-500">protein</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {favorite.recipeDetails.nutritionalFacts.carbs}g
                      </div>
                      <div className="text-gray-500">carbs</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {favorite.recipeDetails.nutritionalFacts.fat}g
                      </div>
                      <div className="text-gray-500">fat</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {favorite.tags && favorite.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {favorite.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {onSelectRecipe && (
                    <Button
                      size="sm"
                      onClick={() => onSelectRecipe(favorite)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add to Plan
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFavorite(favorite.id, favorite.recipeName)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>

              {/* Times Cooked Badge */}
              {favorite.timesCooked > 1 && (
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-xs">
                    Popular choice - cooked {favorite.timesCooked} times
                  </Badge>
                  {favorite.lastCooked && (
                    <span className="text-xs text-gray-500">
                      Last cooked: {formatDate(favorite.lastCooked)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 