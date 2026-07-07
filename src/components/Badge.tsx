import React from "react";

export type BadgeVariant = "yellow" | "blue" | "green" | "red" | "gray";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  const variantStyles = {
    yellow: "bg-[rgba(230,189,0,0.12)] text-[#E6BD00] dark:bg-[rgba(255,210,0,0.12)] dark:text-[#FFD200]",
    blue: "bg-brand-blue/12 text-brand-blue",
    green: "bg-[rgba(16,185,129,0.12)] text-[#10B981]",
    red: "bg-[rgba(239,68,68,0.12)] text-[#EF4444]",
    gray: "bg-text-secondary/12 text-text-secondary",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full fs-caption font-semibold uppercase tracking-wider ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
