# Weekly Meal Planner MVP Test Guide

## 🎯 MVP Testing Checklist

### Prerequisites
1. ✅ Application builds successfully (`npm run build`)
2. ✅ Development server runs (`npm run dev`)
3. ✅ User authentication is working
4. ✅ Firebase connection is established

### Core MVP Features to Test

#### 1. Goal Creation & Management
- [ ] Navigate to `/weekly-planner`
- [ ] Click "Set Goals" button
- [ ] Fill out goal form:
  - Goal Name: "Weight Loss Goal"
  - Goal Type: "Weight Loss"
  - Daily Calories: 1800
  - Daily Protein: 140g
  - Daily Carbs: 150g
  - Daily Fat: 60g
- [ ] Save goal successfully
- [ ] Verify goal appears in header

#### 2. Recipe Generation
- [ ] Click "+" button on any day (e.g., Monday)
- [ ] Select meal type (e.g., "Lunch")
- [ ] Verify recipes are generated automatically
- [ ] Check that recipes align with weight loss goal
- [ ] Select a recipe and add to plan
- [ ] Verify meal appears in Monday's column

#### 3. Meal Planning
- [ ] Add meals to different days
- [ ] Try different meal types (Breakfast, Lunch, Dinner, Snack)
- [ ] Test drag-and-drop functionality (move meal between days)
- [ ] Delete a meal from a day
- [ ] Verify meal counts update correctly

#### 4. Grocery List Generation
- [ ] Add several meals to the week
- [ ] Click "Grocery List" button
- [ ] Verify grocery list is generated
- [ ] Check ingredient categorization
- [ ] Test item checking functionality

#### 5. Goal Alignment
- [ ] Create different goal types:
  - Muscle Gain (higher calories/protein)
  - Maintenance (balanced macros)
- [ ] Generate recipes for each goal type
- [ ] Verify recipes change based on goal

### Expected Behavior

#### Goal-Based Recipe Generation
- **Weight Loss**: Lower calorie (250-400), high protein, lower carb recipes
- **Muscle Gain**: Higher calorie (400-600), high protein, complex carb recipes
- **Maintenance**: Balanced macro distribution (350-500 calories)

#### UI Functionality
- Responsive design works on mobile and desktop
- Loading states show during API calls
- Error messages appear for failed operations
- Success toasts confirm completed actions

#### Data Persistence
- Goals save to Firebase and persist on page reload
- Weekly plans save and load correctly
- Meals remain in plan after browser refresh

### Known Limitations (Expected in MVP)
- Recipe nutrition uses estimates (not real recipe database)
- Week navigation not implemented yet
- Export functionality shows "coming soon" message
- Grocery list uses basic categorization

### Test Data Suggestions

#### Sample Goals
1. **Cutting Goal**
   - Calories: 1600
   - Protein: 130g
   - Carbs: 120g
   - Fat: 55g

2. **Bulking Goal**
   - Calories: 2800
   - Protein: 180g
   - Carbs: 350g
   - Fat: 90g

3. **Maintenance Goal**
   - Calories: 2200
   - Protein: 150g
   - Carbs: 250g
   - Fat: 75g

### Success Criteria
- [ ] Can create and save goals
- [ ] Can generate goal-appropriate recipes
- [ ] Can add meals to weekly plan
- [ ] Can view and manage grocery list
- [ ] All data persists correctly
- [ ] No critical errors or crashes
- [ ] UI is responsive and intuitive

### Troubleshooting Common Issues

#### If recipes don't generate:
1. Check browser console for API errors
2. Verify user is authenticated
3. Ensure goal is created first
4. Check network tab for failed requests

#### If data doesn't persist:
1. Check Firebase console for data
2. Verify user permissions
3. Check browser console for database errors

#### If UI is broken:
1. Check for missing UI component imports
2. Verify Tailwind CSS is loading
3. Check for TypeScript errors

---

## 🚀 Ready for MVP Testing!

The Weekly Meal Planner is now ready for comprehensive testing. All core features are implemented and the application builds successfully.

**Test Environment**: http://localhost:3000/weekly-planner
**Authentication Required**: Yes
**Firebase Required**: Yes 