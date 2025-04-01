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
  
  // IMPORTANT: Set persistence to LOCAL immediately to ensure the user stays logged in
  // This must be done before any auth operations
  if (typeof window !== 'undefined') {
    // Set persistence and wait for it to complete
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('[Firebase] Successfully set persistence to LOCAL');
        
        // Check current auth state immediately
        const currentUser = auth.currentUser;
        console.log('[Firebase] Initial auth state:', currentUser ? `User logged in: ${currentUser.uid}` : 'No user logged in');
        
        // Set up auth state changed listener to log all auth state changes
        onAuthStateChanged(auth, (user) => {
          if (user) {
            console.log('[Firebase] Auth state changed: User logged in:', user.uid);
            
            // Force a token refresh when auth state changes to logged in
            user.getIdToken(true)
              .then(() => console.log('[Firebase] Token refreshed after auth state change'))
              .catch(err => console.error('[Firebase] Error refreshing token after auth state change:', err));
          } else {
            console.log('[Firebase] Auth state changed: No user logged in');
          }
        });
        
        // Force onAuthStateChanged to fire by refreshing token if needed
        if (currentUser) {
          currentUser.getIdToken(true)
            .then(() => console.log('[Firebase] Refreshed token for initial user'))
            .catch(err => console.error('[Firebase] Error refreshing token:', err));
        }
      })
      .catch((error) => {
        console.error('[Firebase] Failed to set persistence:', error);
      });
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

  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  
  // Create fallback objects
  app = {} as FirebaseApp;
  auth = { currentUser: null } as Auth;
  db = {} as Firestore;
}

export { app, auth, db };