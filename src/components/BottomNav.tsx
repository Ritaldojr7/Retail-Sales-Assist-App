"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { tab: "home", href: "/", label: "Home", icon: LayoutDashboard },
  { tab: "dsr", href: "/dsr", label: "DSR", icon: FileSpreadsheet },
  { tab: "footfall", href: "/footfall", label: "Footfall", icon: Users },
  { tab: "analytics", href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = (() => {
    if (pathname === "/") return "home";
    const segment = pathname.split("/")[1];
    return NAV_ITEMS.some((item) => item.tab === segment) ? segment : "";
  })();

  return (
    <nav id="bottomnav" className="mobile-bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.tab;

        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => router.push(item.href)}
            className={`mobile-nav-item ${isActive ? "mobile-nav-item-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
