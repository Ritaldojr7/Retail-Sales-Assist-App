"use client";

import BackButton from "./BackButton";

interface ViewHeaderProps {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
}

export default function ViewHeader({
  title,
  icon,
  subtitle,
}: ViewHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div className="flex-none grid h-9 w-9 place-items-center rounded-r-md bg-primary/12 text-primary [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.5px]">
          {icon}
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight text-text leading-tight">
          {title}
        </h1>
      </div>
      {subtitle && (
        <p className="text-sm font-body text-text-muted mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}
