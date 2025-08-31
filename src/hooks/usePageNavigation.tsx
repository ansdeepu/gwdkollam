// src/hooks/usePageNavigation.tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from 'react';

interface PageNavigationContextType {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
}

const PageNavigationContext = createContext<PageNavigationContextType | undefined>(undefined);

export function PageNavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <PageNavigationContext.Provider value={{ isNavigating, setIsNavigating }}>
      {children}
    </PageNavigationContext.Provider>
  );
}

export function usePageNavigation(): PageNavigationContextType {
  const context = useContext(PageNavigationContext);
  if (context === undefined) {
    throw new Error('usePageNavigation must be used within a PageNavigationProvider');
  }
  return context;
}
