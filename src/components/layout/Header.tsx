// src/components/layout/Header.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Home, 
  User, 
  BookOpen, 
  ChefHat, 
  LogOut, 
  Menu, 
  X,
  Settings,
  Heart
} from 'lucide-react';

export default function Header() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="flex items-center mr-4">
          <Link href="/" className="flex-shrink-0 flex items-center">
            <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mr-2" />
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">WhatToEat</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:justify-between md:items-center">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link 
              href="/" 
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Home
            </Link>
            
            <Link 
              href="/generate" 
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Generate Recipes
            </Link>
            
            {currentUser && (
              <Link 
                href="/recipes" 
                className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                My Recipes
              </Link>
            )}
          </nav>
          
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
            ) : currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={currentUser.photoURL || ''} 
                        alt={currentUser.displayName || 'User avatar'} 
                      />
                      <AvatarFallback>
                        {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex w-full cursor-default">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recipes" className="flex w-full cursor-default">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>My Recipes</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/generate" className="flex w-full cursor-default">
                      <ChefHat className="mr-2 h-4 w-4" />
                      <span>Generate Recipe</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/signin">
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register">
                    Register
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="flex md:hidden flex-1 justify-end">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pr-0 sm:max-w-xs">
              <div className="flex flex-col h-full">
                <div className="px-7">
                  <Link 
                    href="/" 
                    className="flex items-center" 
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mr-2" />
                    <span className="text-lg font-bold">WhatToEat</span>
                  </Link>
                </div>
                <div className="mt-8 flex flex-col gap-4">
                  {currentUser && (
                    <div className="flex items-center gap-2 px-7">
                      <Avatar className="h-9 w-9">
                        <AvatarImage 
                          src={currentUser.photoURL || ''} 
                          alt={currentUser.displayName || 'User avatar'} 
                        />
                        <AvatarFallback>
                          {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">
                          {currentUser.displayName || currentUser.email}
                        </p>
                        {currentUser.displayName && (
                          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <nav className="grid gap-2 px-2">
                    <Link
                      href="/"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-all hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <Home className="h-5 w-5" />
                      Home
                    </Link>
                    <Link
                      href="/generate"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-all hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      <ChefHat className="h-5 w-5" />
                      Generate Recipes
                    </Link>
                    
                    {currentUser ? (
                      <>
                        <Link
                          href="/recipes"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-all hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <Heart className="h-5 w-5" />
                          My Recipes
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-all hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <User className="h-5 w-5" />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-red-600 dark:text-red-400 transition-all hover:bg-red-100/50 dark:hover:bg-red-900/20 w-full text-left"
                        >
                          <LogOut className="h-5 w-5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <div className="grid gap-2 px-3 pt-6">
                        <Button asChild variant="outline" onClick={() => setIsMenuOpen(false)}>
                          <Link href="/signin">Sign In</Link>
                        </Button>
                        <Button asChild onClick={() => setIsMenuOpen(false)}>
                          <Link href="/register">Register</Link>
                        </Button>
                      </div>
                    )}
                  </nav>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}