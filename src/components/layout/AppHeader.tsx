// src/components/layout/AppHeader.tsx
"use client";

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
import { LogOut } from 'lucide-react';
import { useStaffMembers } from '@/hooks/useStaffMembers';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { staffMembers } = useStaffMembers();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const staffInfo = staffMembers.find(s => s.id === user?.staffId);
  const photoUrl = staffInfo?.photoUrl;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="hidden md:block">
        <SidebarTrigger />
      </div>
      
      {/* Spacer to push subsequent items to the right */}
      <div className="flex-1"></div>

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
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
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
