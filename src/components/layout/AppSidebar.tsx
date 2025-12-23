// src/components/layout/AppSidebar.tsx
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter, // Import SidebarFooter
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import AppNavMenu from './AppNavMenu';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Import DropdownMenu components
import { useRouter } from 'next/navigation';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Inline SVG components
const LogOut = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);
const User = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const ChevronsUpDown = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
);


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


const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { staffMembers } = useStaffMembers();
  const router = useRouter();

  const staffInfo = staffMembers.find(s => s.id === user?.staffId);
  const photoUrl = staffInfo?.photoUrl;
  
  const avatarColorClass = getColorClass(user?.name || user?.email || 'user');

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="flex flex-col">
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
        <ScrollArea className="h-full">
          <AppNavMenu />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full h-auto p-2" tooltip={{children: user?.name || "User Profile", side: "right", align: "center"}}>
                <div className="flex w-full items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={photoUrl || undefined} alt={user?.name || 'User'} />
                        <AvatarFallback className={cn("font-semibold", avatarColorClass)}>{getInitials(user?.name)}</AvatarFallback>
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
