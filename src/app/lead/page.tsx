"use client";

import { useState } from "react";
import { CONFIG } from "@/lib/database";
import Card, { CardHeader, CardBody } from "@/components/Card";
import { IconButton } from "@/components/Buttons";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LeadPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const isConfigured = !CONFIG.ZOHO_FORM_URL.startsWith("PASTE");

  return (
    <div className="space-y-6">
      {/* Header back navigation */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Register a Lead</h2>
          <p className="fs-small text-text-secondary mt-0.5">Fill customer information directly into the Zoho CRM Lead pipeline.</p>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <CardHeader
          title="Frido Connect Form"
          subtitle="Enterprise Customer CRM Capture"
          className="p-6 border-b border-border bg-bg-tertiary/40 m-0"
        />
        <div className="relative min-h-[550px] w-full bg-bg-secondary">
          {isConfigured ? (
            <>
              {!mounted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-secondary z-10">
                  <span className="w-8 h-8 border-2 border-text-secondary/20 border-t-brand-yellow rounded-full animate-spin" />
                  <span className="fs-small font-semibold text-text-secondary">Loading Zoho Portal...</span>
                </div>
              )}
              <iframe
                src={CONFIG.ZOHO_FORM_URL}
                title="Register a lead"
                allow="camera; microphone"
                onLoad={() => setMounted(true)}
                className="w-full min-h-[550px] border-none"
                style={{ display: mounted ? "block" : "none" }}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-text-tertiary fs-body font-semibold">
              <p>Zoho Lead CRM Form link is not connected yet.</p>
              <p className="fs-caption mt-2 font-mono text-text-tertiary/80">
                Configure the ZOHO_FORM_URL property inside src/lib/database.ts
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
