// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the base path for the application
 * Works consistently across client and server environments
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') {
    // For server-side rendering, default to empty string
    return '';
  }
  
  // Get base path from URL
  // On Vercel with a custom domain, this might be /whattoeat
  const { pathname } = window.location;
  
  // Check if we're already on a path that starts with /whattoeat
  if (pathname.startsWith('/whattoeat')) {
    return '/whattoeat';
  }
  
  return '';
}

/**
 * Ensures a path has the correct base path prefix
 * @param path The path without base path
 * @returns The path with proper base path prefix
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath();
  
  // If path already starts with basePath, don't add it again
  if (basePath && path.startsWith(basePath)) {
    return path;
  }
  
  // Make sure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${basePath}${normalizedPath}`;
}