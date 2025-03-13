'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container-custom py-8">
        <div className="flex flex-col items-center md:flex-row md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-6 h-6 text-primary-600 mr-2"
            >
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
              <line x1="6" y1="17" x2="18" y2="17"></line>
            </svg>
            <span className="text-lg font-semibold">WhatToEat</span>
          </div>
          
          <div className="flex space-x-6 mb-4 md:mb-0">
            <Link href="/" className="text-gray-500 hover:text-primary-600">
              Home
            </Link>
            <Link href="/about" className="text-gray-500 hover:text-primary-600">
              About
            </Link>
            <Link href="/generate" className="text-gray-500 hover:text-primary-600">
              Generate
            </Link>
            <Link href="/recipes" className="text-gray-500 hover:text-primary-600">
              Recipes
            </Link>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-100 pt-8">
          <p className="text-center text-gray-500 text-sm">
            © {currentYear} WhatToEat. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}