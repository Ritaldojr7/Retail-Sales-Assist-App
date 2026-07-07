"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db, ALL_STORES_LIST } from "@/lib/database";
import { isAdminProfile } from "@/lib/admin-auth";
import {
  calculateDSRMetrics,
  isMobilityStore,
  formatNum,
  formatPct,
  getTodayDate,
} from "@/lib/dsr-utils";
import type { DSRFormValues, DSRMetrics } from "@/lib/types";
import Card, { CardHeader, CardBody } from "@/components/Card";
import { InputField, SelectField } from "@/components/Forms";
import { PrimaryButton, SecondaryButton, IconButton } from "@/components/Buttons";
import DataTable from "@/components/DataTable";
import { Camera, Save, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DSRPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();
  const captureRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminProfile(profile);
  const [selectedStore, setSelectedStore] = useState("");
  const activeStore = isAdmin ? selectedStore : profile?.store || "";
  const isMobility = isMobilityStore(activeStore);

  // Form State
  const [date, setDate] = useState(getTodayDate());
  const [ccOrders, setCcOrders] = useState(0);
  const [onlineOrders, setOnlineOrders] = useState(0);
  const [newWalkins, setNewWalkins] = useState(0);
  const [otherWalkins, setOtherWalkins] = useState(0);
  const [cashCounter, setCashCounter] = useState(0);
  const [reviewsTaken, setReviewsTaken] = useState(0);
  const [leadsCaptured, setLeadsCaptured] = useState(0);
  const [lastMonthRev, setLastMonthRev] = useState(0);
  // Mobility fields
  const [nmToday, setNmToday] = useState(0);
  const [nmMtd, setNmMtd] = useState(0);
  const [mToday, setMToday] = useState(0);
  const [mMtd, setMMtd] = useState(0);
  // Single fields
  const [salesToday, setSalesToday] = useState(0);
  const [salesMtd, setSalesMtd] = useState(0);

  const [saving, setSaving] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistoryItems(db.getLocalList("dsr"));
  };

  const getFormValues = useCallback(
    (): DSRFormValues => ({
      date,
      ccOrders,
      onlineOrders,
      newWalkins,
      otherWalkins,
      cashCounter,
      reviewsTaken,
      leadsCaptured,
      lastMonthRev,
      nmToday,
      nmMtd,
      mToday,
      mMtd,
      salesToday,
      salesMtd,
    }),
    [
      date,
      ccOrders,
      onlineOrders,
      newWalkins,
      otherWalkins,
      cashCounter,
      reviewsTaken,
      leadsCaptured,
      lastMonthRev,
      nmToday,
      nmMtd,
      mToday,
      mMtd,
      salesToday,
      salesMtd,
    ]
  );

  const metrics: DSRMetrics = calculateDSRMetrics(
    getFormValues(),
    activeStore
  );

  const storeNameShort = activeStore.includes("Sky City Mall")
    ? "Skycity"
    : activeStore.split(",")[0];

  const handleSnapshot = async () => {
    if (!captureRef.current) return;
    setSnapping(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        logging: false,
      });

      const link = document.createElement("a");
      const storeClean = activeStore
        .split(",")[0]
        .trim()
        .replace(/\s+/g, "_");
      link.download = `DSR_${storeClean}_${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("DSR Snapshot captured & downloaded successfully!");
    } catch {
      toast("Snapshot rendering failed.", true);
    }
    setSnapping(false);
  };

  const handleSave = async () => {
    if (!activeStore)
      return toast(
        "Setup store profile before saving reports.",
        true
      );

    setSaving(true);
    try {
      await db.post({
        action: "dsr",
        date,
        store: activeStore,
        ...metrics,
      });
      toast("DSR numbers successfully stored locally!");
      loadHistory();
    } catch {
      toast("Unable to save DSR metrics.", true);
    }
    setSaving(false);
  };

  const handleDelete = (ts: string) => {
    if (confirm("Delete this saved DSR log entry?")) {
      db.deleteLocalItem("dsr", ts);
      toast("DSR log deleted.");
      loadHistory();
    }
  };

  // DataTable column maps
  const columns = [
    {
      header: "Store",
      accessor: (item: any) => (
        <span className="font-semibold text-text-primary">
          {(item.store as string)?.split(",")[0] || "Store"}
        </span>
      ),
    },
    {
      header: "Reporting Date",
      accessor: (item: any) => {
        const dateFormatted = (item.date as string)?.split("-").reverse().join("-");
        return <span className="text-text-secondary">{dateFormatted}</span>;
      },
    },
    {
      header: "MTD Revenue",
      accessor: (item: any) => {
        const isMob =
          (item.store as string)?.includes("Sky City Mall") ||
          (item.store as string)?.toLowerCase().includes("skycity");
        const totalRev = isMob
          ? (Number(item.nmMtd) || 0) + (Number(item.mMtd) || 0)
          : Number(item.salesMtd) || 0;
        return <span className="font-bold text-text-primary">₹{totalRev.toLocaleString("en-IN")}</span>;
      },
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (item: any) => (
        <div className="flex justify-end">
          <IconButton
            icon={<Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />}
            title="Delete log"
            onClick={() => handleDelete(item.ts as string)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header card with back button */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">DSR Creation & Tracking</h2>
          <p className="fs-small text-text-secondary mt-0.5">
            Logging as <span className="font-semibold text-text-primary">{profile?.name || "N/A"}</span> · {activeStore || "No Store Selected"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Form inputs */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Report Fields" subtitle="Input your daily performance values and targets." />
            <CardBody className="space-y-4 pt-2">
              {isAdmin && (
                <SelectField
                  label="Store"
                  required
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  options={ALL_STORES_LIST.map((store) => ({
                    label: store,
                    value: store,
                  }))}
                  placeholder="Select store"
                />
              )}
              <InputField
                label="Reporting Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              {isMobility ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Non Mobility Today (₹)"
                      type="number"
                      value={nmToday}
                      min={0}
                      onChange={(e) => setNmToday(Number(e.target.value) || 0)}
                    />
                    <InputField
                      label="Non Mobility MTD (₹)"
                      type="number"
                      value={nmMtd}
                      min={0}
                      onChange={(e) => setNmMtd(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Mobility Today (₹)"
                      type="number"
                      value={mToday}
                      min={0}
                      onChange={(e) => setMToday(Number(e.target.value) || 0)}
                    />
                    <InputField
                      label="Mobility MTD (₹)"
                      type="number"
                      value={mMtd}
                      min={0}
                      onChange={(e) => setMMtd(Number(e.target.value) || 0)}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Sales Today (₹)"
                    type="number"
                    value={salesToday}
                    min={0}
                    onChange={(e) => setSalesToday(Number(e.target.value) || 0)}
                  />
                  <InputField
                    label="Sales MTD (₹)"
                    type="number"
                    value={salesMtd}
                    min={0}
                    onChange={(e) => setSalesMtd(Number(e.target.value) || 0)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="C&C Orders"
                  type="number"
                  value={ccOrders}
                  min={0}
                  onChange={(e) => setCcOrders(Number(e.target.value) || 0)}
                />
                <InputField
                  label="Online Orders"
                  type="number"
                  value={onlineOrders}
                  min={0}
                  onChange={(e) => setOnlineOrders(Number(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="New Walk-ins"
                  type="number"
                  value={newWalkins}
                  min={0}
                  onChange={(e) => setNewWalkins(Number(e.target.value) || 0)}
                />
                <InputField
                  label="Other Walk-ins"
                  type="number"
                  value={otherWalkins}
                  min={0}
                  onChange={(e) => setOtherWalkins(Number(e.target.value) || 0)}
                />
              </div>

              <InputField
                label="Cash In Counter (₹)"
                type="number"
                value={cashCounter}
                min={0}
                onChange={(e) => setCashCounter(Number(e.target.value) || 0)}
              />

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Reviews Taken"
                  type="number"
                  value={reviewsTaken}
                  min={0}
                  onChange={(e) => setReviewsTaken(Number(e.target.value) || 0)}
                />
                <InputField
                  label="Leads Captured"
                  type="number"
                  value={leadsCaptured}
                  min={0}
                  onChange={(e) => setLeadsCaptured(Number(e.target.value) || 0)}
                />
              </div>

              <InputField
                label="Last Month's Revenue Reference (₹)"
                type="number"
                value={lastMonthRev}
                min={0}
                onChange={(e) => setLastMonthRev(Number(e.target.value) || 0)}
              />
            </CardBody>
          </Card>
        </div>

        {/* Preview & actions */}
        <div className="space-y-6">
          <Card>
            <div className="p-1 border border-border rounded-sm bg-bg-secondary" ref={captureRef}>
              <div className="w-full bg-[#FFD200] text-[#0A0A0A] py-2 px-3 text-center fs-caption font-bold uppercase tracking-wider rounded-t-[4px]">
                DSR Format Log
              </div>
              <div className="p-4 space-y-3.5 fs-body text-text-primary">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-text-secondary">Date:</span>
                  <span className="font-semibold">{metrics.dateStr}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-text-secondary">Store:</span>
                  <span className="font-semibold">{storeNameShort}</span>
                </div>

                <div className="pt-2">
                  <div className="grid grid-cols-3 fs-small text-text-secondary font-semibold pb-1.5 uppercase tracking-wide">
                    <span>Metric</span>
                    <span className="text-right">Today</span>
                    <span className="text-right">MTD</span>
                  </div>

                  {isMobility ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 border-b border-border/60 py-1">
                        <span className="text-text-secondary fs-small">Non Mobility</span>
                        <span className="text-right font-medium">{formatNum(metrics.nmToday)}</span>
                        <span className="text-right font-medium">{formatNum(metrics.nmMtd)}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-border/60 py-1">
                        <span className="text-text-secondary fs-small">Mobility</span>
                        <span className="text-right font-medium">{metrics.mToday > 0 ? formatNum(metrics.mToday) : "—"}</span>
                        <span className="text-right font-medium">{formatNum(metrics.mMtd)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 border-b border-border/60 py-1">
                      <span className="text-text-secondary fs-small">Sales Revenue</span>
                      <span className="text-right font-medium">{formatNum(metrics.salesToday)}</span>
                      <span className="text-right font-medium">{formatNum(metrics.salesMtd)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">Orders (CC/Online)</span>
                    <span className="text-right font-medium">{metrics.ccOrders}</span>
                    <span className="text-right font-medium">{metrics.onlineOrders}</span>
                  </div>

                  <div className="grid grid-cols-3 border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">Walkins (New/Other)</span>
                    <span className="text-right font-medium">{metrics.newWalkins}</span>
                    <span className="text-right font-medium">{metrics.otherWalkins}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">Conversion (CVR %)</span>
                    <span className="font-bold">{formatPct(metrics.cvrRate, 2)}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">Cash in Counter</span>
                    <span className="font-bold">{formatNum(metrics.cashCounter)}</span>
                  </div>

                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">{isMobility ? "Reviews Taken" : "GMB Reviews"}</span>
                    <span className="font-semibold">{metrics.reviewsTaken} ({formatPct(metrics.reviewRate, isMobility ? 2 : 0)})</span>
                  </div>

                  <div className="flex justify-between border-b border-border/60 py-2">
                    <span className="text-text-secondary fs-small">Leads Captured</span>
                    <span className="font-semibold">{metrics.leadsCaptured} ({formatPct(metrics.captureRate, 0)})</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1">
                  <div className="flex justify-between fs-small text-text-secondary">
                    <span>Last Month Rev:</span>
                    <span>{formatNum(metrics.lastMonthRev)}</span>
                  </div>
                  <div className="flex justify-between fs-small text-text-secondary">
                    <span>Daily Avg/Day:</span>
                    <span>{formatNum(metrics.dailyAverage)}</span>
                  </div>
                  <div className="flex justify-between fs-body font-bold text-text-primary pt-1.5 border-t border-border">
                    <span>Projected Revenue:</span>
                    <span>{formatNum(metrics.projectedRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <SecondaryButton onClick={handleSnapshot} disabled={snapping} className="flex-1">
                <Camera className="w-4 h-4" />
                {snapping ? "Capturing..." : "Snapshot"}
              </SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save DSR"}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>

      {/* History table */}
      <div>
        <h3 className="fs-section font-bold text-text-primary mb-4 tracking-tight uppercase">DSR Log History</h3>
        <DataTable
          data={[...historyItems].reverse()}
          columns={columns}
          searchPlaceholder="Search DSR logs..."
          searchKey={(item) => item.store || ""}
          emptyMessage="No saved DSR submissions found."
        />
      </div>
    </div>
  );
}
