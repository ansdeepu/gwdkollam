// src/components/layout/AppHeader.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, UserCog, HelpCircle } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import Link from 'next/link';
import { allNavItems } from './AppNavMenu';
import { cn } from '@/lib/utils';


const getInitials = (name?: string, email?: string | null) => {
    if (name) {
      const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      if (initials) return initials;
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
};

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};


export default function AppHeader() {
  const { user, logout } = useAuth();
  const { staffMembers } = useStaffMembers();
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/dashboard/data-entry')) return 'File Data Form';
    if (pathname === '/dashboard/profile') return 'User Profile';
    if (pathname === '/dashboard/help') return 'Help & Support';

    // Find the best match from the nav items
    const currentNavItem = allNavItems
        .filter(item => item.href !== '/dashboard') // Exclude the base dashboard route for more specific matching
        .find(item => pathname.startsWith(item.href));
        
    if (currentNavItem) return currentNavItem.label;
    if (pathname === '/dashboard') return 'Dashboard'; // Handle base dashboard case specifically

    return 'Dashboard'; // Fallback
  }, [pathname]);


  const staffInfo = staffMembers.find(s => s.id === user?.staffId);
  const photoUrl = staffInfo?.photoUrl;
  
  const avatarColorClass = user ? getColorClass(user.name || user.email || 'user') : "bg-muted text-muted-foreground";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="hidden md:block">
        <SidebarTrigger />
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
      </div>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto px-2 py-1.5 rounded-lg">
              <span className="text-sm font-medium text-foreground hidden sm:block truncate">
                {user.name || "User"}
              </span>
              <Avatar className="h-9 w-9">
                <AvatarImage 
                  src={photoUrl || undefined} 
                  alt={user?.name || 'User'} 
                  data-ai-hint="person user"
                />
                <AvatarFallback className={cn("font-semibold", avatarColorClass)}>
                    {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <UserCog className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/help">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
