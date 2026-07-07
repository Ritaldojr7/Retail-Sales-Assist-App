import React from "react";

interface FridoLogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: "default" | "footer";
}

export default function FridoLogo({
  className = "",
  width = 85,
  height = 30,
  variant = "default",
}: FridoLogoProps) {
  const src = variant === "footer" ? "/footer_logo.png" : "/logo.png";
  return (
    <img
      src={src}
      alt="Frido Logo"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      style={{
        height: height ? `${height}px` : "auto",
        width: width ? `${width}px` : "auto",
      }}
    />
  );
}
