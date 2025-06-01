'use client';

import { PlannedMeal, UserGoal, DayOfWeek } from '@/types/weekly-planner';
import { Button } from '@/components/ui';
import { Clock, Users, Edit, Trash2, GripVertical } from 'lucide-react';

interface MealCardProps {
  meal: PlannedMeal;
  day: DayOfWeek;
  activeGoal: UserGoal | null;
  onDragStart: (meal: PlannedMeal, day: DayOfWeek) => void;
  onDragEnd: () => void;
  onDelete: (day: DayOfWeek, mealId: string) => void;
  onEdit: (meal: PlannedMeal) => void;
}

export default function MealCard({
  meal,
  day,
  activeGoal,
  onDragStart,
  onDragEnd,
  onDelete,
  onEdit
}: MealCardProps) {
  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'Breakfast':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Lunch':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Dinner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'Snack':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(meal, day);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move"
    >
      {/* Drag Handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Meal Type Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMealTypeColor(meal.mealType)}`}>
          {meal.mealType}
        </span>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(meal)}
            className="h-6 w-6 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(day, meal.id)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Recipe Name */}
      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {meal.recipeName}
      </h4>

      {/* Meal Details */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <div className="flex items-center">
          <Users className="h-3 w-3 mr-1" />
          <span>{meal.servings} serving{meal.servings !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Carb Base */}
      {meal.carbBase && (
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-medium">Base:</span> {meal.carbBase}
        </div>
      )}

      {/* Modifications */}
      {meal.modifications && meal.modifications.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-medium">Mods:</span> {meal.modifications.join(', ')}
        </div>
      )}

      {/* Notes */}
      {meal.notes && (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          "{meal.notes}"
        </div>
      )}

      {/* Goal Progress Indicator (if active goal exists) */}
      {activeGoal && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="text-xs text-emerald-600 dark:text-emerald-400">
            {/* Placeholder for nutritional tracking */}
            Goal tracking coming soon
          </div>
        </div>
      )}
    </div>
  );
} 