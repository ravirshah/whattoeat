import { WeeklyPlan, UserGoal } from '@/types/weekly-planner';
import { WeeklyNutritionSummary, generateNutritionInsights } from './nutrition-calculations';

// PDF Export utility for rich-formatted nutrition reports
export interface PDFExportOptions {
  weeklyPlan: WeeklyPlan;
  activeGoal: UserGoal | null;
  nutritionData: WeeklyNutritionSummary;
  userInfo?: {
    name?: string;
    email?: string;
  };
  includeRecipes?: boolean;
  includeGroceryList?: boolean;
}

/**
 * Generates a comprehensive weekly nutrition report as HTML for PDF conversion
 */
export const generateNutritionReportHTML = (options: PDFExportOptions): string => {
  const { weeklyPlan, activeGoal, nutritionData, userInfo, includeRecipes = true, includeGroceryList = true } = options;
  
  // Helper function to format dates
  const getDateFromValue = (dateValue: any): Date => {
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate();
    } else if (dateValue instanceof Date) {
      return dateValue;
    } else {
      return new Date(dateValue);
    }
  };
  
  const weekStart = getDateFromValue(weeklyPlan.weekStartDate);
  const weekEnd = getDateFromValue(weeklyPlan.weekEndDate);
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  
  const insights = generateNutritionInsights(nutritionData, weeklyPlan);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Nutrition Report - ${dateRange}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: #ffffff;
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 3px solid #10b981;
        }
        
        .header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: #065f46;
          margin-bottom: 10px;
        }
        
        .header p {
          font-size: 1.2rem;
          color: #6b7280;
          margin-bottom: 5px;
        }
        
        .header .date-range {
          font-size: 1.1rem;
          color: #10b981;
          font-weight: 600;
        }
        
        .section {
          margin-bottom: 40px;
          background: #f9fafb;
          border-radius: 12px;
          padding: 30px;
          border: 1px solid #e5e7eb;
        }
        
        .section-title {
          font-size: 1.8rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 5px;
        }
        
        .stat-target {
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 500;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-top: 10px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-on-track { background: #10b981; }
        .progress-under { background: #f59e0b; }
        .progress-over { background: #ef4444; }
        
        .daily-breakdown {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        
        .day-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        
        .day-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 10px;
          font-size: 0.9rem;
        }
        
        .day-stat {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 0.75rem;
        }
        
        .day-stat-label {
          color: #6b7280;
        }
        
        .day-stat-value {
          font-weight: 600;
          color: #1f2937;
        }
        
        .insights-list {
          list-style: none;
          padding: 0;
        }
        
        .insights-list li {
          background: white;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
          border-left: 4px solid #10b981;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .meal-sources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        
        .source-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        
        .source-count {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 5px;
        }
        
        .source-label {
          font-size: 0.8rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .meals-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .meals-table th,
        .meals-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .meals-table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }
        
        .meal-type {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .meal-breakfast { background: #fef3c7; color: #92400e; }
        .meal-lunch { background: #d1fae5; color: #065f46; }
        .meal-dinner { background: #ddd6fe; color: #5b21b6; }
        .meal-snack { background: #fce7f3; color: #be185d; }
        
        .nutrition-facts {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 0.9rem;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Weekly Nutrition Report</h1>
        ${userInfo?.name ? `<p>Prepared for ${userInfo.name}</p>` : ''}
        <p class="date-range">${dateRange}</p>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <!-- Nutrition Summary Section -->
      <div class="section">
        <h2 class="section-title">📊 Nutrition Summary</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${Math.round(nutritionData.weeklyTotals.calories)}</div>
            <div class="stat-label">Total Calories</div>
            <div class="stat-target">Target: ${Math.round((activeGoal?.macroTargets.daily?.calories || 2000) * 7)}</div>
            <div class="progress-bar">
              <div class="progress-fill progress-${nutritionData.goalComparison.calories.status}" 
                   style="width: ${Math.min(nutritionData.goalComparison.calories.percentage, 100)}%"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(nutritionData.weeklyTotals.protein)}g</div>
            <div class="stat-label">Total Protein</div>
            <div class="stat-target">Target: ${Math.round((activeGoal?.macroTargets.daily?.protein || 150) * 7)}g</div>
            <div class="progress-bar">
              <div class="progress-fill progress-${nutritionData.goalComparison.protein.status}" 
                   style="width: ${Math.min(nutritionData.goalComparison.protein.percentage, 100)}%"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(nutritionData.weeklyTotals.carbs)}g</div>
            <div class="stat-label">Total Carbs</div>
            <div class="stat-target">Target: ${Math.round((activeGoal?.macroTargets.daily?.carbs || 200) * 7)}g</div>
            <div class="progress-bar">
              <div class="progress-fill progress-${nutritionData.goalComparison.carbs.status}" 
                   style="width: ${Math.min(nutritionData.goalComparison.carbs.percentage, 100)}%"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(nutritionData.weeklyTotals.fat)}g</div>
            <div class="stat-label">Total Fat</div>
            <div class="stat-target">Target: ${Math.round((activeGoal?.macroTargets.daily?.fat || 65) * 7)}g</div>
            <div class="progress-bar">
              <div class="progress-fill progress-${nutritionData.goalComparison.fat.status}" 
                   style="width: ${Math.min(nutritionData.goalComparison.fat.percentage, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Breakdown Section -->
      <div class="section">
        <h2 class="section-title">📅 Daily Breakdown</h2>
        <div class="daily-breakdown">
          ${Object.entries(nutritionData.daily).map(([day, dayData]) => `
            <div class="day-card">
              <div class="day-name">${day}</div>
              <div class="day-stat">
                <span class="day-stat-label">Cal:</span>
                <span class="day-stat-value">${Math.round(dayData.calories)}</span>
              </div>
              <div class="day-stat">
                <span class="day-stat-label">Pro:</span>
                <span class="day-stat-value">${Math.round(dayData.protein)}g</span>
              </div>
              <div class="day-stat">
                <span class="day-stat-label">Carb:</span>
                <span class="day-stat-value">${Math.round(dayData.carbs)}g</span>
              </div>
              <div class="day-stat">
                <span class="day-stat-label">Fat:</span>
                <span class="day-stat-value">${Math.round(dayData.fat)}g</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recipe Sources Section -->
      <div class="section">
        <h2 class="section-title">🍽️ Recipe Sources</h2>
        <div class="meal-sources-grid">
          <div class="source-card">
            <div class="source-count">${nutritionData.mealSources.aiGenerated}</div>
            <div class="source-label">AI Generated</div>
          </div>
          <div class="source-card">
            <div class="source-count">${nutritionData.mealSources.favorites}</div>
            <div class="source-label">Favorites</div>
          </div>
          <div class="source-card">
            <div class="source-count">${nutritionData.mealSources.chatInput}</div>
            <div class="source-label">Chat Input</div>
          </div>
          <div class="source-card">
            <div class="source-count">${nutritionData.mealSources.total}</div>
            <div class="source-label">Total Meals</div>
          </div>
        </div>
      </div>

      <!-- Smart Insights Section -->
      <div class="section">
        <h2 class="section-title">💡 Smart Insights</h2>
        <ul class="insights-list">
          ${insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>

      ${includeRecipes ? `
      <!-- Meal Plan Details Section -->
      <div class="section page-break">
        <h2 class="section-title">📋 Weekly Meal Plan</h2>
        <table class="meals-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Meal Type</th>
              <th>Recipe Name</th>
              <th>Servings</th>
              <th>Nutrition Facts</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(weeklyPlan.meals).map(([day, dayMeals]) => 
              dayMeals.map(meal => `
                <tr>
                  <td>${day}</td>
                  <td><span class="meal-type meal-${meal.mealType.toLowerCase()}">${meal.mealType}</span></td>
                  <td>${meal.recipeName}</td>
                  <td>${meal.servings}</td>
                  <td class="nutrition-facts">
                    ${meal.recipeDetails?.nutritionalFacts ? 
                      `${meal.recipeDetails.nutritionalFacts.calories}cal, ${meal.recipeDetails.nutritionalFacts.protein}g protein, ${meal.recipeDetails.nutritionalFacts.carbs}g carbs, ${meal.recipeDetails.nutritionalFacts.fat}g fat` 
                      : 'N/A'
                    }
                  </td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>Generated by What to Eat - Weekly Meal Planner</p>
        <p>Your intelligent nutrition tracking and meal planning companion</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Converts HTML to PDF using browser's print functionality
 */
export const exportToPDF = (options: PDFExportOptions, filename?: string): void => {
  const html = generateNutritionReportHTML(options);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check if pop-ups are blocked.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      
      // Close the window after printing (user can cancel)
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 100);
  };
};

/**
 * Downloads the nutrition report as an HTML file
 */
export const downloadHTMLReport = (options: PDFExportOptions, filename?: string): void => {
  const html = generateNutritionReportHTML(options);
  const blob = new Blob([html], { type: 'text/html' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `nutrition-report-${new Date().toISOString().split('T')[0]}.html`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Generates a summary report for quick viewing
 */
export const generateQuickSummary = (options: PDFExportOptions): string => {
  const { nutritionData, activeGoal } = options;
  
  return `
Weekly Nutrition Summary:
• Total Calories: ${Math.round(nutritionData.weeklyTotals.calories)} (Target: ${Math.round((activeGoal?.macroTargets.daily?.calories || 2000) * 7)})
• Total Protein: ${Math.round(nutritionData.weeklyTotals.protein)}g (Target: ${Math.round((activeGoal?.macroTargets.daily?.protein || 150) * 7)}g)
• Total Carbs: ${Math.round(nutritionData.weeklyTotals.carbs)}g (Target: ${Math.round((activeGoal?.macroTargets.daily?.carbs || 200) * 7)}g)
• Total Fat: ${Math.round(nutritionData.weeklyTotals.fat)}g (Target: ${Math.round((activeGoal?.macroTargets.daily?.fat || 65) * 7)}g)

Recipe Sources:
• AI Generated: ${nutritionData.mealSources.aiGenerated} meals
• Favorites: ${nutritionData.mealSources.favorites} meals  
• Chat Input: ${nutritionData.mealSources.chatInput} meals
• Total: ${nutritionData.mealSources.total} meals

Daily Averages:
• Calories: ${Math.round(nutritionData.dailyAverages.calories)}
• Protein: ${Math.round(nutritionData.dailyAverages.protein)}g
• Carbs: ${Math.round(nutritionData.dailyAverages.carbs)}g
• Fat: ${Math.round(nutritionData.dailyAverages.fat)}g
  `;
}; 