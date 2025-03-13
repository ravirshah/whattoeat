'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { signOut } from '@/lib/auth';
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
import { Menu, User, ChefHat, LogOut, Home, BookOpen } from 'lucide-react';

export default function Header() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
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
          {currentUser && (
            <Link href="/recipes" className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
              isActive('/recipes') ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'
            }`}>
              My Recipes
            </Link>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {loading ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-md dark:bg-gray-700"></div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" size="icon">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{currentUser.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                    {currentUser.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
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
                  {currentUser && (
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
                {!loading && (
                  currentUser ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{currentUser.displayName || 'User'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/profile">
                          <User className="h-4 w-4 mr-2" />
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