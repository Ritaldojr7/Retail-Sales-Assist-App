import React from "react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-border bg-bg-primary mt-auto">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(230, 189, 0, 0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 py-10 text-center">
        <div className="flex w-full justify-center">
          <Image
            src="/footer_logo.png"
            alt="Frido"
            width={140}
            height={52}
            className="footer-logo mx-auto h-10 w-auto object-contain"
            priority={false}
          />
        </div>

        <p className="mt-5 fs-caption font-medium uppercase tracking-[0.12em] text-text-tertiary">
          © 2026 ALL RIGHTS RESERVED.
        </p>

        <p className="mt-4 fs-h3 font-semibold tracking-tight text-text-primary">
          Freedom To Do More
        </p>
      </div>
    </footer>
  );
}
