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
// Removed unused import: setGlobalAuthUser

// Register with email and password
export const registerWithEmail = async (email: string, password: string) => {
  console.log("[Auth] Starting registration with email:", email);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("[Auth] User registered successfully:", userCredential.user.uid);
    
    // Create user document in Firestore
    await createUserDocument(userCredential.user);
    
    // No need to force token refresh here, onAuthStateChanged handles it.
    // await userCredential.user.getIdToken(true);
    
    return userCredential.user;
  } catch (error) {
    console.error("[Auth] Error registering user:", error);
    throw error; // Re-throw for the calling component to handle
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  console.log("[Auth] Starting signin with email:", email);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("[Auth] User signed in successfully:", userCredential.user.uid);
    
    // No need to force token refresh here, onAuthStateChanged handles it.
    // await userCredential.user.getIdToken(true);

    // Ensure the user document exists (optional, depending on your flow)
    // await createUserDocument(userCredential.user, true); // Pass true to merge/update if exists
    
    return userCredential.user;
  } catch (error) {
    console.error("[Auth] Error signing in with email:", error);
    throw error; // Re-throw for the calling component to handle
  }
};

// Sign in with Google
export async function signInWithGoogle(): Promise<boolean> { // Return boolean success indicator
  console.log("[Auth] Starting Google sign-in process");
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    console.log("[Auth] Google sign-in successful via popup, userId:", result.user.uid);

    // Ensure the user document exists or is created
    await createUserDocument(result.user, true); // Pass true to merge/update if exists

    // No need to manually set global user or refresh token here.
    // The onAuthStateChanged listener in AuthContext handles state updates.

    return true; // Indicate success

  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("[Auth] Sign-in popup was closed by the user.");
        // Potentially show a gentle message to the user, but don't throw an error
      } else if (error.code === 'auth/popup-blocked') {
        console.error("[Auth] Sign-in popup was blocked by the browser.");
        alert("Please allow popups for this site to sign in with Google.");
      } else {
        console.error("[Auth] Firebase error during Google sign-in:", error.code, error.message);
        // Show a generic error, but consider more specific messages
        alert(`Sign-in error: An unexpected issue occurred (${error.code}). Please try again.`);
      }
    } else {
      console.error("[Auth] Unexpected error during Google sign-in:", error);
      alert("An unexpected error occurred during Google Sign-In. Please try again later.");
    }
    return false; // Indicate failure
  }
}

// Sign out
export const signOut = async (): Promise<boolean> => {
  try {
    console.log("[Auth] Signing out user");
    await firebaseSignOut(auth);
    // AuthContext listener will handle the state update

    // Optional: Clear related local storage if needed
    // localStorage.removeItem('some_key'); 

    return true;
  } catch (error) {
    console.error("[Auth] Error signing out:", error);
    return false;
  }
};

// Create or update user document in Firestore
const createUserDocument = async (user: User, merge = false) => { // Added merge option
  if (!user) return;
  console.log(`[Auth] Ensuring user document for: ${user.uid}. Merge: ${merge}`);
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    
    // Prepare base user data
    const userData: { [key: string]: any } = {
      email: user.email,
      displayName: user.displayName, // Store display name
      photoURL: user.photoURL,     // Store photo URL
      lastLogin: new Date()        // Track last login
    };

    if (merge) {
      // If merging, check if document exists to set initial values only if needed
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        console.log(`[Auth] Document for ${user.uid} does not exist. Setting initial data.`);
        // Set initial data only if the document doesn't exist
        userData.preferences = {
          ingredients: [],
          equipment: [],
          staples: [],
          dietaryPrefs: []
        };
        userData.usageStats = {
          month: new Date().getMonth() + 1, // Use 1-12 for month
          recipesGenerated: 0
        };
        userData.savedRecipes = [];
        userData.createdAt = new Date(); // Add creation timestamp
      } else {
        console.log(`[Auth] Document for ${user.uid} exists. Updating basic info.`);
      }
      // Perform a merge operation: updates fields or creates doc if it doesn't exist
      await setDoc(userDocRef, userData, { merge: true });
      console.log("[Auth] User document merged/updated successfully");

    } else {
       // Original behavior: Overwrite or create with basic structure (used during registration)
       userData.preferences = {
          ingredients: [],
          equipment: [],
          staples: [],
          dietaryPrefs: []
        };
        userData.usageStats = {
          month: new Date().getMonth() + 1,
          recipesGenerated: 0
        };
        userData.savedRecipes = [];
        userData.createdAt = new Date();
        
       await setDoc(userDocRef, userData);
       console.log("[Auth] User document created successfully (overwrite)");
    }

  } catch (error) {
    console.error("[Auth] Error creating/updating user document:", error);
    // Decide if this error should be thrown or just logged
    // throw error; // Re-throwing might prevent sign-in completion
  }
};
