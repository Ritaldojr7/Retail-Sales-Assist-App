import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ProfileProvider } from "@/hooks/useProfile";
import { ToastProvider } from "@/hooks/useToast";
import { WidgetProvider } from "@/hooks/useWidgets";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import RegisterPwa from "@/components/RegisterPwa";


export const metadata: Metadata = {
  title: "Frido Sales Assist",
  description:
    "Enterprise assistant app for retail team members, powered by Frido Design System.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Frido",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased text-text-primary min-h-screen">
        <RegisterPwa />
        <ClerkProvider
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInUrl="/sign-in"
          signUpUrl="/sign-in"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <ProfileProvider>
            <ToastProvider>
              <WidgetProvider>
                <AppShell>{children}</AppShell>
                <Toast />
              </WidgetProvider>
            </ToastProvider>
          </ProfileProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
