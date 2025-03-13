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
    console.log("Starting registration with email:", email);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User registered successfully:", userCredential.user.uid);
      
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
    console.log("Starting signin with email:", email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in successfully:", userCredential.user.uid);
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
      const userCredential = await signInWithPopup(auth, provider);
      console.log("Google signin successful:", userCredential.user.uid);
      
      // Check if user document exists, create if it doesn't
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log("Creating new user document for Google user");
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
    console.log("Signing out user");
    
    try {
      await firebaseSignOut(auth);
      console.log("User signed out successfully");
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