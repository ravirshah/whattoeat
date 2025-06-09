'use client';

import { useState, useEffect } from 'react';
import { NutritionEntry, UserGoal, MacroTarget, WeeklyPlan } from '@/types/weekly-planner';
import { Button } from '@/components/ui';
import { BarChart3, X, Calendar, Target, TrendingUp, ChevronLeft, ChevronRight, Plus, Edit2, Download } from 'lucide-react';
import { getNutritionEntry, saveNutritionEntry, updateNutritionEntry, getUserNutritionHistory } from '@/lib/weekly-planner-db';
import { toast } from 'sonner';
import { calculateWeeklyNutrition, WeeklyNutritionSummary } from '@/lib/nutrition-calculations';
import { exportToPDF, downloadHTMLReport } from '@/lib/pdf-export';

interface NutritionTrackerProps {
  userId: string;
  activeGoal: UserGoal | null;
  weeklyPlan: WeeklyPlan;
  onClose: () => void;
}

export default function NutritionTracker({
  userId,
  activeGoal,
  weeklyPlan,
  onClose
}: NutritionTrackerProps) {
  const [nutritionData, setNutritionData] = useState<WeeklyNutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    calculateWeeklyNutritionData();
  }, [weeklyPlan, activeGoal]);

  const calculateWeeklyNutritionData = async () => {
    try {
      setIsLoading(true);
      
      if (!weeklyPlan || !activeGoal) {
        setIsLoading(false);
        return;
      }

      // Use the unified calculation system
      const data = calculateWeeklyNutrition(weeklyPlan, activeGoal);
      setNutritionData(data);
      
    } catch (error) {
      console.error('Error calculating weekly nutrition:', error);
      toast.error('Failed to calculate nutrition data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / (target * 7)) * 100, 100); // Weekly target is daily target * 7
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-emerald-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleExportPDF = async () => {
    if (!nutritionData || !activeGoal) {
      toast.error('No nutrition data available to export');
      return;
    }

    try {
      exportToPDF({
        weeklyPlan,
        activeGoal,
        nutritionData,
        userInfo: {
          name: activeGoal.name
        },
        includeRecipes: true,
        includeGroceryList: false
      });
      toast.success('PDF export initiated');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const formatWeekRange = () => {
    // Handle both Date objects and Firestore Timestamps
    const getDateFromValue = (dateValue: any): Date => {
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        return dateValue.toDate();
      } else if (dateValue instanceof Date) {
        return dateValue;
      } else {
        return new Date(dateValue);
      }
    };
    
    const start = getDateFromValue(weeklyPlan.weekStartDate);
    const end = getDateFromValue(weeklyPlan.weekEndDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Weekly Nutrition Overview
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatWeekRange()} - Track your weekly nutrition goals
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Summary Cards */}
      {activeGoal && nutritionData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { key: 'calories', label: 'Calories', unit: 'cal', color: 'bg-blue-500', target: activeGoal.macroTargets.daily?.calories },
            { key: 'protein', label: 'Protein', unit: 'g', color: 'bg-emerald-500', target: activeGoal.macroTargets.daily?.protein },
            { key: 'carbs', label: 'Carbs', unit: 'g', color: 'bg-orange-500', target: activeGoal.macroTargets.daily?.carbs },
            { key: 'fat', label: 'Fat', unit: 'g', color: 'bg-purple-500', target: activeGoal.macroTargets.daily?.fat }
          ].map((macro) => {
            const current = nutritionData.weeklyTotals[macro.key as keyof typeof nutritionData.weeklyTotals] || 0;
            const weeklyTarget = (macro.target || 0) * 7;
            const progress = calculateProgress(current, macro.target || 1);
            const dailyAverage = current / 7;
            
            return (
              <div key={macro.key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {macro.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Weekly:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.round(current)} {macro.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg/day:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {Math.round(dailyAverage)} / {macro.target} {macro.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          Daily Breakdown
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {Object.entries(nutritionData?.daily || {}).map(([day, nutrition]) => {
            const totalMeals = weeklyPlan.meals[day as keyof typeof weeklyPlan.meals]?.length || 0;
            
            return (
              <div key={day} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center mb-2">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                    {day.slice(0, 3)}
                  </h5>
                  <p className="text-xs text-gray-500">
                    {totalMeals} meal{totalMeals !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cal:</span>
                    <span className="font-medium">{Math.round(nutrition.calories)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pro:</span>
                    <span className="font-medium">{Math.round(nutrition.protein)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carb:</span>
                    <span className="font-medium">{Math.round(nutrition.carbs)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fat:</span>
                    <span className="font-medium">{Math.round(nutrition.fat)}g</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Goals Summary */}
      {activeGoal && nutritionData && (
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Weekly Goal Progress
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {nutritionData.mealSources.total}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Total Meals</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {Object.keys(nutritionData.daily).filter(day => 
                  weeklyPlan.meals[day as keyof typeof weeklyPlan.meals]?.length > 0
                ).length}/7
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Days Planned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {Math.round(nutritionData.dailyAverages.calories)}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Avg Daily Cal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {activeGoal.goalType.replace('_', ' ')}
              </div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Goal Type</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!nutritionData || Object.values(weeklyPlan.meals).flat().length === 0) && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No nutrition data available
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add meals with recipe details to see nutrition tracking
          </p>
        </div>
      )}
    </div>
  );
} 