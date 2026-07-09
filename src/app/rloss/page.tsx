"use client";

import { useState, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db } from "@/lib/database";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/Card";
import { TextArea } from "@/components/Forms";
import { PrimaryButton, IconButton } from "@/components/Buttons";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RLossPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reason.trim()) {
      return toast("Please enter why we lost the sale", true);
    }

    setSaving(true);
    try {
      await db.post(
        {
          action: "rloss",
          category: "Other",
          product: "",
          reason: reason.trim(),
          objection: "",
          value: "",
          leadRegistered: "",
          notes: reason.trim(),
        },
        profile
      );

      toast("Lost sale logged. Thank you for the feedback.");
      setReason("");
    } catch {
      toast("Unable to save entry locally, please retry.", true);
    }
    setSaving(false);
  }, [reason, profile, toast]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Log a Lost Sale (R-Loss)</h2>
          <p className="fs-small text-text-secondary mt-0.5">
            Logging as <span className="font-semibold text-text-primary">{profile?.name || "N/A"}</span> · {profile?.store || "No Store"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Lost Sale Report Form"
          subtitle="Log non-converting customer interactions to build product stocking strategy and analyze competitor friction."
        />
        <CardBody className="space-y-4 pt-2">
          <TextArea
            label="Why did we lose the sale?"
            placeholder="Describe what happened (e.g., customer wanted a custom fabric, price comparison with competitor, size out of stock)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
          />
        </CardBody>
        <CardFooter className="justify-start">
          <PrimaryButton onClick={handleSubmit} disabled={saving} className="w-full">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Lost Sale"}
          </PrimaryButton>
        </CardFooter>
      </Card>
    </div>
  );
}
