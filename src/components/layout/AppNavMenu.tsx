// src/components/layout/AppNavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, FolderOpen, Users, Briefcase, Settings, BarChart3, DollarSign, Hourglass, Waves, ClipboardList, UserPlus, HelpCircle, Landmark, Calendar, Building, MapPin, Hammer, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; 
import { Badge } from '@/components/ui/badge'; 
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  subItems?: NavItem[];
}

export const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/file-room', label: 'Deposit Works', icon: FolderOpen },
  { href: '/dashboard/private-deposit-works', label: 'Private Deposit Works', icon: Landmark },
  { href: '/dashboard/ars', label: 'ARS', icon: Waves },
  { href: '/dashboard/agency-registration', label: 'Rig Registration', icon: ClipboardList },
  { href: '/dashboard/e-tender', label: 'e-Tender', icon: Hammer, roles: ['editor', 'viewer'] },
  { href: '/dashboard/pending-updates', label: 'Pending Actions', icon: Hourglass, roles: ['editor'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/progress-report', label: 'Progress Reports', icon: BarChart3 },
  { href: '/dashboard/report-format-suggestion', label: 'Report Builders', icon: Settings, roles: ['editor', 'viewer'] },
  { href: '/dashboard/gwd-rates', label: 'GWD Rates', icon: DollarSign },
  { href: '/dashboard/establishment', label: 'Establishment', icon: Briefcase, roles: ['editor', 'viewer'] },
  { href: '/dashboard/user-management', label: 'User Management', icon: Users, roles: ['editor', 'viewer'] },
  { href: '/dashboard/settings', label: 'Settings', icon: MapPin, roles: ['editor', 'viewer'] },
  { href: '/dashboard/help', label: 'Help & About', icon: HelpCircle },
];

export default function AppNavMenu() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { subscribeToPendingUpdates } = usePendingUpdates();
  const { setIsNavigating } = usePageNavigation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'editor') {
        setPendingCount(0);
        return;
    }
    const unsubscribe = subscribeToPendingUpdates((updates) => {
        setPendingCount(updates.length);
    });
    return () => unsubscribe();
  }, [user, subscribeToPendingUpdates]);


  const accessibleNavItems = allNavItems.filter(item => {
    if (!user || !user.isApproved) return false;
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(user.role);
  });

  const handleNavigation = (href: string) => {
    if (href !== pathname) {
      setIsNavigating(true);
    }
  };

  return (
    <SidebarMenu>
      {accessibleNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
            <div className="flex items-center w-full group">
              <Link href={item.href} passHref onClick={() => handleNavigation(item.href)} className="flex-grow">
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && !item.subItems)}
                  tooltip={{ children: item.label, side: "right", align: "center" }}
                  className="justify-start pr-8" // Add padding to make space for the icon
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.href === '/dashboard/pending-updates' && pendingCount > 0 && (
                      <Badge className="h-5 px-2 text-xs font-semibold leading-none rounded-full bg-destructive text-destructive-foreground group-data-[collapsible=icon]:hidden">
                        {pendingCount}
                      </Badge>
                    )}
                  </div>
                </SidebarMenuButton>
              </Link>
               <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    </TooltipTrigger>
                    <TooltipContent side="right"><p>Open in new tab</p></TooltipContent>
                </Tooltip>
               </TooltipProvider>
            </div>
           {item.subItems && (
            <SidebarMenuSub>
              {item.subItems.filter(subItem => !subItem.roles || subItem.roles.includes(user!.role)).map(subItem => (
                <SidebarMenuSubItem key={subItem.href}>
                   <div className="flex items-center w-full group">
                    <Link href={subItem.href} passHref onClick={() => handleNavigation(subItem.href)} className="flex-grow">
                        <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                            <div className="flex items-center gap-2">
                                <subItem.icon className="h-4 w-4" />
                                <span>{subItem.label}</span>
                            </div>
                        </SidebarMenuSubButton>
                    </Link>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a href={subItem.href} target="_blank" rel="noopener noreferrer" className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden">
                                    <ArrowUpRight className="h-3 w-3" />
                                </a>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Open in new tab</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                   </div>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
