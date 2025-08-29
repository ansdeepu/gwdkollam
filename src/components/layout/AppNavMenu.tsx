// src/components/layout/AppNavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, FolderOpen, Users, Briefcase, Settings2, BarChart3, DollarSign, Hourglass, Waves, ClipboardList, UserPlus, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; // Import the hook
import { Badge } from '@/components/ui/badge'; // Import the Badge component
import { usePageNavigation } from '@/app/dashboard/layout';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // Roles that can see this item.
}

export const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/file-room', label: 'File Manager', icon: FolderOpen },
  { href: '/dashboard/ars', label: 'ARS', icon: Waves },
  { href: '/dashboard/agency-registration', label: 'Rig Registration', icon: ClipboardList, roles: ['editor', 'viewer'] },
  { href: '/dashboard/pending-updates', label: 'Pending Updates', icon: Hourglass, roles: ['editor'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/progress-report', label: 'Progress Reports', icon: BarChart3 },
  { href: '/dashboard/report-format-suggestion', label: 'Report Builders', icon: Settings2 },
  { href: '/dashboard/gwd-rates', label: 'GWD Rates', icon: DollarSign },
  { href: '/dashboard/establishment', label: 'Establishment', icon: Briefcase },
  { href: '/dashboard/user-management', label: 'User Management', icon: Users, roles: ['editor', 'viewer'] },
  { href: '/dashboard/help', label: 'Help & About', icon: HelpCircle },
];

export default function AppNavMenu() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { pendingUpdates } = usePendingUpdates(); // Get pending updates
  const { setIsNavigating } = usePageNavigation();

  const accessibleNavItems = allNavItems.filter(item => {
    if (!user || !user.isApproved) return false;
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(user.role);
  });

  const pendingCount = pendingUpdates.length;

  const handleNavigation = (href: string) => {
    if (href !== pathname) {
      setIsNavigating(true);
    }
  };

  return (
    <SidebarMenu>
      {accessibleNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref onClick={() => handleNavigation(item.href)}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
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
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
