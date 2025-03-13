// src/pages/api/debug-auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Simple Firebase Admin initialization
if (!getApps().length) {
  try {
    // Initialize with just the project ID to avoid credential issues
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log("Firebase Admin initialized with project ID");
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Debug Auth API called");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      console.error("No token provided in request");
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Try to verify the token
    console.log("Attempting to verify Firebase token...");
    const decodedToken = await getAuth().verifyIdToken(token);
    console.log("Token verification successful for user:", decodedToken.uid);
    
    // Return success with user info
    return res.status(200).json({ 
      success: true,
      message: "Firebase authentication successful",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email
      }
    });
  } catch (error) {
    console.error("Auth verification failed:", error);
    return res.status(500).json({ 
      error: 'Authentication verification failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}