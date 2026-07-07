import React from "react";

interface ButtonBaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function PrimaryButton({
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonBaseProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 h-11 px-6 rounded-sm font-semibold fs-body transition-180 focus-ring cursor-pointer
        bg-brand-yellow text-[#0A0A0A] shadow-sm
        hover:translate-y-[-2px] hover:shadow-md hover:brightness-95
        active:scale-[0.98] active:translate-y-0
        disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none
        ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonBaseProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 h-11 px-6 rounded-sm font-semibold fs-body transition-180 focus-ring cursor-pointer
        border border-border bg-bg-secondary text-text-primary shadow-sm
        hover:bg-bg-tertiary hover:translate-y-[-1px]
        active:scale-[0.98] active:translate-y-0
        disabled:opacity-50 disabled:pointer-events-none
        ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-text-secondary/20 border-t-text-primary rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonBaseProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 h-10 px-4 rounded-sm font-medium fs-body transition-120 focus-ring cursor-pointer
        bg-transparent text-text-secondary
        hover:bg-border/40 hover:text-text-primary
        active:scale-[0.98]
        disabled:opacity-40 disabled:pointer-events-none
        ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-text-secondary/20 border-t-text-secondary rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export function DestructiveButton({
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonBaseProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 h-11 px-6 rounded-sm font-semibold fs-body transition-180 focus-ring cursor-pointer
        bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400
        hover:brightness-95 hover:translate-y-[-1px]
        active:scale-[0.98] active:translate-y-0
        disabled:opacity-50 disabled:pointer-events-none
        ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  className?: string;
}

export function IconButton({ icon, className = "", ...props }: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center w-9 h-9 rounded-sm border border-border bg-bg-secondary text-text-secondary transition-120 focus-ring cursor-pointer
        hover:bg-bg-tertiary hover:text-text-primary
        active:scale-95
        disabled:opacity-40 disabled:pointer-events-none
        ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
