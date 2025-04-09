import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    type User,
    // Removed unused imports: sendPasswordResetEmail, updateProfile, UserCredential
  } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Register with email and password
export const registerWithEmail = async (email: string, password: string) => {
  console.log("[Auth:registerWithEmail] Starting registration with email:", email);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`[Auth:registerWithEmail] User registered in Firebase: ${user.uid}`);
    
    // Attempt to create user document
    try {
        await createUserDocument(user, false); // Use false for merge on initial registration
        console.log(`[Auth:registerWithEmail] Firestore document created for ${user.uid}`);
    } catch (dbError) {
        console.error(`[Auth:registerWithEmail] CRITICAL: Firestore document creation failed for ${user.uid}:`, dbError);
        // Decide if sign-up should fail if DB entry fails. Currently, it proceeds.
        // throw new Error("Failed to initialize user profile."); // Option to fail registration
    }
    return user;
  } catch (error) {
    console.error("[Auth:registerWithEmail] Error registering user:", error);
    throw error; // Re-throw for the calling UI component to handle
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  console.log("[Auth:signInWithEmail] Starting signin with email:", email);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`[Auth:signInWithEmail] User signed in successfully: ${user.uid}`);
    // Optional: Ensure user document exists on sign-in (useful if created elsewhere or missed)
    // try {
    //    await createUserDocument(user, true); 
    // } catch (dbError) {
    //    console.warn(`[Auth:signInWithEmail] Failed to ensure/update Firestore doc for ${user.uid}:`, dbError);
    // }
    return user;
  } catch (error) {
    console.error("[Auth:signInWithEmail] Error signing in with email:", error);
    throw error; // Re-throw for the calling UI component to handle
  }
};

// Sign in with Google
export async function signInWithGoogle(): Promise<boolean> {
  console.log("[Auth:signInWithGoogle] Starting Google sign-in process");
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    console.log("[Auth:signInWithGoogle] Initiating signInWithPopup...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log(`[Auth:signInWithGoogle] Firebase auth successful via popup, userId: ${user.uid}`);

    // Attempt to ensure the user document exists or is created/merged
    try {
        await createUserDocument(user, true); // Use true to merge data if doc exists
        console.log(`[Auth:signInWithGoogle] Firestore document ensured/merged for ${user.uid}`);
    } catch (dbError) {
        console.error(`[Auth:signInWithGoogle] CRITICAL: Firestore document operation failed for ${user.uid} after successful Google Sign-In:`, dbError);
        // Even though Firebase auth succeeded, the app might not function correctly without the DB entry.
        // Consider this a failure for the sign-in flow from the app's perspective.
        // alert("Sign-in succeeded but failed to initialize profile. Please try again."); // Optional user alert
        // return false; // Treat DB failure as sign-in failure for the app
    }
    
    // If we reach here, both Firebase auth and (attempted) DB operations are done.
    // The AuthContext listener should pick up the Firebase auth state change.
    console.log(`[Auth:signInWithGoogle] Google Sign-In process complete for ${user.uid}. Returning true.`);
    return true; // Indicate success to the caller

  } catch (error: unknown) {
    // Handle errors specifically from signInWithPopup
    if (error instanceof FirebaseError) {
        console.warn(`[Auth:signInWithGoogle] Firebase error during signInWithPopup: ${error.code}`, error.message);
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("[Auth:signInWithGoogle] Sign-in popup was closed by the user.");
            // No alert needed, just return false
        } else if (error.code === 'auth/popup-blocked') {
            console.error("[Auth:signInWithGoogle] Sign-in popup was blocked by the browser.");
            alert("Google Sign-In popup blocked. Please allow popups for this site.");
        } else {
            // Other Firebase errors (network, account issues, etc.)
            console.error("[Auth:signInWithGoogle] Unhandled Firebase error during Google sign-in:", error.code, error.message);
            alert(`Sign-in failed: ${error.message} (${error.code})`);
        }
    } else {
        // Non-Firebase errors (less likely here, but possible)
        console.error("[Auth:signInWithGoogle] Unexpected non-Firebase error during Google sign-in:", error);
        alert("An unexpected error occurred during Google Sign-In. Please check console logs.");
    }
    console.log("[Auth:signInWithGoogle] Google Sign-In process failed. Returning false.");
    return false; // Indicate failure
  }
}

// Sign out
export const signOut = async (): Promise<boolean> => {
  console.log("[Auth:signOut] Signing out user");
  try {
    await firebaseSignOut(auth);
    // AuthContext listener handles state update
    console.log("[Auth:signOut] Sign out successful.");
    return true;
  } catch (error) {
    console.error("[Auth:signOut] Error signing out:", error);
    return false;
  }
};

// Create or update user document in Firestore
const createUserDocument = async (user: User | null, merge: boolean) => {
  if (!user) {
      console.warn("[Auth:createUserDocument] Attempted to create document for null user.");
      return; // Or throw error? Decided to just return for now.
  }
  console.log(`[Auth:createUserDocument] Ensuring user document for: ${user.uid}. Merge: ${merge}`);
  
  const userDocRef = doc(db, "users", user.uid);
  let userData: { [key: string]: any };

  if (merge) {
      // Prepare data for merge (only basic info + lastLogin)
      userData = {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: new Date(),
      };
      // Check if document exists to set initial data ONLY if it's truly a new user
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            console.log(`[Auth:createUserDocument] New user detected (merge=true). Setting initial data fields for ${user.uid}.`);
            userData.preferences = { ingredients: [], equipment: [], staples: [], dietaryPrefs: [] };
            userData.usageStats = { month: new Date().getMonth() + 1, recipesGenerated: 0 };
            userData.savedRecipes = [];
            userData.createdAt = new Date();
            // Set the document with initial data (no merge needed as it doesn't exist)
            await setDoc(userDocRef, userData); 
            console.log(`[Auth:createUserDocument] New user document created for ${user.uid}.`);
        } else {
            console.log(`[Auth:createUserDocument] Existing user detected (merge=true). Updating basic info for ${user.uid}.`);
            // Update existing document with potentially changed basic info
            await updateDoc(userDocRef, userData); 
            console.log(`[Auth:createUserDocument] Existing user document updated for ${user.uid}.`);
        }
      } catch (error) {
         console.error(`[Auth:createUserDocument] Error checking/writing document (merge=true) for ${user.uid}:`, error);
         throw error; // Re-throw DB errors
      }
  } else {
     // Prepare data for complete overwrite (used during initial registration)
     userData = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date(),
        preferences: { ingredients: [], equipment: [], staples: [], dietaryPrefs: [] },
        usageStats: { month: new Date().getMonth() + 1, recipesGenerated: 0 },
        savedRecipes: [],
        createdAt: new Date(),
     };
     try {
        await setDoc(userDocRef, userData); // Overwrite completely
        console.log(`[Auth:createUserDocument] User document created (overwrite) for ${user.uid}`);
     } catch (error) {
        console.error(`[Auth:createUserDocument] Error writing document (overwrite) for ${user.uid}:`, error);
        throw error; // Re-throw DB errors
     }
  }
};
