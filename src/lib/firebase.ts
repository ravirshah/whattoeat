// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized successfully");

export { app, auth, db };