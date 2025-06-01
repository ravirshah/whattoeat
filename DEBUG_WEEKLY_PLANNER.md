# Weekly Meal Planner Debugging Guide

## 🚨 Core Issues Identified & Fixed

### Issue 1: Database Operations ✅ FIXED
**Problem**: Date/Timestamp conversion issues
**Solution**: Added proper conversion functions in `weekly-planner-db.ts`

### Issue 2: Goal Creation Process ✅ FIXED  
**Problem**: Missing timestamp fields in goal data
**Solution**: Added `createdAt` and `updatedAt` timestamps to goal creation

### Issue 3: Enhanced Error Handling ✅ ADDED
**Problem**: Generic error messages
**Solution**: Added specific error handling and console logging

## 🔧 Quick Fixes Applied

### 1. Database Operations (`src/lib/weekly-planner-db.ts`)
```typescript
// Added helper functions
const dateToTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);
const timestampToDate = (timestamp: any): Date => timestamp?.toDate() || new Date(timestamp);

// Enhanced all database operations with proper date conversion
// Added comprehensive logging for debugging
```

### 2. Goal Creation (`src/components/weekly-planner/GoalSetter.tsx`)
```typescript
// Fixed goal data structure
const goalData = {
  userId,
  goalType: formData.goalType,
  name: formData.name,
  description: formData.description,
  macroTargets: { daily: dailyMacros, ...(perMealMacros && { perMeal: perMealMacros }) },
  dietaryRestrictions: formData.dietaryRestrictions,
  isActive: true,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};
```

### 3. Plan Creation (`src/app/weekly-planner/page.tsx`)
```typescript
// Enhanced error handling and logging
// Better debugging output for troubleshooting
```

## 🧪 Testing Steps

### 1. Check Browser Console
Open Developer Tools → Console and look for:
- Firebase connection logs
- Database operation logs
- Error messages with specific details

### 2. Test Goal Creation
1. Navigate to `/weekly-planner`
2. Click "Set Goals" 
3. Fill out form with test data:
   - Goal Name: "Test Goal"
   - Goal Type: "Weight Loss"
   - Daily Calories: 1800
4. Submit and check console

### 3. Test Plan Creation
1. Check if plan loads automatically
2. Look for "Creating plan with data:" in console
3. Verify plan ID is generated

## 🔍 Common Issues & Solutions

### Permission Denied Errors
**Cause**: Firestore security rules too restrictive
**Solution**: Apply the rules from `FIRESTORE_RULES.txt`

### Network Errors
**Cause**: Firebase configuration or connection issues
**Solution**: Check environment variables and Firebase setup

### Type Errors
**Cause**: TypeScript compilation issues
**Solution**: Fixed with proper type definitions

## 🚀 Ready for Testing

### Current Status
- ✅ Build successful (`npm run build`)
- ✅ Development server running (`npm run dev`)
- ✅ Database operations fixed
- ✅ Error handling improved
- ✅ Logging added for debugging

### Test Environment
- **URL**: http://localhost:3000/weekly-planner
- **Requirements**: User must be logged in
- **Console**: Check for detailed logs

### Expected Console Output (Success)
```
Firebase initialized successfully
Loading initial data for user: [USER_ID]
No existing plan found, creating new one...
Week dates: { start: [DATE], end: [DATE] }
Creating plan with data: [PLAN_DATA]
Plan created with ID: [PLAN_ID]
Loading active goal...
No active goal found
Initial data loaded successfully
```

### Expected Console Output (Goal Creation)
```
Starting goal submission... { userId: [USER_ID], goalName: "Test Goal" }
Goal data prepared: [GOAL_DATA]
Creating new goal...
New goal created with ID: [GOAL_ID]
Calling onGoalUpdate with: [UPDATED_GOAL]
Success toast shown, closing modal
```

## 🛠️ If Issues Persist

### 1. Check Firebase Rules
Apply the rules from `FIRESTORE_RULES.txt` to Firebase Console

### 2. Clear Browser Data
- Clear localStorage
- Clear cookies
- Hard refresh (Cmd/Ctrl + Shift + R)

### 3. Check Environment Variables
Ensure all Firebase environment variables are set:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`  
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4. Restart Development Server
```bash
npm run dev
```

---

## 🎯 Next Steps After Fix Verification

1. Test goal creation
2. Test recipe generation  
3. Test meal planning
4. Test grocery list generation
5. Verify data persistence

The core functionality should now work properly with the applied fixes! 