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
    // For server-side rendering, use environment variable if available
    return process.env.NEXT_PUBLIC_BASE_PATH || '';
  }
  
  // For client-side, derive from the window.location
  const { pathname, origin } = window.location;
  
  // Check for specific deployment paths like '/whattoeat'
  if (pathname.startsWith('/whattoeat')) {
    return '/whattoeat';
  }
  
  // Check if running on Vercel preview or similar with a complex URL structure
  const pathParts = pathname.split('/');
  if (pathParts.length > 1 && pathParts[1] && !pathParts[1].includes('.') && pathParts[1] !== 'api') {
    // This might be a base path, but verify it's consistent
    const potentialBasePath = `/${pathParts[1]}`;
    
    // Simple heuristic to avoid misidentifying paths
    if (document.querySelector(`a[href^="${potentialBasePath}/"]`)) {
      return potentialBasePath;
    }
  }
  
  // Default to empty string (no base path)
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

/**
 * Safely navigates to a page, handling base paths correctly
 * @param path The destination path
 * @param useRouter The Next.js router instance (if available)
 */
export function navigateTo(path: string, router?: any): void {
  const fullPath = withBasePath(path);
  
  if (router && typeof router.push === 'function') {
    // Use Next.js router if available
    router.push(fullPath);
  } else if (typeof window !== 'undefined') {
    // Fallback to window.location
    window.location.href = fullPath;
  }
}