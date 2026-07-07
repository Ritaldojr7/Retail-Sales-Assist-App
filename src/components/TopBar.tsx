"use client";

import { useRouter } from "next/navigation";
import FridoLogo from "./FridoLogo";

export default function TopBar() {
  const router = useRouter();

  return (
    <header
      id="topbar"
      className="sticky top-0 z-50 flex items-center justify-center border-b border-border bg-bg/85 px-4 shadow-[0_1px_3px_rgba(16,24,32,0.02)]"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingTop: "calc(env(safe-area-inset-top) + 14px)",
        paddingBottom: "14px",
      }}
    >
      <button
        onClick={() => router.push("/")}
        className="flex items-center justify-center text-text hover:opacity-80 transition-opacity"
        aria-label="Home"
      >
        <FridoLogo width={85} height={28} />
      </button>
    </header>
  );
}
