'use client';

import { useState, useEffect } from 'react';
import { UserGoal } from '@/types/weekly-planner';
import { Button } from '@/components/ui';
import { X, Target, Save, AlertCircle } from 'lucide-react';
import { createUserGoal, updateUserGoal } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface GoalSetterProps {
  currentGoal: UserGoal | null;
  userId: string;
  onGoalUpdate: (goal: UserGoal | null) => void;
  onClose: () => void;
}

const GOAL_TYPES = [
  {
    value: 'weight_loss' as const,
    label: 'Weight Loss',
    description: 'High protein, moderate carbs, calorie deficit',
    defaultMacros: { calories: 1600, protein: 120, carbs: 100, fat: 60 }
  },
  {
    value: 'muscle_gain' as const,
    label: 'Muscle Gain',
    description: 'High protein, high carbs, calorie surplus',
    defaultMacros: { calories: 2400, protein: 150, carbs: 250, fat: 80 }
  },
  {
    value: 'maintenance' as const,
    label: 'Maintenance',
    description: 'Balanced macros, maintain current weight',
    defaultMacros: { calories: 2000, protein: 100, carbs: 200, fat: 70 }
  },
  {
    value: 'custom' as const,
    label: 'Custom',
    description: 'Set your own macro targets',
    defaultMacros: { calories: 2000, protein: 100, carbs: 200, fat: 70 }
  }
] as const;

const DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'low_carb',
  'keto',
  'paleo',
  'pescatarian',
  'nut_free',
  'low_sodium'
];

type GoalType = typeof GOAL_TYPES[number]['value'];

export default function GoalSetter({ currentGoal, userId, onGoalUpdate, onClose }: GoalSetterProps) {
  const [formData, setFormData] = useState({
    goalType: 'maintenance' as GoalType,
    name: '',
    description: '',
    dailyCalories: 2000,
    dailyProtein: 100,
    dailyCarbs: 200,
    dailyFat: 70,
    dailyFiber: 25,
    dietaryRestrictions: [] as string[],
    autoPerMeal: true // Whether to auto-calculate per-meal targets
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentGoal) {
      setFormData({
        goalType: currentGoal.goalType,
        name: currentGoal.name,
        description: currentGoal.description || '',
        dailyCalories: currentGoal.macroTargets.daily.calories || 2000,
        dailyProtein: currentGoal.macroTargets.daily.protein || 100,
        dailyCarbs: currentGoal.macroTargets.daily.carbs || 200,
        dailyFat: currentGoal.macroTargets.daily.fat || 70,
        dailyFiber: currentGoal.macroTargets.daily.fiber || 25,
        dietaryRestrictions: currentGoal.dietaryRestrictions || [],
        autoPerMeal: !!currentGoal.macroTargets.perMeal
      });
    }
  }, [currentGoal]);

  const handleGoalTypeChange = (goalType: GoalType) => {
    const goalTypeConfig = GOAL_TYPES.find(g => g.value === goalType);
    if (goalTypeConfig) {
      setFormData(prev => ({
        ...prev,
        goalType,
        dailyCalories: goalTypeConfig.defaultMacros.calories,
        dailyProtein: goalTypeConfig.defaultMacros.protein,
        dailyCarbs: goalTypeConfig.defaultMacros.carbs,
        dailyFat: goalTypeConfig.defaultMacros.fat,
        name: goalTypeConfig.label,
        description: goalTypeConfig.description
      }));
    }
  };

  const handleDietaryRestrictionToggle = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    if (formData.dailyCalories < 800 || formData.dailyCalories > 5000) {
      newErrors.dailyCalories = 'Daily calories must be between 800 and 5000';
    }

    if (formData.dailyProtein < 20 || formData.dailyProtein > 300) {
      newErrors.dailyProtein = 'Daily protein must be between 20g and 300g';
    }

    if (formData.dailyCarbs < 20 || formData.dailyCarbs > 500) {
      newErrors.dailyCarbs = 'Daily carbs must be between 20g and 500g';
    }

    if (formData.dailyFat < 20 || formData.dailyFat > 200) {
      newErrors.dailyFat = 'Daily fat must be between 20g and 200g';
    }

    // Check if macros add up reasonably (calories from macros should be close to target calories)
    const macroCalories = (formData.dailyProtein * 4) + (formData.dailyCarbs * 4) + (formData.dailyFat * 9);
    const caloriesDiff = Math.abs(macroCalories - formData.dailyCalories);
    if (caloriesDiff > 200) {
      newErrors.macros = `Macro calories (${macroCalories}) don't match target calories. Adjust your macros.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);
    try {
      const goalData = {
        userId,
        goalType: formData.goalType,
        name: formData.name,
        description: formData.description,
        macroTargets: {
          daily: {
            calories: formData.dailyCalories,
            protein: formData.dailyProtein,
            carbs: formData.dailyCarbs,
            fat: formData.dailyFat,
            fiber: formData.dailyFiber
          },
          ...(formData.autoPerMeal && {
            perMeal: {
              calories: Math.round(formData.dailyCalories / 3),
              protein: Math.round(formData.dailyProtein / 3),
              carbs: Math.round(formData.dailyCarbs / 3),
              fat: Math.round(formData.dailyFat / 3),
              fiber: Math.round(formData.dailyFiber / 3)
            }
          })
        },
        dietaryRestrictions: formData.dietaryRestrictions,
        isActive: true
      };

      let savedGoal: UserGoal;

      if (currentGoal) {
        // Update existing goal
        await updateUserGoal(currentGoal.id, {
          ...goalData,
          updatedAt: Timestamp.now()
        });
        savedGoal = {
          ...currentGoal,
          ...goalData,
          updatedAt: Timestamp.now()
        };
        toast.success('Goal updated successfully!');
      } else {
        // Create new goal (deactivate any existing active goals first)
        const goalId = await createUserGoal({
          ...goalData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        savedGoal = {
          id: goalId,
          ...goalData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        toast.success('Goal created successfully!');
      }

      onGoalUpdate(savedGoal);
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentGoal) return;

    setIsLoading(true);
    try {
      await updateUserGoal(currentGoal.id, {
        isActive: false,
        updatedAt: Timestamp.now()
      });
      onGoalUpdate(null);
      toast.success('Goal deactivated');
      onClose();
    } catch (error) {
      console.error('Error deactivating goal:', error);
      toast.error('Failed to deactivate goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-emerald-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentGoal ? 'Edit Goal' : 'Create New Goal'}
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Goal Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Goal Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GOAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleGoalTypeChange(type.value)}
                className={`p-4 text-left rounded-lg border-2 transition-colors ${
                  formData.goalType === type.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Goal Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g., Summer Cut, Bulk Phase, Healthy Living"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Describe your goal and any specific requirements..."
          />
        </div>

        {/* Macro Targets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Daily Macro Targets
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Calories
              </label>
              <input
                type="number"
                value={formData.dailyCalories}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyCalories: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.dailyProtein}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyProtein: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.dailyCarbs}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyCarbs: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.dailyFat}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyFat: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Fiber (g)
              </label>
              <input
                type="number"
                value={formData.dailyFiber}
                onChange={(e) => setFormData(prev => ({ ...prev, dailyFiber: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          {errors.macros && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.macros}
            </p>
          )}
          
          {/* Macro breakdown */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Macro breakdown: {Math.round((formData.dailyProtein * 4 / formData.dailyCalories) * 100)}% protein, {Math.round((formData.dailyCarbs * 4 / formData.dailyCalories) * 100)}% carbs, {Math.round((formData.dailyFat * 9 / formData.dailyCalories) * 100)}% fat
            </div>
          </div>
        </div>

        {/* Per-meal targets */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoPerMeal"
            checked={formData.autoPerMeal}
            onChange={(e) => setFormData(prev => ({ ...prev, autoPerMeal: e.target.checked }))}
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          />
          <label htmlFor="autoPerMeal" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Auto-calculate per-meal targets (divides daily targets by 3)
          </label>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Dietary Restrictions
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <button
                key={restriction}
                type="button"
                onClick={() => handleDietaryRestrictionToggle(restriction)}
                className={`px-3 py-2 text-xs rounded-full border transition-colors ${
                  formData.dietaryRestrictions.includes(restriction)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {restriction.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {currentGoal && (
              <Button
                variant="outline"
                onClick={handleDeactivate}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                Deactivate Goal
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {currentGoal ? 'Update Goal' : 'Create Goal'}
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 