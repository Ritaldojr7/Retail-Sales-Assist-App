"use client";

import { useToast } from "@/hooks/useToast";

export default function Toast() {
  const { message, isError, visible } = useToast();

  return (
    <div
      id="toast"
      role="status"
      className={`fixed left-1/2 z-[1000] max-w-[88vw] px-5 py-3 text-center text-sm font-semibold tracking-wide shadow-lg transition-all duration-200 ease-out rounded-r-pill ${
        visible
          ? "translate-x-[-50%] translate-y-0 opacity-100"
          : "translate-x-[-50%] translate-y-8 opacity-0"
      } ${
        isError
          ? "bg-danger text-white"
          : "bg-primary text-on-primary"
      }`}
      style={{
        bottom: "80px",
      }}
    >
      {message}
    </div>
  );
}
