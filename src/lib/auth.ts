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
  
  // Register with email and password
  export const registerWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await createUserDocument(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  };
  
  // Sign in with email and password
  export const signInWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };
  
  // Sign in with Google
  export const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user document exists, create if it doesn't
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await createUserDocument(userCredential.user);
      }
      
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };
  
  // Sign out
  export const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };
  
  // Create user document in Firestore
  const createUserDocument = async (user: User) => {
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
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };