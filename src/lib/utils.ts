// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Add this to your utils.ts
export function getBasePath() {
  // Default for client-side
  if (typeof window !== 'undefined') {
    // For client-side navigation
    return window.location.pathname.startsWith('/whattoeat') ? '/whattoeat' : '';
  }
  
  // For server-side rendering
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}