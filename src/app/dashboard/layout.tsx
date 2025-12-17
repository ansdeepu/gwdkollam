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
import { useToast } from "@/hooks/use-toast";
import { PageNavigationProvider, usePageNavigation } from '@/hooks/usePageNavigation';
import { PageHeaderProvider, usePageHeader } from '@/hooks/usePageHeader';
import { DataStoreProvider } from '@/hooks/use-data-store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth, updateUserLastActive, type UserProfile } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const Clock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);


const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

const sections = [
  { id: 'updates', title: 'Updates' },
  { id: 'file-status', title: 'File Status' },
  { id: 'work-status', title: 'Work Status' },
  { id: 'constituency', title: 'Constituency' },
  { id: 'finance', title: 'Finance' },
  { id: 'ars', title: 'ARS' },
  { id: 'rig-registration', title: 'Rig Registration' },
  { id: 'rig-financials', title: 'Rig Financials' },
  { id: 'work-progress', title: 'Work Progress' },
  { id: 'supervisor-work', title: "Supervisor" },
];

const sectionColors = [
    "text-sky-600", "text-blue-600", "text-indigo-600", "text-violet-600",
    "text-purple-600", "text-fuchsia-600", "text-pink-600", "text-rose-600",
    "text-red-600", "text-orange-600", "text-amber-600", "text-yellow-600",
    "text-lime-600", "text-green-600", "text-emerald-600", "text-teal-600", "text-cyan-600"
];

function HeaderContent({ user }: { user: UserProfile | null }) {
  const { title, description } = usePageHeader();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const pathname = usePathname();
  const isDashboardPage = pathname === '/dashboard';

  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    // Only run intersection observer on dashboard page
    if (!isDashboardPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px', threshold: 0 }
    );
    
    // Find section elements and observe them
    sections.forEach(section => {
        const el = document.getElementById(section.id);
        if(el) {
            sectionRefs.current[section.id] = el;
            observer.observe(el);
        }
    });

    return () => observer.disconnect();
  }, [isDashboardPage]);
  
  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };
  
  const navSections = sections.filter(section => {
    if (user?.role === 'supervisor') {
      return !['finance', 'ars', 'rig-registration', 'rig-financials'].includes(section.id);
    }
    return true;
  });

  useEffect(() => {
    setCurrentTime(new Date());
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-2">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Toggle Sidebar (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
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
      </div>
      {isDashboardPage && (
        <div className="border-t">
          <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex items-center px-4">
              {navSections.map((section, index) => (
                  <button
                      key={section.id}
                      onClick={() => handleNavClick(section.id)}
                      className={cn(
                          "flex-shrink-0 px-2 py-2.5 text-sm font-semibold transition-all duration-200 ease-in-out border-b-2",
                           sectionColors[index % sectionColors.length],
                           activeSection === section.id
                           ? "border-primary opacity-100"
                           : "border-transparent opacity-70 hover:opacity-100"
                      )}
                  >
                  {section.title}
                  </button>
              ))}
              </div>
          </ScrollArea>
        </div>
      )}
    </div>
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
    if (user) {
      const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
      const handleUserActivity = () => resetIdleTimer();
      
      activityEvents.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));
      resetIdleTimer(); // Initial setup
      
      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
      };
    } else {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
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
    <DataStoreProvider user={user}>
        <SidebarProvider defaultOpen>
          {isNavigating && (
            <div className="page-transition-spinner">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex flex-col flex-1 overflow-hidden">
              <FirebaseErrorListener />
              <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur-sm">
                    <HeaderContent user={user} />
                </header>
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
    </DataStoreProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageNavigationProvider>
      <PageHeaderProvider>
        <TooltipProvider>
            <InnerDashboardLayout>{children}</InnerDashboardLayout>
        </TooltipProvider>
      </PageHeaderProvider>
    </PageNavigationProvider>
  );
}
