// src/components/layout/AppSidebar.tsx
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import AppNavMenu from './AppNavMenu';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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


export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { staffMembers } = useStaffMembers();
  const router = useRouter();

  const staffInfo = useMemo(() => {
    if (!user?.staffId) return null;
    return staffMembers.find(s => s.id === user.staffId);
  }, [user, staffMembers]);

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="https://placehold.co/40x40/2563EB/FFFFFF.png?text=G" 
            alt="GWD Logo" 
            width={32} 
            height={32} 
            className="rounded-sm"
            data-ai-hint="logo abstract"
          />
          <span className="font-semibold text-lg text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            GWD Kollam
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <AppNavMenu />
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full h-auto p-2" tooltip={{children: user?.name || "User Profile", side: "right", align: "center"}}>
                <div className="flex w-full items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={staffInfo?.photoUrl || undefined} alt={user?.name || 'User'} />
                      <AvatarFallback>{getInitials(user?.name, user?.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left w-full overflow-hidden group-data-[collapsible=icon]:hidden">
                        <span className="font-medium text-sm truncate">{user?.name || "User"}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56 mb-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4 text-destructive" />
                  <span className="text-destructive">Log out</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
