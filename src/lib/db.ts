// src/lib/db.ts
import { 
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    increment,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    deleteDoc
  } from "firebase/firestore";
  import { db } from "./firebase";
  
  // Types
  interface UserPreferences {
    ingredients: string[];
    equipment: string[];
    staples: string[];
    dietaryPrefs: string[];
    cuisinePrefs: string[];
    cookTimePreference?: string;
    difficultyPreference?: string;
    healthDataConsent?: boolean;
    lastHealthDataSync?: Timestamp;
    hasSeenOnboarding?: boolean;
  }
  
  interface Recipe {
    name: string;
    ingredients: string[];
    instructions: string[];
    nutritionalFacts: string;
    servings: string;
    times: string;
    savedAt?: Timestamp;
  }
  
  // Get user preferences
  export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.preferences as UserPreferences;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user preferences:", error);
      throw error;
    }
  };
  
  // Update user preferences
  export const updateUserPreferences = async (
    userId: string, 
    preferences: UserPreferences
  ): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      
      await updateDoc(userDocRef, {
        preferences: preferences
      });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  };
  
  // Increment the recipes generated count for usage tracking
  export const incrementRecipesGenerated = async (userId: string): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentMonth = new Date().getMonth();
        
        // If the month has changed, reset the counter
        if (userData.usageStats.month !== currentMonth) {
          await updateDoc(userDocRef, {
            "usageStats.month": currentMonth,
            "usageStats.recipesGenerated": 1
          });
        } else {
          // Otherwise increment the counter
          await updateDoc(userDocRef, {
            "usageStats.recipesGenerated": increment(1)
          });
        }
      }
    } catch (error) {
      console.error("Error incrementing recipes generated:", error);
      throw error;
    }
  };
  
  // Check if user has hit their free tier limit
  export const checkUserUsage = async (userId: string): Promise<boolean> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If user has a subscription, they have unlimited usage
        if (userData.subscription && userData.subscription.isActive) {
          return true;
        }
        
        // Check if the user has exceeded the free tier limit (5 recipes per month)
        const currentMonth = new Date().getMonth();
        
        if (userData.usageStats.month === currentMonth && 
            userData.usageStats.recipesGenerated >= 5) {
          return false;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking user usage:", error);
      throw error;
    }
  };
  
  // Save a recipe
  export const saveRecipe = async (userId: string, recipe: Recipe): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      
      // Add timestamp to recipe
      const recipeWithTimestamp = {
        ...recipe,
        savedAt: Timestamp.now()
      };
      
      // Add to savedRecipes array
      await updateDoc(userDocRef, {
        savedRecipes: arrayUnion(recipeWithTimestamp)
      });
    } catch (error) {
      console.error("Error saving recipe:", error);
      throw error;
    }
  };
  
  // Get saved recipes
  export const getSavedRecipes = async (userId: string): Promise<Recipe[]> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return (userData.savedRecipes || []) as Recipe[];
      }
      
      return [];
    } catch (error) {
      console.error("Error getting saved recipes:", error);
      throw error;
    }
  };
  
  // Delete a saved recipe
  export const deleteSavedRecipe = async (userId: string, recipeIndex: number): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedRecipes = [...(userData.savedRecipes || [])];
        
        if (recipeIndex >= 0 && recipeIndex < savedRecipes.length) {
          savedRecipes.splice(recipeIndex, 1);
          
          await updateDoc(userDocRef, {
            savedRecipes: savedRecipes
          });
        }
      }
    } catch (error) {
      console.error("Error deleting saved recipe:", error);
      throw error;
    }
  };
  
  // Subscribe user to premium tier
  export const subscribeUser = async (userId: string, subscriptionData: any): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      
      await updateDoc(userDocRef, {
        subscription: {
          isActive: true,
          tier: 'premium',
          stripeCustomerId: subscriptionData.customer,
          stripeSubscriptionId: subscriptionData.id,
          renewalDate: new Date(subscriptionData.current_period_end * 1000)
        }
      });
    } catch (error) {
      console.error("Error subscribing user:", error);
      throw error;
    }
  };
  
  // Cancel subscription
  export const cancelSubscription = async (userId: string): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", userId);
      
      await updateDoc(userDocRef, {
        "subscription.isActive": false
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  };