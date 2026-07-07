import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ProfileProvider } from "@/hooks/useProfile";
import { ToastProvider } from "@/hooks/useToast";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "Frido Sales Assist",
  description:
    "Enterprise assistant app for retail team members, powered by Frido Design System.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Frido Dashboard",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFD200",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased text-text-primary min-h-screen">
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInUrl="/sign-in"
          signUpUrl="/sign-in"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <ProfileProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
              <Toast />
            </ToastProvider>
          </ProfileProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
