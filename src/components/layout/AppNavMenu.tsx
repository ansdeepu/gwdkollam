// src/components/layout/AppNavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FilePlus2, FileText, Settings, FolderOpen, Users, Briefcase, Settings2, BarChart3, DollarSign, Hourglass, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/schemas';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // Roles that can see this item.
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/data-entry', label: 'File Data Entry', icon: FilePlus2, roles: ['editor'] },
  { href: '/dashboard/pending-updates', label: 'Pending Updates', icon: Hourglass, roles: ['editor'] },
  { href: '/dashboard/file-room', label: 'File Manager', icon: FolderOpen },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/progress-report', label: 'Progress Reports', icon: BarChart3 },
  { href: '/dashboard/report-format-suggestion', label: 'Report Builders', icon: Settings2 },
  { href: '/dashboard/gwd-rates', label: 'GWD Rates', icon: DollarSign },
  { href: '/dashboard/establishment', label: 'Establishment', icon: Briefcase },
  { href: '/dashboard/user-management', label: 'User Management', icon: Users, roles: ['editor'] },
  { href: '/dashboard/help', label: 'Help', icon: HelpCircle },
];

export default function AppNavMenu() {
  const pathname = usePathname();
  const { user } = useAuth();

  const accessibleNavItems = allNavItems.filter(item => {
    if (!user || !user.isApproved) return false;
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(user.role);
  });

  return (
    <SidebarMenu>
      {accessibleNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
            >
              <div>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
