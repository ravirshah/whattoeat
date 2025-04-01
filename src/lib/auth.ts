import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    User
  } from "firebase/auth";
  import { auth, db } from "./firebase";
  import { doc, setDoc, getDoc } from "firebase/firestore";
  import { setGlobalAuthUser } from './context/AuthContext';

  // Register with email and password
  export const registerWithEmail = async (email: string, password: string) => {
    console.log("Starting registration with email:", email);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User registered successfully:", userCredential.user.uid);
      
      // Create user document in Firestore
      await createUserDocument(userCredential.user);
      
      // IMPORTANT: Force update the global auth state
      setGlobalAuthUser(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  };
  
  // Sign in with email and password
  export const signInWithEmail = async (email: string, password: string) => {
    console.log("Starting signin with email:", email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in successfully:", userCredential.user.uid);
      
      // IMPORTANT: Force update the global auth state
      setGlobalAuthUser(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };
  
  // Sign in with Google
  export const signInWithGoogle = async () => {
    console.log("Starting Google signin");
    
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes if needed
      provider.addScope('email');
      provider.addScope('profile');
      
      // Force re-authentication to ensure fresh credentials
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      console.log("Google signin successful:", userCredential.user.uid);
      
      // Get a fresh ID token immediately - this helps ensure the token is available right away
      try {
        const token = await userCredential.user.getIdToken(true);
        console.log("Fresh token obtained after Google sign-in, length:", token.length);
      } catch (tokenError) {
        console.error("Error getting fresh token after Google sign-in:", tokenError);
        // Continue anyway as we've already authenticated
      }
      
      // IMPORTANT: Force update the global auth state
      setGlobalAuthUser(userCredential.user);
      
      // Check if user document exists, create if it doesn't
      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log("Creating new user document for Google user");
          await createUserDocument(userCredential.user);
        }
      } catch (dbError) {
        console.error("Error checking/creating user document:", dbError);
        // Continue anyway as we've already authenticated
      }
      
      // Reload the user object to ensure we have the latest user data
      try {
        await userCredential.user.reload();
        console.log("User data reloaded after Google sign-in");
      } catch (reloadError) {
        console.error("Error reloading user after Google sign-in:", reloadError);
        // Continue anyway as we've already authenticated
      }
      
      // Return the user after all operations
      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      // Check for specific error codes
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in canceled: The popup was closed before completing authentication.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked: Please allow popups for this site to sign in with Google.');
      } else {
        throw error;
      }
    }
  };
  
  // Sign out
  export const signOut = async () => {
    console.log("Signing out user");
    
    try {
      // Clear any session data first
      try {
        sessionStorage.clear();
        localStorage.removeItem('firebase:authUser');
      } catch (e) {
        console.error("Error clearing session data:", e);
        // Continue with signout anyway
      }
      
      // Firebase sign out
      await firebaseSignOut(auth);
      console.log("User signed out successfully");
      
      // IMPORTANT: Force update the global auth state to null
      setGlobalAuthUser(null);
      
      // Return to home page after a slight delay
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Use window.location for a clean reload
          console.log("Redirecting to home page after signout");
          window.location.href = window.location.origin + '/whattoeat';
          resolve();
        }, 100);
      });
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
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