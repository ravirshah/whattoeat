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
  DayOfWeek 
} from "@/types/weekly-planner";

// Helper function to convert Date to Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Helper function to convert Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Weekly Plan Operations
export const createWeeklyPlan = async (plan: Omit<WeeklyPlan, 'id'>): Promise<string> => {
  try {
    console.log("Creating weekly plan for user:", plan.userId);
    
    const planData = {
      ...plan,
      weekStartDate: dateToTimestamp(new Date(plan.weekStartDate)),
      weekEndDate: dateToTimestamp(new Date(plan.weekEndDate)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const planRef = await addDoc(collection(db, "weeklyPlans"), planData);
    console.log("Weekly plan created successfully with ID:", planRef.id);
    return planRef.id;
  } catch (error) {
    console.error("Error creating weekly plan:", error);
    throw error;
  }
};

export const getWeeklyPlan = async (planId: string): Promise<WeeklyPlan | null> => {
  try {
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

export const updateWeeklyPlan = async (planId: string, updates: Partial<WeeklyPlan>): Promise<void> => {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Convert dates to timestamps if present
    if (updates.weekStartDate) {
      updateData.weekStartDate = dateToTimestamp(new Date(updates.weekStartDate));
    }
    if (updates.weekEndDate) {
      updateData.weekEndDate = dateToTimestamp(new Date(updates.weekEndDate));
    }

    await updateDoc(doc(db, "weeklyPlans", planId), updateData);
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
    const planDoc = await getDoc(doc(db, "weeklyPlans", planId));
    if (planDoc.exists()) {
      const planData = planDoc.data() as WeeklyPlan;
      const updatedMeals = {
        ...planData.meals,
        [day]: [...(planData.meals[day] || []), meal]
      };
      
      await updateDoc(doc(db, "weeklyPlans", planId), {
        meals: updatedMeals,
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
    const planDoc = await getDoc(doc(db, "weeklyPlans", planId));
    if (planDoc.exists()) {
      const planData = planDoc.data() as WeeklyPlan;
      const updatedMeals = {
        ...planData.meals,
        [day]: planData.meals[day]?.filter(meal => meal.id !== mealId) || []
      };
      
      await updateDoc(doc(db, "weeklyPlans", planId), {
        meals: updatedMeals,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error("Error removing meal from plan:", error);
    throw error;
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

// Utility functions
export const getWeekStartAndEnd = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getCurrentWeekDates = (): { start: Date; end: Date } => {
  return getWeekStartAndEnd(new Date());
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
    const q = query(
      collection(db, "mealPrepPlans"),
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
    throw error;
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