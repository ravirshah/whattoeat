'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { signOut } from '@/lib/auth';
import { User } from 'firebase/auth';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  Button,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui';
import { Menu, User as LucideUser, ChefHat, LogOut, Home, BookOpen, Loader2 } from 'lucide-react';

// Component that uses usePathname
function HeaderContent() {
  const { currentUser, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [forceShowButtons, setForceShowButtons] = useState(false);
  const [headerMounted, setHeaderMounted] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(null);

  // Check for URL parameters that indicate a fresh login
  useEffect(() => {
    // Check if this is a page refresh/load
    const isPageRefresh = window.performance.navigation.type === 1 || 
                         window.performance.getEntriesByType('navigation')
                         .some((nav: any) => nav.type === 'reload');
                         
    if (isPageRefresh) {
      console.log("[Header] Page reload detected, refreshing auth state");
      // Try to refresh auth immediately on page load
      refreshUser().then(user => {
        if (user) {
          console.log("[Header] Found user after page reload:", user.uid);
          setLocalUser(user);
        }
      }).catch(err => {
        console.error("[Header] Error refreshing user after page reload:", err);
      });
    }
  }, []);

  // Log auth state when header loads
  useEffect(() => {
    console.log("[Header] Component mounted - Auth state:", 
      loading ? "loading" : currentUser ? `User ${currentUser.uid}` : "no user");
    setHeaderMounted(true);
    
    // If we have a user, set the local user immediately
    if (currentUser) {
      setLocalUser(currentUser);
    }
    
    // Immediately try to refresh auth to ensure we have the latest state
    const initialRefresh = async () => {
      try {
        const refreshedUser = await refreshUser();
        if (refreshedUser) {
          console.log("[Header] Initial refresh found user:", refreshedUser.uid);
          setLocalUser(refreshedUser);
        }
      } catch (e) {
        console.error("[Header] Error during initial auth refresh:", e);
      }
    };
    
    initialRefresh();
  }, []);

  // Log changes to auth state
  useEffect(() => {
    if (headerMounted) {
      console.log("[Header] Auth state changed:", 
        loading ? "loading" : currentUser ? `User ${currentUser.uid}` : "no user",
        "forceShowButtons:", forceShowButtons);
      
      // If user becomes available, update local state
      if (currentUser) {
        setLocalUser(currentUser);
      }
    }
  }, [loading, currentUser, forceShowButtons, headerMounted]);
  
  // Periodically check auth state to handle edge cases
  useEffect(() => {
    const authCheckInterval = setInterval(async () => {
      if (!currentUser && !loading) {
        // Only debug log this to avoid console spam
        console.log("[Header] Periodic auth check");
        try {
          const refreshedUser = await refreshUser();
          if (refreshedUser) {
            console.log("[Header] Periodic refresh found user:", refreshedUser.uid);
            setLocalUser(refreshedUser);
          }
        } catch (e) {
          // Silently catch errors to avoid console pollution
        }
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(authCheckInterval);
  }, [currentUser, loading, refreshUser]);

  // Use local user for rendering if available, fall back to context user
  const displayUser = localUser || currentUser;

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Force show the buttons if loading takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("[Header] Force showing buttons after timeout - current state:", 
          loading ? "loading" : currentUser ? "user authenticated" : "no user");
        setForceShowButtons(true);
      }
    }, 3000); // 3 seconds

    return () => clearTimeout(timeout);
  }, [loading, currentUser]);

  const handleSignOut = async () => {
    try {
      console.log("[Header] Sign out requested");
      await signOut();
    } catch (error) {
      console.error('[Header] Error signing out:', error);
      router.push('/');
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-200 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-900/80' : 'bg-white dark:bg-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <ChefHat className="h-8 w-8 text-emerald-600" />
          <span className="text-xl font-bold tracking-tight">WhatToEat</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
            isActive('/') ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'
          }`}>
            Home
          </Link>
          <Link href="/generate" className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
            isActive('/generate') ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'
          }`}>
            Generate Recipes
          </Link>
          {displayUser && (
            <Link href="/recipes" className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
              isActive('/recipes') ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'
            }`}>
              My Recipes
            </Link>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {loading && !forceShowButtons ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-md dark:bg-gray-700"></div>
          ) : displayUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" size="icon">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {displayUser.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{displayUser.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                    {displayUser.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <LucideUser className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/recipes" className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>My Recipes</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80%] sm:max-w-md">
            <div className="flex flex-col h-full">
              <div className="flex-1 py-6">
                <div className="mb-8">
                  <Link href="/" className="flex items-center space-x-2">
                    <ChefHat className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg font-bold">WhatToEat</span>
                  </Link>
                </div>
                <nav className="flex flex-col space-y-4">
                  <Link 
                    href="/" 
                    className="flex items-center px-2 py-1 text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-100 rounded-md transition dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <Home className="h-5 w-5 mr-2" />
                    Home
                  </Link>
                  <Link 
                    href="/generate" 
                    className="flex items-center px-2 py-1 text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-100 rounded-md transition dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChefHat className="h-5 w-5 mr-2" />
                    Generate Recipes
                  </Link>
                  {displayUser && (
                    <Link 
                      href="/recipes" 
                      className="flex items-center px-2 py-1 text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-100 rounded-md transition dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      <BookOpen className="h-5 w-5 mr-2" />
                      My Recipes
                    </Link>
                  )}
                </nav>
              </div>
              
              <div className="py-6 border-t border-gray-200 dark:border-gray-700">
                {(!loading || forceShowButtons) && (
                  displayUser ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {displayUser.email?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{displayUser.displayName || 'User'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{displayUser.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile">
                          <LucideUser className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-red-600 dark:text-red-400"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/signin">Sign In</Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link href="/register">Register</Link>
                      </Button>
                    </div>
                  )
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// Fallback for Suspense
function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChefHat className="h-8 w-8 text-emerald-600" />
          <span className="text-xl font-bold tracking-tight">WhatToEat</span>
        </div>
        <div className="flex items-center">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderContent />
    </Suspense>
  );
}