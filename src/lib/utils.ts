// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
  }
  // If client-side, use the actual base path
  return '/whattoeat';
}

export function withBasePath(path: string): string {
  const basePath = getBasePath();
  if (basePath && path.startsWith(basePath)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

// NEW FUNCTION: Use this for API calls
export function getApiUrl(path: string): string {
  return withBasePath(path);
}

export function navigateTo(path: string, router?: any): void {
  const fullPath = withBasePath(path);
  if (router && typeof router.push === 'function') {
    router.push(fullPath);
  } else if (typeof window !== 'undefined') {
    window.location.href = fullPath;
  }
}