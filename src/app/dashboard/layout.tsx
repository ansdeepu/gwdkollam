// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import { useAuth, updateUserLastActive } from '@/hooks/useAuth'; 
import { Clock, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PageNavigationProvider, usePageNavigation } from '@/hooks/usePageNavigation';
import { PageHeaderProvider, usePageHeader } from '@/hooks/usePageHeader';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

function HeaderContent() {
  const { title, description } = usePageHeader();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set the time only on the client-side to avoid hydration mismatch
    setCurrentTime(new Date());
    
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);


  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className={cn("flex items-center gap-2 text-sm font-medium text-primary")}>
        <Clock className="h-4 w-4" />
        {currentTime ? (
          <span>{format(currentTime, 'dd/MM/yyyy, hh:mm:ss a')}</span>
        ) : (
          <span className="w-40 h-4 bg-muted-foreground/20 rounded-md animate-pulse" />
        )}
      </div>
    </>
  );
}

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityFirestoreUpdateRef = useRef<number>(0); 
  const { toast } = useToast();
  const { isNavigating, setIsNavigating } = usePageNavigation();

  useEffect(() => {
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
  }, [pathname, setIsNavigating]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
       return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      );
  }

  return (
    <SidebarProvider defaultOpen>
      {isNavigating && (
        <div className="page-transition-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
           <header className="sticky top-0 z-10 flex h-[57px] items-center justify-between gap-4 border-b bg-background/95 px-6 backdrop-blur-sm">
                <HeaderContent />
            </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageNavigationProvider>
      <PageHeaderProvider>
        <InnerDashboardLayout>{children}</InnerDashboardLayout>
      </PageHeaderProvider>
    </PageNavigationProvider>
  );
}
