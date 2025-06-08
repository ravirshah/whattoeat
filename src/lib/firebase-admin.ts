// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey && serviceAccountKey.trim() !== '') {
      // For production, use the service account JSON as a base64 encoded env variable
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountKey, 'base64').toString()
      );
      
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with service account');
    } else {
      // Fallback initialization with basic config for development
      // This works for Firestore operations but has limited auth capabilities
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      if (!projectId) {
        throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required');
      }
      
      initializeApp({
        projectId: projectId,
      });
      console.log('Firebase Admin initialized with project ID only');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    
    // Final fallback - try with just project ID
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      try {
        initializeApp({
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with fallback project ID');
      } catch (fallbackError) {
        console.error('Failed to initialize Firebase Admin even with fallback:', fallbackError);
      }
    }
  }
}

// Export the Admin auth and Firestore instances
export const adminAuth = getAuth();
export const adminDb = getFirestore();
