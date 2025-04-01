'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  console.log("[Providers] Rendering providers");
  
  return (
    <AuthProvider>
      <Toaster />
      {children}
    </AuthProvider>
  );
}