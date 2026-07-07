import React from "react";
import Image from "next/image";

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/myfrido/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
        <defs>
          <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FD5949" />
            <stop offset="50%" stopColor="#D6249F" />
            <stop offset="100%" stopColor="#285AEB" />
          </linearGradient>
        </defs>
        <path
          fill="url(#instagram-gradient)"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/myfrido/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/myfrido",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
        <path
          fill="#0A66C2"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/frido_official",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] text-text-primary" aria-hidden="true">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    ),
  },
] as const;

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

        <div className="footer-socials mt-6 flex items-center justify-center gap-5">
          {SOCIAL_LINKS.map((soc) => (
            <a
              key={soc.label}
              href={soc.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={soc.label}
              className="inline-flex items-center justify-center rounded-sm opacity-90 transition-180 hover:opacity-100 hover:scale-105"
            >
              {soc.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
