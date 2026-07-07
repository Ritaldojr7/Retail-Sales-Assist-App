"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db, ALL_STORES_LIST } from "@/lib/database";
import { isAdminProfile } from "@/lib/admin-auth";
import { getTodayDate } from "@/lib/dsr-utils";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/Card";
import { InputField, SelectField, TextArea } from "@/components/Forms";
import { PrimaryButton, IconButton } from "@/components/Buttons";
import { ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FootfallPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [storeName, setStoreName] = useState(profile?.store || "");
  const [managerName, setManagerName] = useState(profile?.name || "");
  const [date, setDate] = useState(getTodayDate());
  const [count, setCount] = useState("");
  const [salesDone, setSalesDone] = useState("");
  const [anomaly, setAnomaly] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!storeName)
      return toast("Please select a Store Name.", true);
    if (!managerName.trim())
      return toast("Please enter the Store Manager Name.", true);
    if (!date) return toast("Please select a Date.", true);
    if (!count || Number(count) < 0)
      return toast("Please enter a valid Footfall Count.", true);
    if (!salesDone || Number(salesDone) < 0)
      return toast(
        "Please enter the Sales Done till now.",
        true
      );

    setSubmitting(true);
    try {
      await db.post({
        action: "footfall",
        storeName,
        managerName: managerName.trim(),
        date,
        count: Number(count),
        salesDone: Number(salesDone),
        anomaly: anomaly.trim(),
        remarks: remarks.trim(),
      });
      toast("Footfall Form submitted successfully!");
      setCount("");
      setSalesDone("");
      setAnomaly("");
      setRemarks("");
    } catch {
      toast("Failed to submit Footfall Form. Try again.", true);
    }
    setSubmitting(false);
  };

  const isAdmin = isAdminProfile(profile);
  const storeOptions = isAdmin
    ? ALL_STORES_LIST.map((store) => ({ label: store, value: store }))
    : profile?.store
      ? [{ label: profile.store, value: profile.store }]
      : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Back Button Row */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Mid-Day Footfall Reporting</h2>
          <p className="fs-small text-text-secondary mt-0.5">To Be Filled by all the Store Managers</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Footfall Form"
          subtitle="Record midday footfall traffic, conversions, store performance anomalies or general sales remarks."
        />
        <CardBody className="space-y-4 pt-2">
          <SelectField
            label="Store Name"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            options={storeOptions}
            placeholder={isAdmin ? "Select store" : "Your store"}
            disabled={!isAdmin}
          />

          <InputField
            label="Store Manager Name"
            required
            type="text"
            placeholder="Manager's Full Name"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
          />

          <InputField
            label="Reporting Date"
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <InputField
            label="Footfall Count (Till Mid-day) - 11am to 5pm"
            required
            type="number"
            placeholder="Enter count"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />

          <InputField
            label="Sales Done till now"
            required
            type="number"
            placeholder="Enter sales value"
            min={0}
            value={salesDone}
            onChange={(e) => setSalesDone(e.target.value)}
          />

          <TextArea
            label="Any footfall anomaly or reason for high/low traffic?"
            placeholder="Enter details here"
            value={anomaly}
            onChange={(e) => setAnomaly(e.target.value)}
          />

          <TextArea
            label="Remarks (if Any)"
            placeholder="Enter comments here"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </CardBody>
        <CardFooter className="justify-start">
          <PrimaryButton onClick={handleSubmit} disabled={submitting} className="w-full">
            <Send className="w-4 h-4" />
            {submitting ? "Submitting..." : "Submit Form"}
          </PrimaryButton>
        </CardFooter>
      </Card>
    </div>
  );
}
