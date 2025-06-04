# Firestore Rules and Indexes Deployment Guide

## Critical Issues Fixed

This deployment fixes the following issues:
1. **Permission denied errors** for grocery lists
2. **Missing index errors** for favorites and grocery lists
3. **Automatic migration** from saved recipes to favorites

## Required Actions

### 1. Deploy Updated Firestore Security Rules

**Copy the rules from `FIRESTORE_RULES.txt` to Firebase Console:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `what-to-eat-45e6b`
3. Go to **Firestore Database** → **Rules** tab
4. Replace existing rules with content from `FIRESTORE_RULES.txt`
5. Click **Publish**

**Key additions:**
- `favoriteRecipes` collection rules
- `recipeHistory` collection rules
- Updated `groceryLists` rules with proper userId validation

### 2. Create Required Firestore Indexes

**Option A: Automatic Index Creation (Recommended)**
1. Run the app and trigger the queries
2. Click the index creation links in the console errors
3. Firebase will automatically create the required indexes

**Option B: Manual Index Creation**
Use the `firestore.indexes.json` file:

```bash
# If you have Firebase CLI installed
firebase deploy --only firestore:indexes
```

**Required Indexes:**
1. **groceryLists** composite index:
   - `userId` (Ascending)
   - `weeklyPlanId` (Ascending) 
   - `generatedAt` (Descending)

2. **favoriteRecipes** composite index:
   - `userId` (Ascending)
   - `addedAt` (Descending)

### 3. Verify Deployment

After deployment, check:
- [ ] No permission denied errors in console
- [ ] No missing index errors in console
- [ ] Grocery lists load correctly
- [ ] Favorites load correctly
- [ ] Automatic migration works for saved recipes

### 4. Testing

1. Open the meal planner
2. Try to generate a grocery list
3. Open recipe selector and check favorites tab
4. Verify console shows successful loading messages

## Expected Console Output (Success)

```
Loading grocery list for weekly plan: ojGdMAs5dIgxkixif7hG
Weekly plan user ID: ZS8FrAbQ60NxHh0FmSqnmrbtK7J2
Loaded grocery list: {...}
RecipeSelector opened, loading unified recipes...
Loaded saved recipes: 1
Loaded favorites: 0
Auto-migrating 1 saved recipes to favorites...
Successfully migrated "Recipe Name" to favorites
Migration completed: 1 recipes migrated successfully
```

## Rollback Plan

If issues occur, restore previous rules:
1. Remove the new collection rules (`favoriteRecipes`, `recipeHistory`)
2. Revert `groceryLists` query changes
3. The app will fall back to error handling

## Notes

- Migration is now **automatic** - no manual button needed
- Users with saved recipes will see them automatically moved to favorites
- All data is preserved during migration
- The system handles duplicates automatically 