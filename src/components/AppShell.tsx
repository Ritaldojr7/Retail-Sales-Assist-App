"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import SyncProfile from "./SyncProfile";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/sign-in");

  if (isAuthRoute) {
    return (
      <div className="mobile-shell">
        <main className="mobile-main auth-main">
          <div className="mobile-content">{children}</div>
          <Footer />
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-shell">
      <SyncProfile />
      <Header />
      <main className="mobile-main">
        <div className="mobile-content">{children}</div>
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
}
