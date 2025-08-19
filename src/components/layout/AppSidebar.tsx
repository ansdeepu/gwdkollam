// src/components/layout/AppSidebar.tsx
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from '@/components/ui/sidebar';
import AppNavMenu from './AppNavMenu';
import Link from 'next/link';
import Image from 'next/image';

export default function AppSidebar() {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="https://placehold.co/40x40/FF9900/1A1A1A.png?text=G" 
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
    </Sidebar>
  );
}
