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
import { Camera, Save, Trash2, ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * DSRPage component.
 * 
 * Metrics Formulas:
 * - CVR % = (Total Orders / New Walk-ins) * 100
 *   where Total Orders = CC Orders + Online Orders
 * 
 * - Captured Rate % = (Leads Captured / Non-Converting Walk-ins) * 100
 *   where Non-Converting Walk-ins = New Walk-ins - Total Orders
 */
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

  // Mobile Photos save popup states
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotImgUrl, setSnapshotImgUrl] = useState("");
  const [modalTitle, setModalTitle] = useState("Save DSR to Photos");

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

  const resetForm = () => {
    setCcOrders(0);
    setOnlineOrders(0);
    setNewWalkins(0);
    setOtherWalkins(0);
    setCashCounter(0);
    setReviewsTaken(0);
    setLeadsCaptured(0);
    setLastMonthRev(0);
    setNmToday(0);
    setNmMtd(0);
    setMToday(0);
    setMMtd(0);
    setSalesToday(0);
    setSalesMtd(0);
    setDate(getTodayDate());
  };

  // Populate form fields and open snapshot preview modal
  const loadSavedDsr = async (item: any) => {
    // Populate form states
    setDate(item.date || getTodayDate());
    setCcOrders(Number(item.ccOrders) || 0);
    setOnlineOrders(Number(item.onlineOrders) || 0);
    setNewWalkins(Number(item.newWalkins) || 0);
    setOtherWalkins(Number(item.otherWalkins) || 0);
    setCashCounter(Number(item.cashCounter) || 0);
    setReviewsTaken(Number(item.reviewsTaken) || 0);
    setLeadsCaptured(Number(item.leadsCaptured) || 0);
    setLastMonthRev(Number(item.lastMonthRev) || 0);
    
    // Mobility fields
    setNmToday(Number(item.nmToday) || 0);
    setNmMtd(Number(item.nmMtd) || 0);
    setMToday(Number(item.mToday) || 0);
    setMMtd(Number(item.mMtd) || 0);
    
    // Single fields
    setSalesToday(Number(item.salesToday) || 0);
    setSalesMtd(Number(item.salesMtd) || 0);
    
    if (isAdmin && item.store) {
      setSelectedStore(item.store);
    }

    setModalTitle("Review Saved DSR Report");
    toast("Generating review snapshot...");

    // Give React states time to flush/render the updated DOM table
    setTimeout(async () => {
      if (!captureRef.current) return;
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(captureRef.current, {
          backgroundColor: "#FFFFFF",
          scale: 2,
          logging: false,
        });

        const dataUrl = canvas.toDataURL("image/png");
        setSnapshotImgUrl(dataUrl);
        setShowSnapshotModal(true);
      } catch (e) {
        console.error(e);
        toast("Failed to render preview snapshot.", true);
      }
    }, 150);
  };

  const handleSnapshot = async (silent = false) => {
    if (!captureRef.current) return null;
    setSnapping(true);
    setModalTitle("Save DSR to Photos");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      
      if (!silent) {
        setSnapshotImgUrl(dataUrl);
        setShowSnapshotModal(true);
      }

      const storeClean = activeStore
        .split(",")[0]
        .trim()
        .replace(/\s+/g, "_");

      const filename = `DSR_${storeClean}_${date}.png`;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      
      // Auto-download to device
      if (blob) {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `DSR ${storeClean} ${date}`,
              text: `Frido DSR Report for ${storeClean} (${date})`
            });
            if (!silent) toast("Share sheet triggered! Select 'Save Image' to save to your photos.");
          } catch (e) {
            // User cancelled share or failed, fallback to direct download
            const link = document.createElement("a");
            link.download = filename;
            link.href = dataUrl;
            link.click();
          }
        } else {
          // Direct download if share not supported
          const link = document.createElement("a");
          link.download = filename;
          link.href = dataUrl;
          link.click();
          if (!silent) toast("Snapshot downloaded to your device.");
        }
      }
      setSnapping(false);
      return dataUrl;
    } catch {
      if (!silent) toast("Snapshot rendering failed.", true);
      setSnapping(false);
      return null;
    }
  };

  const handleSave = async () => {
    if (!activeStore)
      return toast(
        "Setup store profile before saving reports.",
        true
      );

    setSaving(true);
    try {
      // 0. Automatically capture and save the snapshot to the device
      await handleSnapshot(true); // silent capture

      // 1. Persist locally first so data is never lost
      db.saveLocal("dsr", {
        action: "dsr",
        date,
        store: activeStore,
        ...metrics,
        ts: new Date().toISOString(),
      });
      toast("DSR saved & Snapshot downloaded!");
      loadHistory();
      
      // Clean form values to default initial state
      resetForm();

      // 2. Submit remote Apps Script post in the background
      await db.post({
        action: "dsr",
        date,
        store: activeStore,
        ...metrics,
      });
    } catch {
      console.warn("Apps Script submission offline.");
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
        const isMob = isMobilityStore(item.store || "");
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
        <div className="flex justify-end gap-3 items-center">
          <button
            onClick={() => loadSavedDsr(item)}
            className="text-brand-yellow font-bold fs-caption hover:underline"
          >
            Review
          </button>
          <IconButton
            icon={<Trash2 className="w-4.5 h-4.5 text-red-500 hover:text-red-600" />}
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
            <div className="p-2 bg-white rounded-xs border border-border overflow-hidden" ref={captureRef}>
              {/* Exact Google Sheets Excel Style Grid Layout */}
              {isMobility ? (
                // ── Format for "Both" Category Stores (Non-Mobility + Mobility) ──
                <table className="w-full border-collapse border-2 border-black text-[13px] font-sans text-black select-none">
                  <thead>
                    <tr className="bg-[#FFD200] border-b-2 border-black">
                      <th colSpan={3} className="py-2.5 text-center font-bold text-[15px] tracking-wide text-black border-black">
                        DSR Format
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black w-2/5 text-left">Date</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{metrics.dateStr}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Store</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{storeNameShort}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left"></td>
                      <td className="font-bold bg-[#F5EBE6] p-1 border-r border-black text-center">Today</td>
                      <td className="font-bold bg-[#F5EBE6] p-1 text-center">MTD</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Non Mobility Sales</td>
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{formatNum(metrics.nmToday)}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatNum(metrics.nmMtd)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Mobility Sales</td>
                      <td className="p-2 border-r border-black text-center font-medium bg-white">
                        {metrics.mToday > 0 ? formatNum(metrics.mToday) : ""}
                      </td>
                      <td className="p-2 text-center font-medium bg-white">{formatNum(metrics.mMtd)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Orders</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">C&C</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Online</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.ccOrders}</td>
                      <td className="p-2 text-center font-medium bg-white">{metrics.onlineOrders}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Walk-ins</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">New</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Other</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.newWalkins}</td>
                      <td className="p-2 text-center font-medium bg-white">{metrics.otherWalkins}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Total Walkins</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{metrics.totalWalkins}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">CVR %</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatPct(metrics.cvrRate, 2)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Cash In Counter</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{formatNum(metrics.cashCounter)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Review Taken</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">Total</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Taken Rate</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.reviewsTaken}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatPct(metrics.reviewRate, 2)}</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Leads Captured</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">Total</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Capture Rate</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.leadsCaptured}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatPct(metrics.captureRate, 0)}</td>
                    </tr>
                    <tr className="bg-[#FFD200] border-b border-black">
                      <td colSpan={3} className="py-2.5 text-center font-bold text-[14px] text-black">
                        ★ Revenue Insights ★
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Last Month's Revenue</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.lastMonthRev)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Daily Average / Day</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.dailyAverage)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Projected Revenue</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.projectedRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                // ── Format for "Non Mobility" Category Stores (Sales Today/MTD only) ──
                <table className="w-full border-collapse border-2 border-black text-[13px] font-sans text-black select-none">
                  <thead>
                    <tr className="bg-[#FFD200] border-b-2 border-black">
                      <th colSpan={3} className="py-2.5 text-center font-bold text-[15px] tracking-wide text-black border-black">
                        DSR Format
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black w-2/5 text-left">Date</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{metrics.dateStr}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Store</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{storeNameShort}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Sales</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">Today</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">MTD</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{formatNum(metrics.salesToday)}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatNum(metrics.salesMtd)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Orders</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">C&C</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Online</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.ccOrders}</td>
                      <td className="p-2 text-center font-medium bg-white">{metrics.onlineOrders}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Walk-ins</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">New</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Other</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.newWalkins}</td>
                      <td className="p-2 text-center font-medium bg-white">{metrics.otherWalkins}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Total</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{metrics.totalWalkins}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">CVR %</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatPct(metrics.cvrRate, 2)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Cash In Counter</td>
                      <td colSpan={2} className="p-2 text-center font-medium bg-white">{formatNum(metrics.cashCounter)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">GMB Reviews taken</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">Total</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Taken Rate</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.reviewsTaken}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatPct(metrics.reviewRate, 0)}</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td rowSpan={2} className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left align-middle">Leads Captured</td>
                      <td className="bg-[#F5EBE6] p-1 border-r border-black text-center">Total</td>
                      <td className="bg-[#F5EBE6] p-1 text-center">Captured Rate</td>
                    </tr>
                    <tr className="border-b-2 border-black">
                      <td className="p-2 border-r border-black text-center font-medium bg-white">{metrics.leadsCaptured}</td>
                      <td className="p-2 text-center font-medium bg-white">{formatPct(metrics.captureRate, 0)}</td>
                    </tr>
                    <tr className="bg-[#FFD200] border-b border-black">
                      <td colSpan={3} className="py-2.5 text-center font-bold text-[14px] text-black">
                        ★ Revenue Insights ★
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Last Month's Revenue</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.lastMonthRev)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Daily Average / Day</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.dailyAverage)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="font-bold bg-[#F5EBE6] p-2 border-r border-black text-left">Projected Revenue</td>
                      <td colSpan={2} className="p-2 text-center font-bold bg-white">{formatNum(metrics.projectedRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <SecondaryButton onClick={() => void handleSnapshot()} disabled={snapping} className="flex-1">
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

      {/* Fullscreen Snapshot Modal for Mobile Photos Saving & Review */}
      {showSnapshotModal && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-bg-secondary w-full max-w-md rounded-sm overflow-hidden border border-border shadow-elevation flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-bg-primary">
              <span className="font-bold text-text-primary fs-body">{modalTitle}</span>
              <button 
                onClick={() => setShowSnapshotModal(false)}
                className="text-text-tertiary hover:text-text-primary transition-120"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center gap-3">
              <p className="fs-caption text-text-secondary text-center leading-normal">
                To save directly to your phone photos:<br />
                <b>1. Long press (tap and hold)</b> the image below.<br />
                <b>2. Tap &quot;Save Image&quot; or &quot;Add to Photos&quot;.</b>
              </p>
              {snapshotImgUrl && (
                <div className="border border-border rounded-xs overflow-hidden max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snapshotImgUrl} alt="DSR Snapshot" className="max-w-full h-auto object-contain bg-white" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border bg-bg-primary flex gap-3">
              <PrimaryButton 
                onClick={() => {
                  const link = document.createElement("a");
                  const storeClean = activeStore.split(",")[0].trim().replace(/\s+/g, "_");
                  link.download = `DSR_${storeClean}_${date}.png`;
                  link.href = snapshotImgUrl;
                  link.click();
                  toast("Direct download triggered.");
                }}
                className="flex-1"
              >
                Download Directly
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
