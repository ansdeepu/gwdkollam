// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import { useAuth } from '@/hooks/useAuth'; 
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { updateUserLastActive } from '@/hooks/useAuth';

const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

// Create a context to manage the loading state
const PageNavigationContext = createContext({
  isNavigating: false,
  setIsNavigating: (isNavigating: boolean) => {},
});

export const usePageNavigation = () => useContext(PageNavigationContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityFirestoreUpdateRef = useRef<number>(0); 
  const { toast } = useToast();
  
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // If auth is done loading and there is no user, redirect to login.
    // This protects all routes wrapped by this layout.
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const performIdleLogout = useCallback(() => {
    toast({
      title: "Session Expired",
      description: "You have been signed out due to inactivity.",
      duration: 5000,
    });
    logout();
  }, [logout, toast]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (user?.uid) { 
      idleTimerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_DURATION);

      // Throttled update of last active timestamp
      const now = Date.now();
      if (now - lastActivityFirestoreUpdateRef.current > LAST_ACTIVE_UPDATE_INTERVAL) {
        lastActivityFirestoreUpdateRef.current = now;
        updateUserLastActive(user.uid);
      }
    }
  }, [user, performIdleLogout]);


  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return; 
    }

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleUserActivity = () => resetIdleTimer();
    resetIdleTimer(); 

    activityEvents.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [user, resetIdleTimer]);

  useEffect(() => {
      setIsNavigating(false);
  }, [pathname]);

  // While checking auth state, show a full-screen loader.
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is done, but there's no user, show a loader while the redirect to login happens.
  if (!user) {
       return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      );
  }

  // If we have a user, render the full dashboard layout.
  return (
    <PageNavigationContext.Provider value={{ isNavigating, setIsNavigating }}>
      <SidebarProvider defaultOpen>
        {isNavigating && (
          <div className="page-transition-spinner">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </PageNavigationContext.Provider>
  );
}
