"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  TrendingDown,
  Mic,
  FileSpreadsheet,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import FridoLogo from "./FridoLogo";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const primaryNavItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Register a Lead", href: "/lead", icon: ClipboardList },
    { label: "Log Lost Sale (R-Loss)", href: "/rloss", icon: TrendingDown },
    { label: "Objections & Q&A", href: "/objection", icon: Mic },
  ];

  const reportsNavItems = [
    { label: "DSR Creation", href: "/dsr", icon: FileSpreadsheet },
    { label: "Footfall Reporting", href: "/footfall", icon: Users },
    { label: "Analytics Panel", href: "/analytics", icon: BarChart3 },
  ];

  const systemNavItems = [
    { label: "Identity Setup", href: "/setup", icon: Settings },
  ];

  const renderItem = (item: { label: string; href: string; icon: React.ComponentType<any> }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
      <button
        key={item.href}
        onClick={() => router.push(item.href)}
        className={`w-full flex items-center gap-3 h-10 px-3 transition-120 cursor-pointer relative group text-left
          ${isActive 
            ? "bg-brand-yellow/10 text-text-primary font-semibold border-l-[3px] border-brand-yellow pl-[9px]" 
            : "text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary border-l-[3px] border-transparent"
          }`}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-brand-yellow" : "text-text-tertiary group-hover:text-text-secondary"}`} />
        {!collapsed && <span className="fs-small truncate">{item.label}</span>}
        
        {/* Accent rail hover helper for collapsed sidebar */}
        {collapsed && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-yellow opacity-0 group-hover:opacity-100 transition-120" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 bg-sidebar border-r border-border flex flex-col justify-between transition-all duration-260 ease-out
        ${collapsed ? "w-12" : "w-[252px]"}`}
    >
      <div className="flex flex-col flex-grow overflow-y-auto overflow-x-hidden">
        {/* Sidebar brand header logo container */}
        <div className={`h-[72px] flex items-center border-b border-border transition-all duration-260
          ${collapsed ? "justify-center px-1" : "justify-between px-4"}`}
        >
          {collapsed ? (
            <div className="w-8 h-8 rounded-sm bg-brand-yellow flex items-center justify-center font-bold text-lg text-[#0A0A0A] overflow-hidden select-none">
              f
            </div>
          ) : (
            <div className="flex items-center text-text-primary">
              <FridoLogo width={85} height={28} />
            </div>
          )}
        </div>

        {/* Navigation Categories */}
        <div className="py-4 space-y-6">
          {/* Core modules */}
          <div>
            {!collapsed && (
              <div className="px-4 fs-caption text-text-tertiary font-bold uppercase tracking-wider mb-2">
                Core Activities
              </div>
            )}
            <div className="space-y-0.5">{primaryNavItems.map(renderItem)}</div>
          </div>

          {/* Reports modules */}
          <div>
            {!collapsed && (
              <div className="px-4 fs-caption text-text-tertiary font-bold uppercase tracking-wider mb-2">
                Reports & Submissions
              </div>
            )}
            <div className="space-y-0.5">{reportsNavItems.map(renderItem)}</div>
          </div>

          {/* System settings */}
          <div>
            {!collapsed && (
              <div className="px-4 fs-caption text-text-tertiary font-bold uppercase tracking-wider mb-2">
                System
              </div>
            )}
            <div className="space-y-0.5">{systemNavItems.map(renderItem)}</div>
          </div>
        </div>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="h-[52px] border-t border-border flex items-center px-2 justify-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-sm border border-border bg-bg-secondary text-text-secondary flex items-center justify-center transition-120 focus-ring cursor-pointer hover:bg-bg-tertiary hover:text-text-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
