// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";

// Create stable instances
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  // Log Firebase config for debugging (hiding API key)
  console.log("Firebase configuration:", {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 5) + "..." : "Not set",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "Not set",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Not set",
  });

  // Initialize Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  
  // Force a loading check to ensure authentication state is correctly loaded early
  if (typeof window !== 'undefined') {
    console.log("Firebase auth - checking current user on initialization:", !!auth.currentUser);
    // Don't attach an onAuthStateChanged here, as that would duplicate the global listener in AuthContext
  }
  
  // Initialize Firestore with error handling
  try {
    db = getFirestore(app);
    console.log("Firestore initialized");
  } catch (firestoreError) {
    console.error("Firestore initialization error:", firestoreError);
    // Create placeholder Firestore
    db = {} as Firestore;
  }

  // Set persistence to LOCAL to ensure the user stays logged in
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Firebase persistence set to LOCAL");
      
      // Attempt to reload the auth state to ensure it's fresh
      if (typeof window !== 'undefined' && auth.currentUser) {
        auth.currentUser.reload()
          .then(() => console.log("Reloaded auth user after setting persistence"))
          .catch(err => console.error("Error reloading auth user:", err));
      }
    })
    .catch((error) => {
      console.error("Error setting persistence:", error);
    });

  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  
  // Create fallback objects
  app = {} as FirebaseApp;
  auth = { currentUser: null } as Auth;
  db = {} as Firestore;
}

export { app, auth, db };