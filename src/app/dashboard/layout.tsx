
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
  const { isAuthenticated, isLoading: authIsLoading, user, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityFirestoreUpdateRef = useRef<number>(0); 
  const { toast } = useToast();
  
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    if (isAuthenticated && user?.uid) { 
      idleTimerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_DURATION);

      // Throttled update of last active timestamp
      const now = Date.now();
      if (now - lastActivityFirestoreUpdateRef.current > LAST_ACTIVE_UPDATE_INTERVAL) {
        lastActivityFirestoreUpdateRef.current = now;
        updateUserLastActive(user.uid);
      }
    }
  }, [isAuthenticated, user, performIdleLogout]);


  useEffect(() => {
    if (!isClient) {
      return;
    }
    
    // If auth is done loading, user is not authenticated, AND we are not already on the login page, redirect.
    if (!authIsLoading && !isAuthenticated && pathname !== '/login') {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      router.push('/login');
    }
  }, [isClient, authIsLoading, isAuthenticated, router, pathname]);


  useEffect(() => {
    if (!isClient || !isAuthenticated) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      return; 
    }

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    resetIdleTimer(); 

    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isClient, isAuthenticated, resetIdleTimer]);

  // When pathname changes, navigation is complete
  useEffect(() => {
      setIsNavigating(false);
  }, [pathname]);


  if (!isClient || authIsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated and not on login page, show loader while redirecting
  if (!isAuthenticated && pathname !== '/login') {
       return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

  // If authenticated, but on the login page, show loader while redirecting to dashboard
  if (isAuthenticated && pathname === '/login') {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }

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
