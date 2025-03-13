// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the base path for the application
 * Works in both client and server environments
 */
export function getBasePath() {
  // For client-side navigation
  if (typeof window !== 'undefined') {
    return window.location.pathname.startsWith('/whattoeat') ? '/whattoeat' : '';
  }
  
  // For server-side rendering
  // This will be an empty string during SSR unless explicitly set
  return '';
}