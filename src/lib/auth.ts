import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    type User,
    sendPasswordResetEmail,
    updateProfile,
    type UserCredential
  } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { setGlobalAuthUser } from './context/AuthContext';

// Register with email and password
export const registerWithEmail = async (email: string, password: string) => {
  console.log("[Auth] Starting registration with email:", email);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("[Auth] User registered successfully:", userCredential.user.uid);
    
    // Create user document in Firestore
    await createUserDocument(userCredential.user);
    
    // Force token refresh immediately after registration
    await userCredential.user.getIdToken(true);
    console.log("[Auth] Successfully refreshed user token for new registration");
    
    return userCredential.user;
  } catch (error) {
    console.error("[Auth] Error registering user:", error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  console.log("[Auth] Starting signin with email:", email);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("[Auth] User signed in successfully:", userCredential.user.uid);
    
    // Force token refresh immediately after sign-in
    await userCredential.user.getIdToken(true);
    console.log("[Auth] Successfully refreshed user token for email sign-in");
    
    return userCredential.user;
  } catch (error) {
    console.error("[Auth] Error signing in with email:", error);
    throw error;
  }
};

// Sign in with Google
export async function signInWithGoogle() {
  try {
    console.log("[Auth] Starting Google sign-in process");
    
    // Create Google auth provider
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Force select account prompt every time
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // SIMPLE APPROACH: Just do the popup sign-in and let Firebase handle auth state
    const result = await signInWithPopup(auth, provider);
    console.log("[Auth] Google sign-in successful, userId:", result.user.uid);
    
    // Force token refresh immediately after sign-in to ensure token is fresh
    await result.user.getIdToken(true);
    console.log("[Auth] Successfully refreshed user token");
    
    // Create user document if it doesn't exist
    try {
      await createUserDocument(result.user);
    } catch (error) {
      console.error("[Auth] CRITICAL: Error creating/updating user document:", error);
      // Temporarily re-throw the error to prevent continuation
      throw new Error("Failed to initialize user profile in database."); 
    }
    
    // Update global auth state
    setGlobalAuthUser(result.user);
    
    // Wait a bit to ensure auth state propagates
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("[Auth] Sign-in popup was closed by the user");
      } else if (error.code === 'auth/popup-blocked') {
        console.error("[Auth] Sign-in popup was blocked by the browser");
        alert("Please allow popups for this site to sign in with Google");
      } else {
        console.error("[Auth] Firebase error during Google sign-in:", error.code, error.message);
        alert(`Sign-in error: ${error.message}`);
      }
    } else {
      console.error("[Auth] Unexpected error during Google sign-in:", error);
      alert("An unexpected error occurred. Please try again later.");
    }
    return false;
  }
}

// Sign out
export const signOut = async () => {
  try {
    console.log("[Auth] Signing out user");
    await firebaseSignOut(auth);
    
    // Clear any local storage data
    try {
      localStorage.removeItem('whattoeat_user');
      console.log("[Auth] Cleared user data from localStorage");
    } catch (e) {
      console.error("[Auth] Error clearing localStorage:", e);
    }

    return true;
  } catch (error) {
    console.error("[Auth] Error signing out:", error);
    return false;
  }
};

// Create user document in Firestore
const createUserDocument = async (user: User) => {
  console.log("Creating user document for:", user.uid);
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    
    await setDoc(userDocRef, {
      email: user.email,
      preferences: {
        ingredients: [],
        equipment: [],
        staples: [],
        dietaryPrefs: []
      },
      usageStats: {
        month: new Date().getMonth(),
        recipesGenerated: 0
      },
      savedRecipes: []
    });
    
    console.log("User document created successfully");
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};