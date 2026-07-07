"use client";

import { useState, useCallback, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { CONFIG, db } from "@/lib/database";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/Card";
import { InputField, TextArea } from "@/components/Forms";
import { PrimaryButton, IconButton } from "@/components/Buttons";
import ChipGroup, { ChipGroupRef } from "@/components/ChipGroup";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RLossPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [categories, setCategories] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [product, setProduct] = useState("");
  const [objection, setObjection] = useState("");
  const [value, setValue] = useState("");
  const [leadRegistered, setLeadRegistered] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Refs for resetting chipgroups
  const categoriesRef = useRef<ChipGroupRef>(null);
  const reasonsRef = useRef<ChipGroupRef>(null);
  const valuesRef = useRef<ChipGroupRef>(null);
  const leadsRef = useRef<ChipGroupRef>(null);

  const showObjection = reason === "Couldn't handle objection";

  const handleSubmit = useCallback(async () => {
    if (!categories.length)
      return toast("Select at least one product category", true);
    if (!reason)
      return toast("Select why this sale was lost", true);

    setSaving(true);
    try {
      await db.post(
        {
          action: "rloss",
          category: categories.join(", "),
          product,
          reason,
          objection,
          value,
          leadRegistered,
          notes,
        },
        profile
      );

      toast("Lost sale logged. Thank you for the feedback.");
      
      // Reset form
      setCategories([]);
      setReason("");
      setProduct("");
      setObjection("");
      setValue("");
      setLeadRegistered("");
      setNotes("");

      categoriesRef.current?.reset();
      reasonsRef.current?.reset();
      valuesRef.current?.reset();
      leadsRef.current?.reset();
    } catch {
      toast("Unable to save entry locally, please retry.", true);
    }
    setSaving(false);
  }, [
    categories,
    reason,
    product,
    objection,
    value,
    leadRegistered,
    notes,
    profile,
    toast,
  ]);

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
          {/* Categories ChipGroup */}
          <div className="flex flex-col">
            <span className="fs-small font-semibold text-text-primary mb-1">
              Product Category <span className="text-text-tertiary fs-caption font-medium uppercase tracking-wide">(Select all that apply)</span>
            </span>
            <ChipGroup
              ref={categoriesRef}
              items={CONFIG.RLOSS_CATEGORIES}
              isMulti
              onChange={(v) => setCategories(v as string[])}
            />
          </div>

          <InputField
            label="Specific Model / Variant (optional)"
            type="text"
            placeholder="e.g. ErgoLuxe Pro Medium, Cushions M"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />

          {/* Reason ChipGroup */}
          <div className="flex flex-col">
            <span className="fs-small font-semibold text-text-primary mb-1">Reason for Loss</span>
            <ChipGroup
              ref={reasonsRef}
              items={CONFIG.RLOSS_REASONS}
              onChange={(v) => setReason(v as string)}
            />
          </div>

          {showObjection && (
            <TextArea
              label="Customer Objection Details"
              placeholder="Write down exact details of customer concern..."
              value={objection}
              onChange={(e) => setObjection(e.target.value)}
            />
          )}

          {/* Value ChipGroup */}
          <div className="flex flex-col">
            <span className="fs-small font-semibold text-text-primary mb-1">Estimated Value</span>
            <ChipGroup
              ref={valuesRef}
              items={CONFIG.RLOSS_VALUES}
              onChange={(v) => setValue(v as string)}
            />
          </div>

          {/* Lead registered ChipGroup */}
          <div className="flex flex-col">
            <span className="fs-small font-semibold text-text-primary mb-1">Lead Registered?</span>
            <ChipGroup
              ref={leadsRef}
              items={["Yes", "No"]}
              onChange={(v) => setLeadRegistered(v as string)}
            />
          </div>

          <TextArea
            label="Additional Context (optional)"
            placeholder="Competitor comparisons, specific custom options requested..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
