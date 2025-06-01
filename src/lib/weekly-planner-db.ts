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
    const q = query(
      collection(db, "groceryLists"),
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
    throw error;
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