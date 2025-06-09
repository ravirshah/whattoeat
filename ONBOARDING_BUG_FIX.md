# Onboarding Bug Fix - Shows Every Time on Refresh

## Bug Description
The onboarding flow was appearing on every page refresh instead of only for first-time users. This was happening because the `hasSeenOnboarding` flag wasn't being properly saved or checked.

## Root Cause Analysis

### 1. **Database Structure Issue**
- Initial user documents created during registration didn't include the `hasSeenOnboarding` field
- When trying to update preferences, the field didn't exist in the database

### 2. **Update Method Issue**
- `updateDoc()` was being used instead of `setDoc()` with merge
- `updateDoc()` fails when trying to add new fields to existing documents
- This caused the onboarding completion to fail silently

### 3. **Timing Issue**
- No proper error handling for failed preference updates
- User would complete onboarding but the state wouldn't be saved

## Fixes Applied

### 1. **Updated User Document Creation**
```typescript
// /src/lib/auth.ts - createUserDocument()
preferences: {
  ingredients: [],
  equipment: [],
  staples: [],
  dietaryPrefs: [],
  cuisinePrefs: [],
  hasSeenOnboarding: false  // ✅ Added this field
}
```

### 2. **Fixed Preference Update Method**
```typescript
// /src/lib/db.ts - updateUserPreferences()
// Changed from updateDoc() to setDoc() with merge
await setDoc(userDocRef, {
  preferences: preferences
}, { merge: true });
```

### 3. **Enhanced Error Handling**
- Added proper error handling and user feedback
- Added development-only debugging logs
- Better toast notifications for failures

### 4. **Added Debugging**
```typescript
// Development-only logging to track onboarding flow
if (process.env.NODE_ENV === 'development') {
  console.log('Onboarding check - hasSeenOnboarding:', hasSeenOnboarding);
}
```

## Testing Instructions

### Test 1: First-Time User Flow
1. Clear browser data or use incognito mode
2. Sign up for a new account
3. Navigate to weekly planner
4. ✅ Onboarding should appear automatically
5. Complete the 3-step onboarding
6. ✅ Should see "Welcome to WhatToEat!" success message
7. Refresh the page
8. ✅ Onboarding should NOT appear again

### Test 2: Existing User
1. Sign in with an existing account that has seen onboarding
2. Navigate to weekly planner
3. ✅ Onboarding should NOT appear
4. Click the "Tour" button in top-right
5. ✅ Onboarding should appear for testing purposes

### Test 3: Demo Mode
1. Use the "Demo Weekly Planner" button (test user)
2. ✅ Onboarding should NOT appear in demo mode
3. "Tour" button should still work for testing

### Test 4: Error Handling
1. Complete onboarding with network disconnected
2. ✅ Should show error toast: "Failed to save onboarding completion"
3. Reconnect and try again
4. ✅ Should work normally

## Files Modified

1. **`/src/lib/auth.ts`**
   - Added `hasSeenOnboarding: false` to initial user document

2. **`/src/lib/db.ts`**
   - Changed `updateDoc()` to `setDoc()` with merge in `updateUserPreferences()`

3. **`/src/app/weekly-planner/page.tsx`**
   - Added development-only debugging logs
   - Improved error handling

4. **`/src/components/weekly-planner/OnboardingFlow.tsx`**
   - Enhanced error handling and user feedback
   - Added development-only debugging
   - Better toast notifications

## Verification Commands

```bash
# Build should pass with no errors
npm run build

# Check TypeScript types
npx tsc --noEmit

# Start development server
npm run dev
```

## Database Impact

### Before Fix
```javascript
// User document structure
{
  preferences: {
    ingredients: [],
    equipment: [],
    // hasSeenOnboarding missing ❌
  }
}
```

### After Fix
```javascript
// User document structure
{
  preferences: {
    ingredients: [],
    equipment: [],
    hasSeenOnboarding: false  // ✅ Properly initialized
  }
}
```

## Future Improvements

1. **Migration Script**: For existing users who don't have the `hasSeenOnboarding` field
2. **Analytics**: Track onboarding completion rates
3. **A/B Testing**: Different onboarding flows for different user segments
4. **Progressive Enhancement**: Fallback if database operations fail

---

**Status**: ✅ **RESOLVED**  
**Build Status**: ✅ **PASSING**  
**Test Coverage**: ✅ **MANUAL TESTING COMPLETE** 