// src/lib/utils.ts - Updated getBasePath function

export function getBasePath(): string {
  // For server-side rendering
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_PATH || '';
  }
  
  // For client-side - handle both development and production
  const { pathname } = window.location;
  
  // Check for specific deployment paths
  if (pathname.startsWith('/whattoeat')) {
    return '/whattoeat';
  }
  
  // Default to empty string (no base path)
  return '';
}

// Use this to correctly format API requests
export function getApiUrl(endpoint: string): string {
  const basePath = getBasePath();
  // Make sure endpoint starts with /api
  const formattedEndpoint = endpoint.startsWith('/api') 
    ? endpoint 
    : `/api/${endpoint.replace(/^\//, '')}`;
    
  return `${basePath}${formattedEndpoint}`;
}