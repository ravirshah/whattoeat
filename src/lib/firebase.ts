// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Log Firebase config for debugging (hiding full API key)
  console.log("Firebase configuration:", {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 5) + "..." : "Not set",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "Not set",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Not set",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 
      "..." + process.env.NEXT_PUBLIC_FIREBASE_APP_ID.substring(
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID.length - 5
      ) : "Not set"
  });

  // Check if required Firebase config is present
  const missingVars = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  
  if (missingVars.length > 0) {
    console.error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
  }

  // Initialize Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  
  // Throw a more detailed error to make debugging easier
  if (typeof window !== 'undefined') {
    console.error(
      "%c Firebase Initialization Failed ", 
      "background: #f44336; color: white; padding: 2px 4px; border-radius: 3px;",
      "\nThis will cause authentication issues. Check your environment variables."
    );
  }
  
  // Create fallback objects to prevent immediate crashes
  const fallbackApp = {} as any;
  fallbackApp._initialized = false;
  
  app = fallbackApp as FirebaseApp;
  auth = { currentUser: null } as Auth;
  db = {} as Firestore;
}

export { app, auth, db };