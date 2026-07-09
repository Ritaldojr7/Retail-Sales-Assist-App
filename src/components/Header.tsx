"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, ChevronLeft, User } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";


const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/lead": "Register Lead",
  "/rloss": "Lost Sale",
  "/objection": "Objections",
  "/dsr": "DSR",
  "/footfall": "Footfall",
  "/analytics": "Analytics",
  "/setup": "Profile Setup",
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useProfile();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const isHome = pathname === "/";
  const title = PAGE_TITLES[pathname] ?? "Frido Assist";

  useEffect(() => {
    const activeTheme =
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") ||
      "light";
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <header id="topbar" className="mobile-header">
      <div className="mobile-header-inner">
        {/* Left: title on home, back + title elsewhere */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isHome ? null : (
            <>
              <button
                onClick={() => router.back()}
                className="mobile-icon-btn flex-shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate fs-section font-semibold text-text-primary leading-tight">
                {title}
              </h1>
            </>
          )}
        </div>

        {/* Right: theme + profile */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={toggleTheme}
            className="mobile-icon-btn"
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </button>

          <button
            onClick={() => router.push("/setup")}
            className="mobile-icon-btn"
            aria-label="Profile setup"
          >
            {profile?.name ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow/15 text-[11px] font-bold uppercase text-text-primary">
                {profile.name[0]}
              </span>
            ) : (
              <User className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
