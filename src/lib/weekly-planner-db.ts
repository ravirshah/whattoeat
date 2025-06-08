import { 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  addDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  WeeklyPlan, 
  UserGoal, 
  GroceryList, 
  GroceryItem,
  RecipeHistory,
  FavoriteRecipe,
  NutritionEntry,
  StoreLayout,
  MealPrepPlan,
  MealPlanSettings, 
  PlannedMeal,
  DayOfWeek,
  HealthDocument
} from "@/types/weekly-planner";

// Helper function to convert Date to Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Helper function to convert Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Enhanced helper function to clean undefined values recursively
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined && item !== null)
      .map(cleanUndefinedValues);
  }
  
  if (obj instanceof Date || obj instanceof Timestamp) {
    return obj;
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanUndefinedValues(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

// Helper function to get week start and end dates (Monday to Sunday)
const getWeekStartAndEnd = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

// Helper function to get current week dates
const getCurrentWeekDates = () => {
  return getWeekStartAndEnd(new Date());
};

// Enhanced weekly plan operations with better error handling
export const createWeeklyPlan = async (plan: Omit<WeeklyPlan, 'id'>): Promise<string> => {
  try {
    console.log("Creating weekly plan for user:", plan.userId);
    
    if (!plan.userId) {
      throw new Error("User ID is required to create a weekly plan");
    }
    
    const cleanedPlan = cleanUndefinedValues({
      ...plan,
      weekStartDate: dateToTimestamp(new Date(plan.weekStartDate)),
      weekEndDate: dateToTimestamp(new Date(plan.weekEndDate)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const planRef = await addDoc(collection(db, "weeklyPlans"), cleanedPlan);
    console.log("Weekly plan created successfully with ID:", planRef.id);
    return planRef.id;
  } catch (error) {
    console.error("Error creating weekly plan:", error);
    throw error;
  }
};

export const getWeeklyPlan = async (planId: string): Promise<WeeklyPlan | null> => {
  try {
    if (!planId) {
      console.warn("No plan ID provided to getWeeklyPlan");
      return null;
    }
    
    const planDoc = await getDoc(doc(db, "weeklyPlans", planId));
    if (planDoc.exists()) {
      const data = planDoc.data();
      return {
        id: planDoc.id,
        ...data,
        weekStartDate: timestampToDate(data.weekStartDate),
        weekEndDate: timestampToDate(data.weekEndDate)
      } as WeeklyPlan;
    }
    return null;
  } catch (error) {
    console.error("Error getting weekly plan:", error);
    throw error;
  }
};

export const getUserWeeklyPlans = async (userId: string): Promise<WeeklyPlan[]> => {
  try {
    if (!userId) {
      console.warn("No user ID provided to getUserWeeklyPlans");
      return [];
    }
    
    const q = query(
      collection(db, "weeklyPlans"),
      where("userId", "==", userId),
      orderBy("weekStartDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        weekStartDate: timestampToDate(data.weekStartDate),
        weekEndDate: timestampToDate(data.weekEndDate)
      };
    }) as WeeklyPlan[];
  } catch (error) {
    console.error("Error getting user weekly plans:", error);
    throw error;
  }
};

export const getCurrentWeeklyPlan = async (userId: string): Promise<WeeklyPlan | null> => {
  try {
    if (!userId) {
      console.warn("No user ID provided to getCurrentWeeklyPlan");
      return null;
    }
    
    console.log("Getting current weekly plan for user:", userId);
    
    const q = query(
      collection(db, "weeklyPlans"),
      where("userId", "==", userId),
      where("isActive", "==", true),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log("Found existing weekly plan:", doc.id);
      
      return {
        id: doc.id,
        ...data,
        weekStartDate: timestampToDate(data.weekStartDate),
        weekEndDate: timestampToDate(data.weekEndDate)
      } as WeeklyPlan;
    }
    
    console.log("No active weekly plan found for user");
    return null;
  } catch (error) {
    console.error("Error getting current weekly plan:", error);
    throw error;
  }
};

export const getWeeklyPlanByDateRange = async (userId: string, weekStartDate: Date): Promise<WeeklyPlan | null> => {
  try {
    if (!userId || !weekStartDate) {
      console.warn("Missing required parameters for getWeeklyPlanByDateRange");
      return null;
    }
    
    console.log("Getting weekly plan for user:", userId, "week starting:", weekStartDate);
    
    // Calculate week end date
    const { start, end } = getWeekStartAndEnd(weekStartDate);
    
    // Query for plans that match this exact week
    const q = query(
      collection(db, "weeklyPlans"),
      where("userId", "==", userId),
      where("weekStartDate", "==", dateToTimestamp(start)),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log("Found existing weekly plan for week:", doc.id, start.toLocaleDateString());
      
      return {
        id: doc.id,
        ...data,
        weekStartDate: timestampToDate(data.weekStartDate),
        weekEndDate: timestampToDate(data.weekEndDate)
      } as WeeklyPlan;
    }
    
    console.log("No weekly plan found for week starting:", start.toLocaleDateString());
    return null;
  } catch (error) {
    console.error("Error getting weekly plan by date range:", error);
    throw error;
  }
};

export const updateWeeklyPlan = async (planId: string, updates: Partial<WeeklyPlan>): Promise<void> => {
  try {
    if (!planId) {
      throw new Error("Plan ID is required to update weekly plan");
    }
    
    console.log("Updating weekly plan:", planId, "with updates:", Object.keys(updates));
    
    // Clean the updates to remove undefined values
    const cleanedUpdates = cleanUndefinedValues(updates);
    
    const updateData: any = {
      ...cleanedUpdates,
      updatedAt: Timestamp.now()
    };

    // Convert dates to timestamps if present
    if (updates.weekStartDate) {
      updateData.weekStartDate = dateToTimestamp(new Date(updates.weekStartDate));
    }
    if (updates.weekEndDate) {
      updateData.weekEndDate = dateToTimestamp(new Date(updates.weekEndDate));
    }

    // Remove any remaining undefined values
    const finalUpdateData = cleanUndefinedValues(updateData);
    
    if (Object.keys(finalUpdateData).length === 0) {
      console.warn("No valid data to update for plan:", planId);
      return;
    }

    await updateDoc(doc(db, "weeklyPlans", planId), finalUpdateData);
    console.log("Weekly plan updated successfully:", planId);
  } catch (error) {
    console.error("Error updating weekly plan:", error);
    throw error;
  }
};

export const addMealToPlan = async (
  planId: string, 
  day: DayOfWeek, 
  meal: PlannedMeal
): Promise<void> => {
  try {
    if (!planId || !day || !meal) {
      throw new Error("Plan ID, day, and meal are required to add meal to plan");
    }
    
    const planDoc = await getDoc(doc(db, "weeklyPlans", planId));
    if (planDoc.exists()) {
      const planData = planDoc.data() as WeeklyPlan;
      const cleanedMeal = cleanUndefinedValues(meal);
      const updatedMeals = {
        ...planData.meals,
        [day]: [...(planData.meals[day] || []), cleanedMeal]
      };
      
      await updateDoc(doc(db, "weeklyPlans", planId), {
        meals: cleanUndefinedValues(updatedMeals),
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error("Error adding meal to plan:", error);
    throw error;
  }
};

export const removeMealFromPlan = async (
  planId: string, 
  day: DayOfWeek, 
  mealId: string
): Promise<void> => {
  try {
    if (!planId || !day || !mealId) {
      throw new Error("Plan ID, day, and meal ID are required to remove meal from plan");
    }
    
    const planDoc = await getDoc(doc(db, "weeklyPlans", planId));
    if (planDoc.exists()) {
      const planData = planDoc.data() as WeeklyPlan;
      const updatedMeals = {
        ...planData.meals,
        [day]: planData.meals[day]?.filter(meal => meal.id !== mealId) || []
      };
      
      await updateDoc(doc(db, "weeklyPlans", planId), {
        meals: cleanUndefinedValues(updatedMeals),
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error("Error removing meal from plan:", error);
    throw error;
  }
};

// Utility functions
export { getWeekStartAndEnd, getCurrentWeekDates };

// Helper function to convert any date value (Date, Timestamp, string, number) to Date
export const convertToDate = (dateValue: any): Date => {
  if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
    // It's a Firestore Timestamp
    return dateValue.toDate();
  } else if (dateValue instanceof Date) {
    // It's already a Date object
    return dateValue;
  } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    // It's a string or number that can be converted to a Date
    return new Date(dateValue);
  } else {
    // Fallback to current date if date is invalid
    console.warn('Invalid date value passed to convertToDate:', dateValue);
    return new Date();
  }
};

// User Goals Operations
export const createUserGoal = async (goal: Omit<UserGoal, 'id'>): Promise<string> => {
  try {
    console.log("Creating user goal:", goal.name, "for user:", goal.userId);
    
    const goalData = {
      ...goal,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const goalRef = await addDoc(collection(db, "userGoals"), goalData);
    console.log("User goal created successfully with ID:", goalRef.id);
    return goalRef.id;
  } catch (error) {
    console.error("Error creating user goal:", error);
    throw error;
  }
};

export const getUserGoals = async (userId: string): Promise<UserGoal[]> => {
  try {
    const q = query(
      collection(db, "userGoals"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserGoal[];
  } catch (error) {
    console.error("Error getting user goals:", error);
    throw error;
  }
};

export const getActiveUserGoal = async (userId: string): Promise<UserGoal | null> => {
  try {
    console.log("Getting active goal for user:", userId);
    
    const q = query(
      collection(db, "userGoals"),
      where("userId", "==", userId),
      where("isActive", "==", true),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log("Found active goal:", doc.id);
      return { id: doc.id, ...doc.data() } as UserGoal;
    }
    
    console.log("No active goal found for user");
    return null;
  } catch (error) {
    console.error("Error getting active user goal:", error);
    throw error;
  }
};

export const updateUserGoal = async (goalId: string, updates: Partial<UserGoal>): Promise<void> => {
  try {
    console.log("Updating user goal:", goalId);
    
    await updateDoc(doc(db, "userGoals", goalId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    console.log("User goal updated successfully");
  } catch (error) {
    console.error("Error updating user goal:", error);
    throw error;
  }
};

// Grocery List Operations
export const createGroceryList = async (groceryList: Omit<GroceryList, 'id'>): Promise<string> => {
  try {
    const listRef = await addDoc(collection(db, "groceryLists"), {
      ...groceryList,
      generatedAt: Timestamp.now()
    });
    return listRef.id;
  } catch (error) {
    console.error("Error creating grocery list:", error);
    throw error;
  }
};

export const getGroceryList = async (weeklyPlanId: string): Promise<GroceryList | null> => {
  try {
    // Get the weekly plan first to get the userId
    const weeklyPlanDoc = await getDoc(doc(db, "weeklyPlans", weeklyPlanId));
    if (!weeklyPlanDoc.exists()) {
      console.warn("Weekly plan not found:", weeklyPlanId);
      return null;
    }
    
    const weeklyPlan = weeklyPlanDoc.data();
    const userId = weeklyPlan.userId;
    
    if (!userId) {
      console.warn("No userId found in weekly plan:", weeklyPlanId);
      return null;
    }
    
    const q = query(
      collection(db, "groceryLists"),
      where("userId", "==", userId),
      where("weeklyPlanId", "==", weeklyPlanId),
      orderBy("generatedAt", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as GroceryList;
    }
    return null;
  } catch (error) {
    console.error("Error getting grocery list:", error);
    return null; // Return null instead of throwing to avoid blocking
  }
};

export const updateGroceryList = async (listId: string, updates: Partial<GroceryList>): Promise<void> => {
  try {
    await updateDoc(doc(db, "groceryLists", listId), updates);
  } catch (error) {
    console.error("Error updating grocery list:", error);
    throw error;
  }
};

// Meal Plan Settings Operations
export const getMealPlanSettings = async (userId: string): Promise<MealPlanSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(db, "mealPlanSettings", userId));
    if (settingsDoc.exists()) {
      return settingsDoc.data() as MealPlanSettings;
    }
    return null;
  } catch (error) {
    console.error("Error getting meal plan settings:", error);
    throw error;
  }
};

export const updateMealPlanSettings = async (settings: MealPlanSettings): Promise<void> => {
  try {
    await setDoc(doc(db, "mealPlanSettings", settings.userId), settings);
  } catch (error) {
    console.error("Error updating meal plan settings:", error);
    throw error;
  }
};

// =======================
// RECIPE HISTORY OPERATIONS
// =======================

export const addRecipeToHistory = async (history: Omit<RecipeHistory, 'id'>): Promise<string> => {
  try {
    const historyData = {
      ...history,
      cookedAt: Timestamp.now()
    };
    const historyRef = await addDoc(collection(db, "recipeHistory"), historyData);
    return historyRef.id;
  } catch (error) {
    console.error("Error adding recipe to history:", error);
    throw error;
  }
};

export const getUserRecipeHistory = async (userId: string, limitCount = 50): Promise<RecipeHistory[]> => {
  try {
    const q = query(
      collection(db, "recipeHistory"),
      where("userId", "==", userId),
      orderBy("cookedAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RecipeHistory[];
  } catch (error) {
    console.error("Error getting recipe history:", error);
    throw error;
  }
};

export const updateRecipeInHistory = async (historyId: string, updates: Partial<RecipeHistory>): Promise<void> => {
  try {
    await updateDoc(doc(db, "recipeHistory", historyId), updates);
  } catch (error) {
    console.error("Error updating recipe history:", error);
    throw error;
  }
};

// =======================
// FAVORITE RECIPES OPERATIONS
// =======================

export const addToFavorites = async (favorite: Omit<FavoriteRecipe, 'id'>): Promise<string> => {
  try {
    const favoriteData = {
      ...favorite,
      addedAt: Timestamp.now(),
      timesCooked: favorite.timesCooked || 0
    };
    const favoriteRef = await addDoc(collection(db, "favoriteRecipes"), favoriteData);
    return favoriteRef.id;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

export const getUserFavorites = async (userId: string): Promise<FavoriteRecipe[]> => {
  try {
    // Simplified query without orderBy to avoid index requirement
    const q = query(
      collection(db, "favoriteRecipes"),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const favorites = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FavoriteRecipe[];
    
    // Sort by addedAt in client to avoid index requirement
    return favorites.sort((a, b) => {
      const getTimestamp = (timestamp: any): number => {
        if (timestamp?.toDate) return timestamp.toDate().getTime();
        if (timestamp instanceof Date) return timestamp.getTime();
        if (timestamp?.seconds) return timestamp.seconds * 1000;
        return new Date(timestamp).getTime();
      };
      
      const aTime = getTimestamp(a.addedAt);
      const bTime = getTimestamp(b.addedAt);
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error getting favorites:", error);
    // Return empty array instead of throwing to prevent blocking
    return [];
  }
};

export const removeFromFavorites = async (favoriteId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "favoriteRecipes", favoriteId));
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
};

export const updateFavoriteRecipe = async (favoriteId: string, updates: Partial<FavoriteRecipe>): Promise<void> => {
  try {
    await updateDoc(doc(db, "favoriteRecipes", favoriteId), updates);
  } catch (error) {
    console.error("Error updating favorite recipe:", error);
    throw error;
  }
};

export const isFavoriteRecipe = async (userId: string, recipeName: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, "favoriteRecipes"),
      where("userId", "==", userId),
      where("recipeName", "==", recipeName),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking if recipe is favorite:", error);
    return false;
  }
};

// =======================
// NUTRITION TRACKING OPERATIONS
// =======================

export const saveNutritionEntry = async (entry: Omit<NutritionEntry, 'id'>): Promise<string> => {
  try {
    const entryData = {
      ...entry,
      date: dateToTimestamp(new Date(entry.date))
    };
    const entryRef = await addDoc(collection(db, "nutritionEntries"), entryData);
    return entryRef.id;
  } catch (error) {
    console.error("Error saving nutrition entry:", error);
    throw error;
  }
};

export const getNutritionEntry = async (userId: string, date: Date): Promise<NutritionEntry | null> => {
  try {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "nutritionEntries"),
      where("userId", "==", userId),
      where("date", ">=", dateToTimestamp(dateStart)),
      where("date", "<=", dateToTimestamp(dateEnd)),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: timestampToDate(data.date)
      } as NutritionEntry;
    }
    return null;
  } catch (error) {
    console.error("Error getting nutrition entry:", error);
    throw error;
  }
};

export const getUserNutritionHistory = async (
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<NutritionEntry[]> => {
  try {
    const q = query(
      collection(db, "nutritionEntries"),
      where("userId", "==", userId),
      where("date", ">=", dateToTimestamp(startDate)),
      where("date", "<=", dateToTimestamp(endDate)),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: timestampToDate(data.date)
      };
    }) as NutritionEntry[];
  } catch (error) {
    console.error("Error getting nutrition history:", error);
    throw error;
  }
};

export const updateNutritionEntry = async (entryId: string, updates: Partial<NutritionEntry>): Promise<void> => {
  try {
    const updateData: any = { ...updates };
    if (updates.date) {
      updateData.date = dateToTimestamp(new Date(updates.date));
    }
    await updateDoc(doc(db, "nutritionEntries", entryId), updateData);
  } catch (error) {
    console.error("Error updating nutrition entry:", error);
    throw error;
  }
};

// =======================
// STORE LAYOUT OPERATIONS
// =======================

export const saveStoreLayout = async (layout: Omit<StoreLayout, 'id'>): Promise<string> => {
  try {
    const layoutData = {
      ...layout,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const layoutRef = await addDoc(collection(db, "storeLayouts"), layoutData);
    return layoutRef.id;
  } catch (error) {
    console.error("Error saving store layout:", error);
    throw error;
  }
};

export const getUserStoreLayouts = async (userId: string): Promise<StoreLayout[]> => {
  try {
    const q = query(
      collection(db, "storeLayouts"),
      where("userId", "==", userId),
      orderBy("isDefault", "desc"),
      orderBy("storeName", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StoreLayout[];
  } catch (error) {
    console.error("Error getting store layouts:", error);
    throw error;
  }
};

export const getDefaultStoreLayout = async (userId: string): Promise<StoreLayout | null> => {
  try {
    const q = query(
      collection(db, "storeLayouts"),
      where("userId", "==", userId),
      where("isDefault", "==", true),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as StoreLayout;
    }
    return null;
  } catch (error) {
    console.error("Error getting default store layout:", error);
    throw error;
  }
};

export const updateStoreLayout = async (layoutId: string, updates: Partial<StoreLayout>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    await updateDoc(doc(db, "storeLayouts", layoutId), updateData);
  } catch (error) {
    console.error("Error updating store layout:", error);
    throw error;
  }
};

// =======================
// MEAL PREP PLANNING OPERATIONS
// =======================

export const saveMealPrepPlan = async (plan: Omit<MealPrepPlan, 'id'>): Promise<string> => {
  try {
    const planData = {
      ...plan,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const planRef = await addDoc(collection(db, "mealPrepPlans"), planData);
    return planRef.id;
  } catch (error) {
    console.error("Error saving meal prep plan:", error);
    throw error;
  }
};

export const getMealPrepPlan = async (weeklyPlanId: string): Promise<MealPrepPlan | null> => {
  try {
    if (!weeklyPlanId) {
      console.warn("No weekly plan ID provided to getMealPrepPlan");
      return null;
    }
    
    // First, get the weekly plan to ensure we have the userId for security
    const weeklyPlanDoc = await getDoc(doc(db, "weeklyPlans", weeklyPlanId));
    if (!weeklyPlanDoc.exists()) {
      console.warn("Weekly plan not found:", weeklyPlanId);
      return null;
    }
    
    const weeklyPlan = weeklyPlanDoc.data();
    const userId = weeklyPlan.userId;
    
    if (!userId) {
      console.warn("No userId found in weekly plan:", weeklyPlanId);
      return null;
    }
    
    // Query meal prep plans with both userId and weeklyPlanId for better security
    const q = query(
      collection(db, "mealPrepPlans"),
      where("userId", "==", userId),
      where("weeklyPlanId", "==", weeklyPlanId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as MealPrepPlan;
    }
    return null;
  } catch (error) {
    console.error("Error getting meal prep plan:", error);
    // Return null instead of throwing to avoid blocking the UI
    return null;
  }
};

export const updateMealPrepPlan = async (planId: string, updates: Partial<MealPrepPlan>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    await updateDoc(doc(db, "mealPrepPlans", planId), updateData);
  } catch (error) {
    console.error("Error updating meal prep plan:", error);
    throw error;
  }
};

// =======================
// HEALTH DOCUMENTS OPERATIONS
// =======================

export const addHealthDocument = async (healthDoc: Omit<HealthDocument, 'id'>): Promise<string> => {
  try {
    console.log("Adding health document:", healthDoc.fileName, "for user:", healthDoc.userId);
    
    // Enhanced data cleaning for health documents
    const cleanedParsedData = cleanUndefinedValues({
      cholesterolTotal: healthDoc.parsedData?.cholesterolTotal || null,
      cholesterolLDL: healthDoc.parsedData?.cholesterolLDL || null,
      cholesterolHDL: healthDoc.parsedData?.cholesterolHDL || null,
      triglycerides: healthDoc.parsedData?.triglycerides || null,
      glucose: healthDoc.parsedData?.glucose || null,
      hemoglobinA1c: healthDoc.parsedData?.hemoglobinA1c || null,
      vitaminD: healthDoc.parsedData?.vitaminD || null,
      vitaminB12: healthDoc.parsedData?.vitaminB12 || null,
      iron: healthDoc.parsedData?.iron || null,
      ferritin: healthDoc.parsedData?.ferritin || null,
      tsh: healthDoc.parsedData?.tsh || null,
      creatinine: healthDoc.parsedData?.creatinine || null,
      bodyFatPercentage: healthDoc.parsedData?.bodyFatPercentage || null,
      muscleMass: healthDoc.parsedData?.muscleMass || null,
      bodyWeight: healthDoc.parsedData?.bodyWeight || null,
      BMI: healthDoc.parsedData?.BMI || null,
      visceralFat: healthDoc.parsedData?.visceralFat || null,
      basalMetabolicRate: healthDoc.parsedData?.basalMetabolicRate || null,
      bloodPressureSystolic: healthDoc.parsedData?.bloodPressureSystolic || null,
      bloodPressureDiastolic: healthDoc.parsedData?.bloodPressureDiastolic || null,
      restingHeartRate: healthDoc.parsedData?.restingHeartRate || null,
      dietaryRecommendations: Array.isArray(healthDoc.parsedData?.dietaryRecommendations) 
        ? healthDoc.parsedData.dietaryRecommendations.filter(Boolean) 
        : [],
      healthConcerns: Array.isArray(healthDoc.parsedData?.healthConcerns) 
        ? healthDoc.parsedData.healthConcerns.filter(Boolean) 
        : [],
      rawExtractedText: healthDoc.parsedData?.rawExtractedText || "No data extracted",
      abnormalValues: Array.isArray(healthDoc.parsedData?.abnormalValues) 
        ? healthDoc.parsedData.abnormalValues.filter(Boolean) 
        : [],
      ...healthDoc.parsedData
    });

    const healthDocData = cleanUndefinedValues({
      userId: healthDoc.userId,
      fileName: healthDoc.fileName,
      fileType: healthDoc.fileType,
      uploadedAt: Timestamp.now(),
      parsedData: cleanedParsedData,
      aiSummary: healthDoc.aiSummary || "Health document processed successfully",
      isActive: true
    });

    console.log("Saving health document with cleaned data:", {
      fileName: healthDocData.fileName,
      userId: healthDocData.userId,
      parsedDataKeys: Object.keys(healthDocData.parsedData),
      hasAiSummary: !!healthDocData.aiSummary
    });

    const docRef = await addDoc(collection(db, "healthDocuments"), healthDocData);
    console.log("Health document added successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding health document:", error);
    console.error("Health document data that failed:", {
      fileName: healthDoc.fileName,
      userId: healthDoc.userId,
      parsedDataType: typeof healthDoc.parsedData,
      aiSummaryType: typeof healthDoc.aiSummary
    });
    throw error;
  }
};

export const getUserHealthDocuments = async (userId: string): Promise<HealthDocument[]> => {
  try {
    console.log("Getting health documents for user:", userId);
    
    const q = query(
      collection(db, "healthDocuments"),
      where("userId", "==", userId),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const healthDocs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HealthDocument[];
    
    console.log(`Found ${healthDocs.length} health documents for user`);
    return healthDocs;
  } catch (error) {
    console.error("Error getting health documents:", error);
    // Return empty array instead of throwing to prevent blocking
    return [];
  }
};

export const updateHealthDocument = async (docId: string, updates: Partial<HealthDocument>): Promise<void> => {
  try {
    console.log("Updating health document:", docId);
    
    await updateDoc(doc(db, "healthDocuments", docId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    console.log("Health document updated successfully");
  } catch (error) {
    console.error("Error updating health document:", error);
    throw error;
  }
};

export const deleteHealthDocument = async (docId: string): Promise<void> => {
  try {
    console.log("Deleting health document:", docId);
    
    await deleteDoc(doc(db, "healthDocuments", docId));
    
    console.log("Health document deleted successfully");
  } catch (error) {
    console.error("Error deleting health document:", error);
    throw error;
  }
};

export const getActiveHealthDocuments = async (userId: string): Promise<HealthDocument[]> => {
  try {
    console.log("Getting active health documents for user:", userId);
    
    const q = query(
      collection(db, "healthDocuments"),
      where("userId", "==", userId),
      where("isActive", "==", true),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    const activeDocs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HealthDocument[];
    
    console.log(`Found ${activeDocs.length} active health documents for user`);
    return activeDocs;
  } catch (error) {
    console.error("Error getting active health documents:", error);
    return [];
  }
};

// =======================
// ENHANCED GOAL OPERATIONS (with health integration)
// =======================

export const createUserGoalWithHealth = async (goal: Omit<UserGoal, 'id'>, healthDocIds?: string[]): Promise<string> => {
  try {
    console.log("Creating user goal with health integration:", goal.name, "for user:", goal.userId);
    
    let healthBasedAdjustments: UserGoal['healthBasedAdjustments'] = undefined;
    
    // If health documents are provided, generate health-based adjustments
    if (healthDocIds && healthDocIds.length > 0) {
      console.log("Processing health documents for goal creation");
      
      // Get health documents
      const healthDocs = await Promise.all(
        healthDocIds.map(id => getDoc(doc(db, "healthDocuments", id)))
      );
      
      const validHealthDocs = healthDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() } as HealthDocument));
      
      // Generate health-based adjustments
      healthBasedAdjustments = generateHealthBasedAdjustments(validHealthDocs);
    }
    
    const goalData = {
      ...goal,
      healthDocumentIds: healthDocIds || [],
      healthBasedAdjustments,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const goalRef = await addDoc(collection(db, "userGoals"), goalData);
    console.log("User goal with health integration created successfully with ID:", goalRef.id);
    return goalRef.id;
  } catch (error) {
    console.error("Error creating user goal with health integration:", error);
    throw error;
  }
};

// Helper function to generate health-based adjustments
const generateHealthBasedAdjustments = (healthDocs: HealthDocument[]): UserGoal['healthBasedAdjustments'] => {
  const adjustments: UserGoal['healthBasedAdjustments'] = {
    avoidIngredients: [],
    recommendIngredients: [],
    macroModifications: [],
    supplementSuggestions: []
  };
  
  healthDocs.forEach(doc => {
    const data = doc.parsedData;
    
    // High cholesterol adjustments
    if (data.cholesterolTotal && data.cholesterolTotal > 200) {
      adjustments.avoidIngredients?.push('high-saturated fat foods', 'processed meats');
      adjustments.recommendIngredients?.push('oats', 'beans', 'fatty fish');
      adjustments.macroModifications?.push('Reduce saturated fats, increase fiber');
    }
    
    // High blood pressure adjustments
    if (data.bloodPressureSystolic && data.bloodPressureSystolic > 140) {
      adjustments.avoidIngredients?.push('high-sodium foods', 'processed foods');
      adjustments.recommendIngredients?.push('potassium-rich foods', 'leafy greens');
      adjustments.macroModifications?.push('Limit sodium intake');
    }
    
    // Vitamin D deficiency
    if (data.vitaminD && data.vitaminD < 30) {
      adjustments.recommendIngredients?.push('fatty fish', 'fortified dairy');
      adjustments.supplementSuggestions?.push('Vitamin D3 supplement');
    }
    
    // High glucose/diabetes indicators
    if (data.glucose && data.glucose > 126) {
      adjustments.avoidIngredients?.push('refined sugars', 'white bread');
      adjustments.recommendIngredients?.push('whole grains', 'lean proteins');
      adjustments.macroModifications?.push('Focus on complex carbohydrates, balance protein');
    }
    
    // Include dietary recommendations from documents
    if (data.dietaryRecommendations) {
      adjustments.macroModifications?.push(...data.dietaryRecommendations);
    }
  });
  
  return adjustments;
}; 