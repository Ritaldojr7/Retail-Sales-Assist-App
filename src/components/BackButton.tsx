"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      className="inline-flex items-center gap-1 rounded-r-pill border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:bg-border active:scale-95"
      aria-label="Go back"
      onClick={() => router.back()}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}
