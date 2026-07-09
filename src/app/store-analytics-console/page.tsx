"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db } from "@/lib/database";
import { EMBEDDED_DATA } from "@/lib/embedded-fallback";
import { mapProfileStoreToSheetStore } from "@/lib/store-auth";
import { isAdminEmail } from "@/lib/admin-auth";
import Card, { CardHeader, CardBody } from "@/components/Card";
import Badge from "@/components/Badge";
import { SelectField, InputField } from "@/components/Forms";
import { PrimaryButton, IconButton } from "@/components/Buttons";
import {
  ArrowLeft,
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  LineChart as LineChartIcon,
  Users,
  Activity,
  Percent,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Award,
  ShoppingBag,
  CreditCard,
  Plus,
  Minus,
  ExternalLink,
  HelpCircle,
  Truck,
  RotateCcw,
  Sliders,
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Chart, registerables } from "chart.js";

// Register Chart.js elements
if (typeof window !== "undefined") {
  Chart.register(...registerables);
}

// Config
const CONFIG = {
  csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS49KFrVCMjCXkYOoUUkQ8b3xM9wKNbwmf2gHWUsQ_kV2eLwt4qqf-stWf2RQ27iT11f4v3s53oN9i3/pub?gid=0&single=true&output=csv",
  refreshMs: 5 * 60 * 1000,
  defaultDailyTarget: 20000,
  defaultMonthlyTarget: 500000,
  thresholds: { discountPct: 12, returnRatePct: 5, aovBenchmark: 1800, empRevBenchmark: 60000, newCustTarget: 30 },
  healthWeights: { revenue: 35, orders: 20, aov: 10, discount: 10, returns: 10, customer: 10, employee: 5 }
};

interface DashboardRow {
  idx: number;
  orderId: string;
  date: Date | null;
  type: string;
  otRaw: string;
  product: string;
  variant: string;
  size: string;
  sku: string;
  qty: number;
  retQty: number;
  mrp: number;
  rev: number;
  retAmt: number;
  coupon: number;
  combo: number;
  priceAdj: number;
  freebie: number;
  discount: number;
  couponName: string;
  store: string;
  emp: string;
  empId: string;
  custKey: string;
  custName: string;
  newCust: boolean;
  source: string;
  heard: string;
  payment: string;
  payRaw: string;
  retReason: string;
}

// Reusable Chart Component
interface ChartProps {
  type: string;
  data: any;
  options?: any;
  height?: number;
}

function ChartCanvas({ type, data, options, height = 200 }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(canvasRef.current, {
      type: type as any,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: options?.plugins?.legend?.display !== false,
            position: options?.plugins?.legend?.position || "top",
            labels: {
              boxWidth: 12,
              font: { size: 10 }
            }
          },
          tooltip: {
            callbacks: options?.plugins?.tooltip?.callbacks
          }
        },
        scales: options?.scales || {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { grid: { color: "rgba(10, 10, 10, 0.04)" }, ticks: { font: { size: 9 } } }
        },
        ...options
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [type, data, options]);

  return (
    <div style={{ height: `${height}px`, width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function StoreAnalyticsConsolePage() {
  const { profile, isReady } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  // Authentication status
  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.isAdmin || isAdminEmail(profile.email || "");
  }, [profile]);

  // Console active tab: HO vs Manager
  const [activeConsole, setActiveConsole] = useState<"ho" | "manager">("manager");

  // Load active console default
  useEffect(() => {
    if (isReady && profile) {
      setActiveConsole(isAdmin ? "ho" : "manager");
    }
  }, [isReady, profile, isAdmin]);

  // Main operational state
  const [masterRows, setMasterRows] = useState<DashboardRow[]>([]);
  const [dataSource, setDataSource] = useState<"live" | "embedded">("embedded");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingText, setRefreshingText] = useState("Refresh");

  // Filter States
  const [period, setPeriod] = useState<"today" | "yesterday" | "month" | "7d" | "30d" | "custom">("today");
  const [channel, setChannel] = useState<"all" | "Offline" | "Online">("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Sub-pages state (Manager has limited options)
  const [activePage, setActivePage] = useState<string>("sales");

  // Dynamically load default tab based on console
  useEffect(() => {
    if (activeConsole === "ho") {
      setActivePage("home");
    } else {
      setActivePage("sales");
    }
  }, [activeConsole]);

  // Helper date parsers
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  // Convert embedded fallback
  const getNormEmbedded = () => {
    const now = new Date();
    return EMBEDDED_DATA.map((r, i) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - r._d);
      dt.setHours(r._h, r._m, 0, 0);
      return buildRow(r, dt, i, true);
    });
  };

  // Parse local storage targets
  const getLocalStoragePlan = (st: string) => {
    if (typeof window === "undefined") return null;
    try {
      const v = localStorage.getItem(`frido_plan_${st}`);
      if (v) return JSON.parse(v);
    } catch (e) {}
    return null;
  };

  const saveLocalStoragePlan = (st: string, target: number, growth: number, note = "", holidays = 0) => {
    if (typeof window === "undefined") return;
    try {
      const p = getLocalStoragePlan(st) || { suggested: target, at: new Date().toISOString(), history: [] };
      const updated = new Date().toISOString();
      p.target = target;
      p.growth = growth;
      p.holidays = holidays;
      p.updated = updated;
      p.history = [{ target, growth, by: isAdmin ? "Head Office" : "Store Manager", at: updated, note }].concat(p.history || []).slice(0, 15);
      
      localStorage.setItem(`frido_plan_${st}`, JSON.stringify(p));

      // Sync monthly target
      const tgtVal = localStorage.getItem(`frido_tgt_${st}`);
      const t = tgtVal ? JSON.parse(tgtVal) : {};
      t.monthly = target;
      localStorage.setItem(`frido_tgt_${st}`, JSON.stringify(t));
      
      toast("Target saved successfully.");
    } catch (e) {
      toast("Failed to save target planner values.", true);
    }
  };

  const getTarget = (st: string) => {
    if (typeof window === "undefined") return { daily: CONFIG.defaultDailyTarget, monthly: CONFIG.defaultMonthlyTarget };
    let daily = CONFIG.defaultDailyTarget;
    try {
      const v = localStorage.getItem(`frido_tgt_${st}`);
      if (v) {
        const parsed = JSON.parse(v);
        if (parsed.daily) daily = parsed.daily;
      }
    } catch (e) {}
    
    const plan = getLocalStoragePlan(st);
    const monthly = plan?.target || CONFIG.defaultMonthlyTarget;
    return { daily, monthly };
  };

  // Live Sync CSV data
  const fetchLive = useCallback((manual = false) => {
    if (manual) {
      setIsRefreshing(true);
      setRefreshingText("Refreshing...");
    }
    Papa.parse(CONFIG.csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setIsRefreshing(false);
        setRefreshingText("Refresh");
        try {
          const rawData = res.data || [];
          const dateDayFirst = detectDateOrder(rawData.map((r: any) => r["POS Created At"] || r["Shopify Created At"]));
          const parsed = rawData.map((r: any, i: number) => {
            const dt = parseDate(r["POS Created At"], dateDayFirst) || parseDate(r["Shopify Created At"], dateDayFirst);
            return buildRow(r, dt, i, dateDayFirst);
          }).filter((r) => r.store);

          if (parsed.length) {
            setMasterRows(parsed);
            setDataSource("live");
            setLastRefresh(new Date());
            if (manual) {
              toast("Operational data refreshed successfully.");
            }
          } else if (manual) {
            toast("No live rows found in spreadsheet.", true);
          }
        } catch (e) {
          console.error(e);
          if (manual) toast("Failed to parse sheet columns.", true);
        }
      },
      error: (err) => {
        setIsRefreshing(false);
        setRefreshingText("Refresh");
        if (manual) {
          toast("Live sync offline. Using embedded demo.", true);
        }
      }
    });
  }, [toast]);

  // Initial load
  useEffect(() => {
    const embedded = getNormEmbedded();
    setMasterRows(embedded);
    fetchLive(false);
  }, [fetchLive]);

  // Unique lists of stores present in operational database
  const sheetStoreList = useMemo(() => {
    return [...new Set(masterRows.map((r) => r.store).filter(Boolean))].sort();
  }, [masterRows]);

  // Map the Clerk profile store to Google Sheets stores
  const mappedStore = useMemo(() => {
    if (!profile?.store || !sheetStoreList.length) return "";
    return mapProfileStoreToSheetStore(profile.store, sheetStoreList);
  }, [profile?.store, sheetStoreList]);

  // Set initial selectedStore for manager
  useEffect(() => {
    if (profile && !isAdmin && mappedStore) {
      setSelectedStore(mappedStore);
    }
  }, [profile, isAdmin, mappedStore]);

  // Enforce store locking if manager
  const activeStoreFilter = useMemo(() => {
    if (!isAdmin) {
      return mappedStore || "all";
    }
    return selectedStore;
  }, [isAdmin, mappedStore, selectedStore]);

  // Normalized rows based on active Console selection (RLS scoping)
  const scopedRows = useMemo(() => {
    if (activeStoreFilter === "all") {
      return masterRows;
    }
    const normSearch = activeStoreFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
    return masterRows.filter((r) => {
      const normStore = r.store.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normStore === normSearch;
    });
  }, [masterRows, activeStoreFilter]);

  // Date Range Bounds Calculations
  const dataMaxDate = useMemo(() => {
    let max: Date | null = null;
    masterRows.forEach((r) => {
      if (r.date && (!max || r.date > max)) max = r.date;
    });
    return max || new Date();
  }, [masterRows]);

  const activeRange = useMemo(() => {
    const ref = dataMaxDate;
    const end = endOfDay(ref);
    let start = startOfDay(ref);

    if (period === "yesterday") {
      const y = new Date(ref);
      y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    } else if (period === "7d") {
      start = startOfDay(ref);
      start.setDate(start.getDate() - 6);
    } else if (period === "30d") {
      start = startOfDay(ref);
      start.setDate(start.getDate() - 29);
    } else if (period === "month") {
      start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    } else if (period === "custom" && customStart && customEnd) {
      return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    }

    return { start, end };
  }, [period, customStart, customEnd, dataMaxDate]);

  // Window Filtering
  const windowRows = useMemo(() => {
    const filtered = scopedRows.filter((r) => {
      if (!r.date) return false;
      return r.date >= activeRange.start && r.date <= activeRange.end;
    });

    if (channel === "all") return filtered;
    return filtered.filter((r) => r.type === channel);
  }, [scopedRows, activeRange, channel]);

  // Previous Range Filtering for Pacing comparisons
  const previousRange = useMemo(() => {
    const len = activeRange.end.getTime() - activeRange.start.getTime();
    return {
      start: new Date(activeRange.start.getTime() - len),
      end: new Date(activeRange.start.getTime() - 1)
    };
  }, [activeRange]);

  const previousWindowRows = useMemo(() => {
    const filtered = scopedRows.filter((r) => {
      if (!r.date) return false;
      return r.date >= previousRange.start && r.date <= previousRange.end;
    });
    if (channel === "all") return filtered;
    return filtered.filter((r) => r.type === channel);
  }, [scopedRows, previousRange, channel]);

  // KPI Calculations
  const calculateKpis = (rows: DashboardRow[]) => {
    const orderSet = new Set(rows.map((r) => r.orderId).filter(Boolean));
    const orders = orderSet.size;
    const rev = rows.reduce((s, r) => s + r.rev, 0);
    const qty = rows.reduce((s, r) => s + r.qty, 0);
    const retQty = rows.reduce((s, r) => s + r.retQty, 0);
    const retAmt = rows.reduce((s, r) => s + r.retAmt, 0);
    const disc = rows.reduce((s, r) => s + r.discount, 0);
    const gross = rev + disc;

    const repeatCustSet = new Set(rows.filter((r) => !r.newCust).map((r) => r.custKey).filter(Boolean));
    const newCustSet = new Set(rows.filter((r) => r.newCust).map((r) => r.custKey).filter(Boolean));

    return {
      orders,
      rev,
      qty,
      retQty,
      retAmt,
      net: rev - retAmt,
      disc,
      wdisc: gross > 0 ? (disc / gross) * 100 : 0,
      aov: orders > 0 ? rev / orders : 0,
      upt: orders > 0 ? qty / orders : 0,
      asp: qty > 0 ? rev / qty : 0,
      returnRate: qty > 0 ? (retQty / qty) * 100 : 0,
      newCust: newCustSet.size,
      repeatRev: rows.filter((r) => !r.newCust).reduce((s, r) => s + r.rev, 0)
    };
  };

  const kpis = useMemo(() => calculateKpis(windowRows), [windowRows]);
  const prevKpis = useMemo(() => calculateKpis(previousWindowRows), [previousWindowRows]);

  // Delta helpers
  const deltaPct = (cur: number, prev: number) => {
    if (prev <= 0) return { pct: cur > 0 ? 100 : 0, up: true };
    const p = ((cur - prev) / prev) * 100;
    return { pct: Math.abs(p), up: p >= 0 };
  };

  // Smart Insights Heuristics
  const salesInsights = useMemo(() => {
    const out = [];
    const d = deltaPct(kpis.rev, prevKpis.rev);
    const singleDay = period === "today" || period === "yesterday";

    if (prevKpis.rev > 0) {
      out.push({
        t: `Revenue is ${d.up ? "up" : "down"} by <b>${d.pct.toFixed(0)}%</b> vs previous ${singleDay ? "day" : "period"} (₹${kpis.rev.toLocaleString("en-IN")} vs ₹${prevKpis.rev.toLocaleString("en-IN")}).`,
        tone: d.up ? "good" : "bad",
        ico: "chart"
      });
    }

    if (kpis.wdisc > CONFIG.thresholds.discountPct) {
      out.push({
        t: `Weighted discount of <b>${kpis.wdisc.toFixed(1)}%</b> exceeds the ${CONFIG.thresholds.discountPct}% limit. Watch coupon overrides.`,
        tone: "warn",
        ico: "tag"
      });
    } else if (kpis.disc > 0) {
      out.push({
        t: `Discount discipline is healthy at a weighted average of <b>${kpis.wdisc.toFixed(1)}%</b>.`,
        tone: "good",
        ico: "tag"
      });
    }

    // Top product share
    const prodMap = new Map<string, number>();
    windowRows.forEach((r) => {
      if (r.product) prodMap.set(r.product, (prodMap.get(r.product) || 0) + r.rev);
    });
    const sortedProds = [...prodMap.entries()].sort((a, b) => b[1] - a[1]);
    if (sortedProds.length && kpis.rev > 0) {
      const sh = (sortedProds[0][1] / kpis.rev) * 100;
      if (sh >= 25) {
        out.push({
          t: `High product sales concentration: <b>${sortedProds[0][0]}</b> accounts for <b>${sh.toFixed(0)}%</b> of total revenue.`,
          tone: sh > 40 ? "warn" : "good",
          ico: "star"
        });
      }
    }

    if (kpis.returnRate > CONFIG.thresholds.returnRatePct) {
      out.push({
        t: `Return rate is high at <b>${kpis.returnRate.toFixed(1)}%</b>, exceeding the ${CONFIG.thresholds.returnRatePct}% control threshold.`,
        tone: "bad",
        ico: "undo"
      });
    }

    return out.slice(0, 6);
  }, [kpis, prevKpis, windowRows, period]);

  // Loading indicator for profile synchronization
  if (!isReady || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="w-9 h-9 border-3 border-border border-t-brand-yellow rounded-full animate-spin" />
        <span className="fs-small text-text-secondary font-semibold">Synchronizing secure retail profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to Home Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/")}
            aria-label="Back to home"
          />
          <div>
            <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Store Console</h2>
            <p className="fs-caption text-text-secondary mt-0.5">
              {activeConsole === "ho" ? "Head Office Enterprise View" : `Store: ${activeStoreFilter}`}
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <button
          onClick={() => fetchLive(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border border-border bg-bg-secondary hover:bg-bg-tertiary transition-120 rounded-xs fs-caption font-bold ${
            isRefreshing ? "text-text-tertiary" : "text-text-primary"
          }`}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{refreshingText}</span>
        </button>
      </div>

      {/* Role Switcher: Only displayed to HO Admins */}
      {isAdmin && (
        <div className="flex items-center gap-1 bg-bg-secondary p-1 border border-border rounded-sm max-w-xs shadow-elevation">
          <button
            onClick={() => setActiveConsole("ho")}
            className={`flex-1 py-1.5 fs-caption font-bold rounded-xs transition-120 text-center uppercase tracking-wider ${
              activeConsole === "ho" ? "bg-brand-yellow text-[#0A0A0A]" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            HO Console
          </button>
          <button
            onClick={() => setActiveConsole("manager")}
            className={`flex-1 py-1.5 fs-caption font-bold rounded-xs transition-120 text-center uppercase tracking-wider ${
              activeConsole === "manager" ? "bg-brand-yellow text-[#0A0A0A]" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Store Manager
          </button>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-bg-secondary border border-border rounded-xs p-4 space-y-4 shadow-elevation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Store selector (locked/disabled for Store Managers) */}
          <SelectField
            label="Store"
            value={activeStoreFilter}
            onChange={(e) => setSelectedStore(e.target.value)}
            disabled={!isAdmin || activeConsole === "manager" && !isAdmin}
            options={[
              ...(isAdmin ? [{ label: "All Stores", value: "all" }] : []),
              ...sheetStoreList.map((s) => ({ label: s, value: s }))
            ]}
          />

          {/* Channel selector */}
          <SelectField
            label="Channel"
            value={channel}
            onChange={(e: any) => setChannel(e.target.value)}
            options={[
              { label: "All Channels", value: "all" },
              { label: "Offline (Cash & Carry)", value: "Offline" },
              { label: "Online (D2C Warehouse)", value: "Online" }
            ]}
          />
        </div>

        {/* Period Selector Tabs */}
        <div className="space-y-2">
          <label className="fs-caption uppercase tracking-wider font-bold text-text-secondary">Pacing Period</label>
          <div className="flex flex-wrap gap-1">
            {(["today", "yesterday", "month", "7d", "30d", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 fs-small rounded-xs border font-bold capitalize transition-120 ${
                  period === p
                    ? "bg-brand-yellow/12 border-brand-yellow text-text-primary"
                    : "bg-bg-primary border-border text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                {p === "month" ? "MTD" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date pickers */}
        {period === "custom" && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <InputField
              label="From"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <InputField
              label="To"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Pages Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
        {(activeConsole === "ho"
          ? (["home", "sales", "target", "projection", "analytics", "compare", "returns", "products", "health"] as const)
          : (["sales", "projection", "analytics", "returns", "products", "health"] as const)
        ).map((page) => {
          const labels: Record<string, string> = {
            home: "🏠 Dashboard",
            sales: "📊 Sales",
            target: "🎯 Targets",
            projection: "📈 Projection",
            analytics: "📅 Analytics",
            compare: "🏆 Comparison",
            returns: "↩️ Returns",
            products: "📦 Products",
            health: "🟢 Health"
          };
          return (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`px-4 py-2 fs-caption font-bold tracking-wide transition-120 relative ${
                activePage === page ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {labels[page]}
              {activePage === page && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-yellow rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE CONSOLE SUB-PAGES */}
      <div className="space-y-6">
        {activePage === "home" && <HOConsoleDashboard scopedRows={scopedRows} list={sheetStoreList} onNav={setActivePage} getTarget={getTarget} />}
        {activePage === "sales" && <SalesDashboard windowRows={windowRows} prevWindowRows={previousWindowRows} kpis={kpis} prevKpis={prevKpis} period={period} activeRange={activeRange} list={sheetStoreList} activeStoreFilter={activeStoreFilter} getTarget={getTarget} insights={salesInsights} isAdmin={isAdmin} />}
        {activePage === "target" && <TargetPlanner st={activeStoreFilter} getTarget={getTarget} saveTarget={saveLocalStoragePlan} getPlan={getLocalStoragePlan} masterRows={masterRows} />}
        {activePage === "projection" && <SalesProjection st={activeStoreFilter} masterRows={masterRows} getTarget={getTarget} getPlan={getLocalStoragePlan} dataMaxDate={dataMaxDate} />}
        {activePage === "analytics" && <StoreAnalytics st={activeStoreFilter} masterRows={masterRows} period={period} windowRows={windowRows} kpis={kpis} />}
        {activePage === "compare" && <StoreComparison masterRows={masterRows} list={sheetStoreList} getTarget={getTarget} onNav={setActivePage} />}
        {activePage === "returns" && <ReturnsDashboard windowRows={windowRows} kpis={kpis} prevKpis={prevKpis} period={period} />}
        {activePage === "products" && <ProductsDashboard windowRows={windowRows} kpis={kpis} />}
        {activePage === "health" && <StoreHealth st={activeStoreFilter} windowRows={windowRows} getTarget={getTarget} />}
      </div>
    </div>
  );
}

// ── SUB-PAGE 1: HO Console Dashboard ──
interface HOProps {
  scopedRows: DashboardRow[];
  list: string[];
  onNav: (p: string) => void;
  getTarget: (s: string) => { daily: number; monthly: number };
}

function HOConsoleDashboard({ scopedRows, list, onNav, getTarget }: HOProps) {
  // Aggregate data for current month
  const fleetInfo = useMemo(() => {
    let totMtd = 0;
    let totTarget = 0;
    let totProj = 0;
    let ahead = 0;
    let atRisk = 0;

    const rankList = list.map((st) => {
      // Analyze store
      const rows = scopedRows.filter((r) => r.store === st);
      if (!rows.length) return null;
      const mtd = rows.reduce((s, r) => s + r.rev, 0);
      const tgt = getTarget(st).monthly;
      
      // Projection helper
      const maxDate = rows.reduce((max, r) => r.date && r.date > max ? r.date : max, new Date(0));
      const refDay = maxDate.getDate();
      const dim = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0).getDate();
      const avg = mtd / (refDay || 1);
      const projected = mtd + avg * (dim - refDay);
      const achVal = tgt > 0 ? (projected / tgt) * 100 : 0;

      totMtd += mtd;
      totTarget += tgt;
      totProj += projected;

      if (achVal >= 100) ahead++;
      if (achVal < 90) atRisk++;

      return { st, mtd, projected, achVal };
    }).filter(Boolean) as any[];

    return { totMtd, totTarget, totProj, ahead, atRisk, rankList };
  }, [scopedRows, list, getTarget]);

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-brand-yellow bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="MTD Network Rev" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">₹{fleetInfo.totMtd.toLocaleString("en-IN")}</div>
            <p className="fs-caption text-text-tertiary mt-1">Sum of all active stores</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Network Target" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">₹{fleetInfo.totTarget.toLocaleString("en-IN")}</div>
            <p className="fs-caption text-text-tertiary mt-1">Aggregated target goals</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Projected Achievement" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">
              {fleetInfo.totTarget > 0 ? ((fleetInfo.totProj / fleetInfo.totTarget) * 100).toFixed(0) : 0}%
            </div>
            <p className="fs-caption text-text-tertiary mt-1">Pacing to ₹{Math.round(fleetInfo.totProj).toLocaleString("en-IN")}</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Ahead / At Risk" />
          <CardBody>
            <div className="fs-section font-bold">
              <span className="text-green-600">{fleetInfo.ahead}</span>
              <span className="text-text-tertiary mx-1.5">/</span>
              <span className="text-red-600">{fleetInfo.atRisk}</span>
            </div>
            <p className="fs-caption text-text-tertiary mt-1">Stores pace metrics</p>
          </CardBody>
        </Card>
      </div>

      {/* Store Ranking Comp */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Top Store Rankings" subtitle="Pacing sorted by expected monthly target achievement." />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left fs-small">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase text-[10px] font-bold">
                  <th className="py-2">Store</th>
                  <th className="py-2 text-right">MTD Revenue</th>
                  <th className="py-2 text-right">Proj. Ach%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {fleetInfo.rankList
                  .sort((a, b) => b.achVal - a.achVal)
                  .slice(0, 6)
                  .map((r, i) => (
                    <tr key={r.st}>
                      <td className="py-2.5 font-semibold text-text-primary">
                        <span className="inline-block w-4.5 text-center text-text-tertiary mr-1">{i + 1}.</span>
                        {r.st.replace(/(Frido|Experience|Store|Mall)/g, "").trim()}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-text-primary">₹{r.mtd.toLocaleString("en-IN")}</td>
                      <td className={`py-2.5 text-right font-bold ${
                        r.achVal >= 100 ? "text-green-600" : r.achVal >= 90 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {r.achVal.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => onNav("compare")}
            className="w-full text-center mt-3 text-brand-yellow font-bold fs-caption uppercase tracking-wider block"
          >
            Show full network rankings →
          </button>
        </CardBody>
      </Card>

      {/* HO Console Alerts */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="HO Operational Alerts" />
        <CardBody className="space-y-3 pt-2">
          {fleetInfo.rankList
            .filter((r) => r.achVal < 90)
            .slice(0, 3)
            .map((r) => (
              <div key={r.st} className="flex gap-3 p-3 bg-red-500/6 border border-red-500/12 rounded-xs items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="fs-small font-bold text-text-primary">{r.st} Pacing Alert</h4>
                  <p className="fs-caption text-text-secondary mt-0.5">
                    Currently pacing to reach only <b>{r.achVal.toFixed(0)}%</b> of monthly target. Action is required.
                  </p>
                </div>
              </div>
            ))}
          {fleetInfo.rankList.filter((r) => r.achVal < 90).length === 0 && (
            <div className="text-center py-6 text-text-tertiary fs-small">All stores are currently pacing within control targets.</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── SUB-PAGE 2: Sales Dashboard ──
interface SalesProps {
  windowRows: DashboardRow[];
  prevWindowRows: DashboardRow[];
  kpis: any;
  prevKpis: any;
  period: string;
  activeRange: { start: Date; end: Date };
  list: string[];
  activeStoreFilter: string;
  getTarget: (s: string) => { daily: number; monthly: number };
  insights: any[];
  isAdmin: boolean;
}

function SalesDashboard({
  windowRows,
  prevWindowRows,
  kpis,
  prevKpis,
  period,
  activeRange,
  activeStoreFilter,
  getTarget,
  insights,
  isAdmin
}: SalesProps) {
  const dailyTarget = getTarget(activeStoreFilter).daily;
  const monthlyTarget = getTarget(activeStoreFilter).monthly;

  // Achievement metrics
  const targetPace = useMemo(() => {
    const isMTD = period === "month";
    const ref = activeRange.end;
    const nDays = Math.max(1, Math.round((activeRange.end.getTime() - activeRange.start.getTime()) / 864e5) + 1);
    const target = isMTD ? monthlyTarget : dailyTarget * nDays;
    const ach = target > 0 ? (kpis.rev / target) * 100 : 0;
    return { target, ach, nDays };
  }, [period, activeRange, dailyTarget, monthlyTarget, kpis.rev]);

  // Hourly/Daily sales trend compilation
  const trendChartData = useMemo(() => {
    const singleDay = period === "today" || period === "yesterday";
    if (singleDay) {
      const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
      const labels = hours.map((h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`);
      const currentVal = hours.map((h) => windowRows.filter((r) => r.date?.getHours() === h).reduce((s, r) => s + r.rev, 0));
      const prevVal = hours.map((h) => prevWindowRows.filter((r) => r.date?.getHours() === h).reduce((s, r) => s + r.rev, 0));

      return {
        labels,
        datasets: [
          { label: "Selected Period", data: currentVal, backgroundColor: "#E6BD00", borderRadius: 4 },
          { label: "Prior Period", data: prevVal, backgroundColor: "rgba(10, 10, 10, 0.08)", borderRadius: 4 }
        ]
      };
    } else {
      // Daily aggregates
      const dayMap = new Map<string, number>();
      windowRows.forEach((r) => {
        if (!r.date) return;
        const key = r.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        dayMap.set(key, (dayMap.get(key) || 0) + r.rev);
      });

      const labels = [...dayMap.keys()];
      const currentVal = labels.map((l) => dayMap.get(l) || 0);

      return {
        labels,
        datasets: [
          { label: "Sales Revenue", data: currentVal, borderColor: "#E6BD00", borderWidth: 2, fill: false, tension: 0.15 }
        ]
      };
    }
  }, [windowRows, prevWindowRows, period]);

  // Payment mode doughnut compilation
  const payChartData = useMemo(() => {
    const payMap = new Map<string, number>();
    windowRows.forEach((r) => {
      if (r.payment) payMap.set(r.payment, (payMap.get(r.payment) || 0) + r.rev);
    });

    return {
      labels: [...payMap.keys()],
      datasets: [
        {
          data: [...payMap.values()],
          backgroundColor: ["#E6BD00", "#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#14B8A6"]
        }
      ]
    };
  }, [windowRows]);

  // Product revenue waterfall calculations
  const productRevenueMovers = useMemo(() => {
    const currentProd = new Map<string, number>();
    const prevProd = new Map<string, number>();

    windowRows.forEach((r) => {
      if (r.product) currentProd.set(r.product, (currentProd.get(r.product) || 0) + r.rev);
    });
    prevWindowRows.forEach((r) => {
      if (r.product) prevProd.set(r.product, (prevProd.get(r.product) || 0) + r.rev);
    });

    const keys = new Set([...currentProd.keys(), ...prevProd.keys()]);
    return [...keys]
      .map((p) => {
        const cur = currentProd.get(p) || 0;
        const prev = prevProd.get(p) || 0;
        return { p, cur, prev, d: cur - prev };
      })
      .filter((x) => Math.round(x.d) !== 0)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 5);
  }, [windowRows, prevWindowRows]);

  // Contributions table data
  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; rev: number }>();
    windowRows.forEach((r) => {
      if (!r.product) return;
      const exist = map.get(r.product) || { qty: 0, rev: 0 };
      exist.qty += r.qty;
      exist.rev += r.rev;
      map.set(r.product, exist);
    });

    return [...map.entries()]
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 6)
      .map(([name, val]) => ({
        name,
        qty: val.qty,
        rev: val.rev,
        contrib: kpis.rev > 0 ? (val.rev / kpis.rev) * 100 : 0
      }));
  }, [windowRows, kpis.rev]);

  // Employee table data
  const topEmployees = useMemo(() => {
    const map = new Map<string, { orders: number; qty: number; rev: number }>();
    windowRows.forEach((r) => {
      if (!r.emp) return;
      const exist = map.get(r.emp) || { orders: 0, qty: 0, rev: 0 };
      exist.qty += r.qty;
      exist.rev += r.rev;
      exist.orders += r.qty > 0 ? 1 : 0;
      map.set(r.emp, exist);
    });

    return [...map.entries()]
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 6);
  }, [windowRows]);

  return (
    <div className="space-y-6">
      {/* Target pacing card */}
      <Card className="bg-bg-secondary p-4 shadow-elevation border border-border">
        <CardHeader title="Revenue vs Target" />
        <CardBody className="pt-2">
          <div className="flex justify-between items-baseline mb-2">
            <span className="fs-small text-text-secondary">Pacing target ({targetPace.nDays} days)</span>
            <span className="fs-section font-bold text-text-primary">
              ₹{kpis.rev.toLocaleString("en-IN")} / ₹{targetPace.target.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="w-full bg-bg-tertiary h-2.5 rounded-full overflow-hidden mb-1">
            <div
              className="bg-brand-yellow h-full rounded-full transition-260"
              style={{ width: `${Math.min(100, targetPace.ach)}%` }}
            />
          </div>
          <div className="flex justify-between fs-caption font-bold">
            <span className={targetPace.ach >= 100 ? "text-green-600" : "text-amber-600"}>
              {targetPace.ach.toFixed(0)}% Achieved
            </span>
            <span className="text-text-tertiary">Goal target pacing</span>
          </div>
        </CardBody>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Gross Revenue" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">₹{kpis.rev.toLocaleString("en-IN")}</div>
            <p className="fs-caption text-text-tertiary mt-1">Prev: ₹{prevKpis.rev.toLocaleString("en-IN")}</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Net Revenue" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">₹{kpis.net.toLocaleString("en-IN")}</div>
            <p className="fs-caption text-text-tertiary mt-1">After returns</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Total Orders" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">{kpis.orders}</div>
            <p className="fs-caption text-text-tertiary mt-1">Txns processed</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Average Order Value" />
          <CardBody>
            <div className="fs-section font-bold text-text-primary">₹{kpis.aov.toFixed(0)}</div>
            <p className="fs-caption text-text-tertiary mt-1">Basket value</p>
          </CardBody>
        </Card>
      </div>

      {/* Smart insights */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Smart Pacing Insights" />
        <CardBody className="space-y-3 pt-2">
          {insights.map((ins, idx) => (
            <div key={idx} className={`flex gap-3 p-3 rounded-xs border items-start ${
              ins.tone === "good" ? "bg-green-500/6 border-green-500/12" : ins.tone === "bad" ? "bg-red-500/6 border-red-500/12" : "bg-amber-500/6 border-amber-500/12"
            }`}>
              <Info className="w-5 h-5 text-text-secondary flex-shrink-0" />
              <div className="fs-caption text-text-primary leading-normal" dangerouslySetInnerHTML={{ __html: ins.t }} />
            </div>
          ))}
          {insights.length === 0 && (
            <div className="text-center py-6 text-text-tertiary fs-small">Not enough activity data in selection.</div>
          )}
        </CardBody>
      </Card>

      {/* Charts Grid */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Pacing Trend" subtitle={period === "today" || period === "yesterday" ? "Hourly sales values" : "Daily sales path"} />
        <CardBody className="pt-2">
          <ChartCanvas type={period === "today" || period === "yesterday" ? "bar" : "line"} data={trendChartData} height={180} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Payment Mode Split" />
          <CardBody className="pt-2">
            <ChartCanvas type="doughnut" data={payChartData} height={160} options={{ plugins: { legend: { position: "right" } } }} />
          </CardBody>
        </Card>
      </div>

      {/* Movers and Bridge waterfall estimation */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Key Product Movers" subtitle="Movers vs previous date window comparison" />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left fs-small">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase text-[10px] font-bold">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Previous</th>
                  <th className="py-2 text-right">Current</th>
                  <th className="py-2 text-right">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {productRevenueMovers.map((m) => (
                  <tr key={m.p}>
                    <td className="py-2 font-semibold text-text-primary">{m.p}</td>
                    <td className="py-2 text-right text-text-secondary">₹{m.prev.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right text-text-primary">₹{m.cur.toLocaleString("en-IN")}</td>
                    <td className={`py-2 text-right font-bold ${m.d >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.d >= 0 ? "+" : ""}
                      {m.d.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                {productRevenueMovers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-tertiary">No major movers.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Top Products contribution table */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Product Contribution" subtitle="Contribution share in gross revenue" />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left fs-small">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase text-[10px] font-bold">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">Share%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topProducts.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 font-semibold text-text-primary">{p.name}</td>
                    <td className="py-2 text-right text-text-secondary">{p.qty}</td>
                    <td className="py-2 text-right text-text-primary">₹{p.rev.toLocaleString("en-IN")}</td>
                    <td className="py-2 text-right text-brand-yellow font-bold">{p.contrib.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Employee rankings table */}
      {isAdmin && (
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Executive Rankings" subtitle="Individual sales results logged in period" />
          <CardBody className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left fs-small">
                <thead>
                  <tr className="border-b border-border text-text-tertiary uppercase text-[10px] font-bold">
                    <th className="py-2">Name</th>
                    <th className="py-2 text-right">Txns</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {topEmployees.map(([empName, val]) => (
                    <tr key={empName}>
                      <td className="py-2 font-semibold text-text-primary">{empName}</td>
                      <td className="py-2 text-right text-text-secondary">{val.orders}</td>
                      <td className="py-2 text-right text-text-secondary">{val.qty}</td>
                      <td className="py-2 text-right text-text-primary font-bold">₹{val.rev.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── SUB-PAGE 3: Target Planner ──
interface TargetPlannerProps {
  st: string;
  getTarget: (s: string) => { daily: number; monthly: number };
  saveTarget: (st: string, target: number, growth: number, note: string, holidays: number) => void;
  getPlan: (st: string) => any;
  masterRows: DashboardRow[];
}

function TargetPlanner({ st, getTarget, saveTarget, getPlan, masterRows }: TargetPlannerProps) {
  const currentStoreRows = useMemo(() => {
    return masterRows.filter((r) => r.store === st);
  }, [masterRows, st]);

  const stats = useMemo(() => {
    if (!currentStoreRows.length) return null;
    const totalRev = currentStoreRows.reduce((s, r) => s + r.rev, 0);
    const daySet = new Set(currentStoreRows.map((r) => r.date?.toDateString()).filter(Boolean));
    const operatingDays = daySet.size;
    const avgDaily = operatingDays > 0 ? totalRev / operatingDays : 0;
    const daysInMonth = 30; // standard estimation
    const currentAvgMonthly = avgDaily * daysInMonth;

    return { operatingDays, totalRev, avgDaily, currentAvgMonthly };
  }, [currentStoreRows]);

  const savedPlan = useMemo(() => getPlan(st), [getPlan, st]);
  
  const [growth, setGrowth] = useState<number>(12);
  const [holidays, setHolidays] = useState<number>(0);
  const [target, setTarget] = useState<number>(CONFIG.defaultMonthlyTarget);
  const [note, setNote] = useState("");

  // Sync saved values
  useEffect(() => {
    if (savedPlan) {
      setGrowth(savedPlan.growth || 12);
      setHolidays(savedPlan.holidays || 0);
      setTarget(savedPlan.target || CONFIG.defaultMonthlyTarget);
    } else if (stats) {
      const suggested = Math.round((stats.currentAvgMonthly * 1.12) / 1000) * 1000;
      setTarget(suggested);
    }
  }, [savedPlan, stats]);

  const suggestedTargetValue = useMemo(() => {
    if (!stats) return CONFIG.defaultMonthlyTarget;
    const holidayOffset = holidays * stats.avgDaily;
    const computed = stats.currentAvgMonthly * (1 + growth / 100) - holidayOffset;
    return Math.round(Math.max(0, computed) / 1000) * 1000;
  }, [stats, growth, holidays]);

  const handleUseSuggested = () => {
    setTarget(suggestedTargetValue);
  };

  const handleSave = () => {
    saveTarget(st, target, growth, note, holidays);
  };

  if (!stats) {
    return (
      <Card className="bg-bg-secondary p-6 text-center text-text-tertiary">
        No sales history found for store {st} to calculate targets.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Suggested Target Formula" subtitle="Estimates pacing values using historical data." />
        <CardBody className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-primary p-3 rounded-xs border border-border">
              <span className="fs-caption text-text-tertiary font-bold block uppercase tracking-wider">Avg Daily Sales</span>
              <span className="fs-section font-bold text-text-primary">₹{stats.avgDaily.toFixed(0)}</span>
            </div>
            <div className="bg-bg-primary p-3 rounded-xs border border-border">
              <span className="fs-caption text-text-tertiary font-bold block uppercase tracking-wider">Current Avg Monthly</span>
              <span className="fs-section font-bold text-text-primary">₹{stats.currentAvgMonthly.toFixed(0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Growth % Goal"
              type="number"
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
            />
            <InputField
              label="Holidays / Closed days"
              type="number"
              value={holidays}
              onChange={(e) => setHolidays(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-brand-yellow/12 border border-brand-yellow/30 rounded-xs flex justify-between items-center">
            <div>
              <span className="fs-caption text-text-secondary font-bold block uppercase tracking-wider">Suggested target goal</span>
              <span className="fs-section font-bold text-green-600">₹{suggestedTargetValue.toLocaleString("en-IN")}</span>
            </div>
            <PrimaryButton onClick={handleUseSuggested}>Apply Suggested</PrimaryButton>
          </div>
        </CardBody>
      </Card>

      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Set Target Value" />
        <CardBody className="space-y-4 pt-2">
          <InputField
            label="Monthly Revenue Goal target (₹)"
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <InputField
            label="Revision Notes"
            placeholder="Add context for target revision..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <PrimaryButton onClick={handleSave} className="w-full">
            Save Target Configuration
          </PrimaryButton>
        </CardBody>
      </Card>

      {/* Target change history */}
      {savedPlan?.history?.length > 0 && (
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Target Revisions Log" />
          <CardBody className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left fs-caption">
                <thead>
                  <tr className="border-b border-border text-text-tertiary uppercase text-[9px] font-bold">
                    <th className="py-2">Revised At</th>
                    <th className="py-2 text-right">Target</th>
                    <th className="py-2 text-right">Growth</th>
                    <th className="py-2">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {savedPlan.history.map((h: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 text-text-secondary">
                        {new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 text-right font-semibold text-text-primary">₹{h.target.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right text-text-secondary">{h.growth}%</td>
                      <td className="py-2 text-text-primary font-bold">{h.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── SUB-PAGE 4: Sales Projection ──
interface ProjectionProps {
  st: string;
  masterRows: DashboardRow[];
  getTarget: (s: string) => { daily: number; monthly: number };
  getPlan: (st: string) => any;
  dataMaxDate: Date;
}

function SalesProjection({ st, masterRows, getTarget, getPlan, dataMaxDate }: ProjectionProps) {
  const currentStoreRows = useMemo(() => {
    return masterRows.filter((r) => r.store === st);
  }, [masterRows, st]);

  const target = getTarget(st).monthly;

  const projectionInfo = useMemo(() => {
    const y = dataMaxDate.getFullYear();
    const m = dataMaxDate.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const refDay = dataMaxDate.getDate();

    // MTD rows
    const mtdRows = currentStoreRows.filter((r) => {
      if (!r.date) return false;
      return r.date.getFullYear() === y && r.date.getMonth() === m;
    });

    const mtd = mtdRows.reduce((s, r) => s + r.rev, 0);
    const elapsedDays = refDay;
    const remainingDays = Math.max(0, dim - elapsedDays);

    const avgDaily = elapsedDays > 0 ? mtd / elapsedDays : 0;
    const projectedRemaining = avgDaily * remainingDays;
    const projected = mtd + projectedRemaining;
    const achVal = target > 0 ? (projected / target) * 100 : 0;
    const gap = target - projected;

    return {
      mtd,
      elapsedDays,
      remainingDays,
      projected,
      achVal,
      gap,
      reqDaily: remainingDays > 0 ? Math.max(0, gap) / remainingDays : 0,
      avgDaily
    };
  }, [currentStoreRows, target, dataMaxDate]);

  // Actual vs Expected DOW bar chart calculation
  const barChartData = useMemo(() => {
    const y = dataMaxDate.getFullYear();
    const m = dataMaxDate.getMonth();
    const refDay = dataMaxDate.getDate();

    // Group actual daily sales
    const dayActuals = Array.from({ length: refDay }, (_, i) => {
      const dNum = i + 1;
      const dayRev = currentStoreRows
        .filter((r) => r.date?.getFullYear() === y && r.date?.getMonth() === m && r.date?.getDate() === dNum)
        .reduce((s, r) => s + r.rev, 0);
      return { day: `D${dNum}`, actual: dayRev };
    });

    // Calculate DOW expected values based on historical DOW ratios
    const dowSum = Array.from({ length: 7 }, () => 0);
    const dowCount = Array.from({ length: 7 }, () => 0);

    currentStoreRows.forEach((r) => {
      if (!r.date) return;
      const dow = r.date.getDay();
      // Only compile historical data (not current month)
      if (r.date.getFullYear() < y || r.date.getMonth() < m) {
        dowSum[dow] += r.rev;
      }
    });

    // Count DOW instances in history
    const historyStart = currentStoreRows.reduce((min, r) => r.date && r.date < min ? r.date : min, new Date());
    let currentCursor = new Date(historyStart);
    const currentMonthStart = new Date(y, m, 1);
    while (currentCursor < currentMonthStart) {
      dowCount[currentCursor.getDay()]++;
      currentCursor.setDate(currentCursor.getDate() + 1);
    }

    const dowAvgs = dowSum.map((val, idx) => (dowCount[idx] > 0 ? val / dowCount[idx] : 0));

    const labels = dayActuals.map((d) => d.day);
    const actualData = dayActuals.map((d) => d.actual);
    const expectedData = Array.from({ length: refDay }, (_, i) => {
      const date = new Date(y, m, i + 1);
      return dowAvgs[date.getDay()];
    });

    return {
      labels,
      datasets: [
        { label: "Actual sales", data: actualData, backgroundColor: "#E6BD00", borderRadius: 4 },
        { label: "Expected (avg)", data: expectedData, backgroundColor: "rgba(10, 10, 10, 0.08)", borderRadius: 4 }
      ]
    };
  }, [currentStoreRows, dataMaxDate]);

  if (!projectionInfo) {
    return (
      <Card className="bg-bg-secondary p-6 text-center text-text-tertiary">
        No sales history available to compile projection graphs.
      </Card>
    );
  }

  const band =
    projectionInfo.achVal >= 100
      ? { text: "On Track", color: "text-green-600" }
      : projectionInfo.achVal >= 90
      ? { text: "Near Target", color: "text-amber-600" }
      : { text: "Below Target / Action Required", color: "text-red-600" };

  return (
    <div className="space-y-6">
      {/* Target Progress ring card */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Projection Pacing" subtitle={`Month pacing towards targets`} />
        <CardBody className="flex flex-col items-center pt-2">
          {/* Target pacing ring gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center my-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(10,10,10,0.04)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#E6BD00"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(100, projectionInfo.achVal) / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="fs-display font-bold text-text-primary block">{projectionInfo.achVal.toFixed(0)}%</span>
              <span className="fs-caption text-text-tertiary uppercase tracking-wider font-bold">MTD Ach%</span>
            </div>
          </div>

          <div className={`fs-section font-bold ${band.color} mt-2`}>{band.text}</div>

          <div className="w-full grid grid-cols-2 gap-4 mt-6 border-t border-border/40 pt-4">
            <div>
              <span className="fs-caption text-text-tertiary font-bold uppercase tracking-wider">Goal target</span>
              <span className="fs-body font-bold block text-text-primary">₹{target.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="fs-caption text-text-tertiary font-bold uppercase tracking-wider">Projected end</span>
              <span className="fs-body font-bold block text-text-primary">₹{Math.round(projectionInfo.projected).toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="fs-caption text-text-tertiary font-bold uppercase tracking-wider">Current MTD</span>
              <span className="fs-body font-bold block text-text-primary">₹{projectionInfo.mtd.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="fs-caption text-text-tertiary font-bold uppercase tracking-wider">Required Daily</span>
              <span className="fs-body font-bold block text-text-primary">₹{Math.round(projectionInfo.reqDaily).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Actual vs Expected charts */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Actual vs expected daily performance" subtitle="DOW expected benchmark vs real results" />
        <CardBody className="pt-2">
          <ChartCanvas type="bar" data={barChartData} height={180} />
        </CardBody>
      </Card>

      {/* Projection AI insights cards */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Pacing Forecast Insights" />
        <CardBody className="space-y-3 pt-2">
          {projectionInfo.gap > 0 ? (
            <div className="flex gap-3 p-3 bg-red-500/6 border border-red-500/12 rounded-xs items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="fs-caption text-text-primary">
                A daily sales increase of <b>₹{Math.round(projectionInfo.reqDaily).toLocaleString("en-IN")}</b> is required to close the monthly target gap of <b>₹{Math.round(projectionInfo.gap).toLocaleString("en-IN")}</b>.
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-3 bg-green-500/6 border border-green-500/12 rounded-xs items-start">
              <Award className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="fs-caption text-text-primary">
                Store is pacing above target. Maintain current run rate of <b>₹{Math.round(projectionInfo.avgDaily).toLocaleString("en-IN")}/day</b>.
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── SUB-PAGE 5: Store Analytics ──
interface StoreAnalyticsProps {
  st: string;
  masterRows: DashboardRow[];
  period: string;
  windowRows: DashboardRow[];
  kpis: any;
}

function StoreAnalytics({ st, masterRows, period, windowRows, kpis }: StoreAnalyticsProps) {
  // Day of week analysis calculations
  const dowChartData = useMemo(() => {
    const dowSum = Array.from({ length: 7 }, () => 0);
    const dowCount = Array.from({ length: 7 }, () => 0);

    windowRows.forEach((r) => {
      if (!r.date) return;
      const dow = r.date.getDay();
      dowSum[dow] += r.rev;
      dowCount[dow]++;
    });

    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const avgs = dowSum.map((val, idx) => (dowCount[idx] > 0 ? val / dowCount[idx] : 0));

    return {
      labels,
      datasets: [
        { label: "Avg Sales by DOW", data: avgs, backgroundColor: "#E6BD00", borderRadius: 4 }
      ]
    };
  }, [windowRows]);

  // Hourly Heatmap calculations
  const hourlyData = useMemo(() => {
    const H0 = 8, H1 = 22; // 8am to 10pm
    const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // Day of week matrix
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: H1 - H0 + 1 }, () => 0));

    windowRows.forEach((r) => {
      if (!r.date) return;
      const hh = r.date.getHours();
      const dow = r.date.getDay();
      if (hh >= H0 && hh <= H1) {
        matrix[dow][hh - H0] += r.rev;
      }
    });

    // Find max value in matrix for opacity shading
    let max = 1;
    matrix.forEach((row) => row.forEach((val) => {
      if (val > max) max = val;
    }));

    return { matrix, H0, H1, dowLabels, max };
  }, [windowRows]);

  return (
    <div className="space-y-6">
      {/* Day of Week performance */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Day of Week Average sales" subtitle="Aggregated average store revenues by weekday" />
        <CardBody className="pt-2">
          <ChartCanvas type="bar" data={dowChartData} height={180} />
        </CardBody>
      </Card>

      {/* Hourly Heatmap Grid */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Hourly Sales Heatmap" subtitle="Dense color intensity indicates high peak-hour transaction values" />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {/* Header hours */}
              <div className="grid grid-cols-[45px_repeat(15,_1fr)] gap-1 mb-1 text-[9px] font-bold text-text-tertiary text-center">
                <div></div>
                {Array.from({ length: hourlyData.H1 - hourlyData.H0 + 1 }, (_, i) => {
                  const h = hourlyData.H0 + i;
                  return <div key={h}>{h % 12 || 12}{h < 12 ? "a" : "p"}</div>;
                })}
              </div>

              {/* Rows DOW */}
              <div className="space-y-1">
                {hourlyData.dowLabels.map((label, dowIdx) => (
                  <div key={label} className="grid grid-cols-[45px_repeat(15,_1fr)] gap-1 items-center">
                    <div className="text-[10px] font-bold text-text-secondary text-left pr-1">{label}</div>
                    {hourlyData.matrix[dowIdx].map((val, hourIdx) => {
                      const pct = val / hourlyData.max;
                      const hasVal = val > 0;
                      return (
                        <div
                          key={hourIdx}
                          title={`${label} ${hourlyData.H0 + hourIdx}:00 - ₹${Math.round(val).toLocaleString("en-IN")}`}
                          className="aspect-square rounded-[3px] border border-border/20 transition-120"
                          style={{
                            backgroundColor: hasVal ? `rgba(230, 189, 0, ${0.12 + pct * 0.88})` : "var(--bg-primary)"
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── SUB-PAGE 6: Store Comparison ──
interface ComparisonProps {
  masterRows: DashboardRow[];
  list: string[];
  getTarget: (s: string) => { daily: number; monthly: number };
  onNav: (p: string) => void;
}

function StoreComparison({ masterRows, list, getTarget, onNav }: ComparisonProps) {
  // Pacing calculations for all stores
  const storeComparison = useMemo(() => {
    return list.map((st) => {
      const rows = masterRows.filter((r) => r.store === st);
      if (!rows.length) return null;
      
      const mtd = rows.reduce((s, r) => s + r.rev, 0);
      const tgt = getTarget(st).monthly;
      const maxDate = rows.reduce((max, r) => r.date && r.date > max ? r.date : max, new Date(0));
      const refDay = maxDate.getDate();
      const dim = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0).getDate();
      const avg = mtd / (refDay || 1);
      const projected = mtd + avg * (dim - refDay);
      const achVal = tgt > 0 ? (projected / tgt) * 100 : 0;
      
      return { st, mtd, target: tgt, projected, achVal };
    }).filter(Boolean) as any[];
  }, [masterRows, list, getTarget]);

  return (
    <Card className="bg-bg-secondary p-4 shadow-elevation">
      <CardHeader title="Network comparison details" subtitle="Comprehensive performance results per store" />
      <CardBody className="pt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left fs-caption">
            <thead>
              <tr className="border-b border-border text-text-tertiary uppercase text-[9px] font-bold">
                <th className="py-2">Store</th>
                <th className="py-2 text-right">Target</th>
                <th className="py-2 text-right">MTD Revenue</th>
                <th className="py-2 text-right">Proj. Ach%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {storeComparison
                .sort((a, b) => b.achVal - a.achVal)
                .map((r, i) => (
                  <tr key={r.st}>
                    <td className="py-2.5 font-semibold text-text-primary">
                      <span className="inline-block w-4.5 text-center text-text-tertiary mr-1">{i + 1}.</span>
                      {r.st}
                    </td>
                    <td className="py-2.5 text-right text-text-secondary">₹{r.target.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-right text-text-primary font-semibold">₹{r.mtd.toLocaleString("en-IN")}</td>
                    <td className={`py-2.5 text-right font-bold ${
                      r.achVal >= 100 ? "text-green-600" : r.achVal >= 90 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {r.achVal.toFixed(0)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

// ── SUB-PAGE 7: Returns Dashboard ──
interface ReturnsProps {
  windowRows: DashboardRow[];
  kpis: any;
  prevKpis: any;
  period: string;
}

function ReturnsDashboard({ windowRows, kpis, prevKpis, period }: ReturnsProps) {
  const returnRows = useMemo(() => {
    return windowRows.filter((r) => r.retQty > 0 || r.retAmt > 0);
  }, [windowRows]);

  // Return reasons pie chart
  const reasonChartData = useMemo(() => {
    const reasonsMap = new Map<string, number>();
    returnRows.forEach((r) => {
      const k = r.retReason || "Unspecified";
      reasonsMap.set(k, (reasonsMap.get(k) || 0) + r.retQty);
    });

    return {
      labels: [...reasonsMap.keys()],
      datasets: [
        {
          data: [...reasonsMap.values()],
          backgroundColor: ["#E5484D", "#F59E0B", "#3B82F6", "#8B5CF6", "#14B8A6", "#E6BD00"]
        }
      ]
    };
  }, [returnRows]);

  // Most returned products
  const mostReturnedProducts = useMemo(() => {
    const map = new Map<string, { qty: number; amt: number }>();
    returnRows.forEach((r) => {
      if (!r.product) return;
      const exist = map.get(r.product) || { qty: 0, amt: 0 };
      exist.qty += r.retQty;
      exist.amt += r.retAmt;
      map.set(r.product, exist);
    });

    return [...map.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5);
  }, [returnRows]);

  return (
    <div className="space-y-6">
      {/* Return stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Total Return Amount" />
          <CardBody>
            <div className="fs-section font-bold text-red-600">₹{kpis.retAmt.toLocaleString("en-IN")}</div>
            <p className="fs-caption text-text-tertiary mt-1">Value losses</p>
          </CardBody>
        </Card>
        <Card className="bg-bg-secondary p-4 shadow-elevation">
          <CardHeader title="Return Rate" />
          <CardBody>
            <div className="fs-section font-bold text-red-600">{kpis.returnRate.toFixed(1)}%</div>
            <p className="fs-caption text-text-tertiary mt-1">benchmark: &lt;5%</p>
          </CardBody>
        </Card>
      </div>

      {returnRows.length > 0 ? (
        <>
          {/* Reason distribution chart */}
          <Card className="bg-bg-secondary p-4 shadow-elevation">
            <CardHeader title="Return Reason Share" />
            <CardBody className="pt-2">
              <ChartCanvas type="pie" data={reasonChartData} height={160} />
            </CardBody>
          </Card>

          {/* Table list returned */}
          <Card className="bg-bg-secondary p-4 shadow-elevation">
            <CardHeader title="Top Returned Products" />
            <CardBody className="pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left fs-small">
                  <thead>
                    <tr className="border-b border-border text-text-tertiary uppercase text-[9px] font-bold">
                      <th className="py-2">Product</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Total Lost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {mostReturnedProducts.map(([pName, val]) => (
                      <tr key={pName}>
                        <td className="py-2.5 font-semibold text-text-primary">{pName}</td>
                        <td className="py-2.5 text-right text-text-secondary">{val.qty}</td>
                        <td className="py-2.5 text-right text-red-600 font-bold">₹{val.amt.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card className="bg-bg-secondary p-6 text-center text-text-tertiary">
          No return transactions recorded in the selected period.
        </Card>
      )}
    </div>
  );
}

// ── SUB-PAGE 8: Products Dashboard ──
interface ProductsProps {
  windowRows: DashboardRow[];
  kpis: any;
}

function ProductsDashboard({ windowRows, kpis }: ProductsProps) {
  const productPerformance = useMemo(() => {
    const revMap = new Map<string, number>();
    const qtyMap = new Map<string, number>();
    const discMap = new Map<string, number>();
    const retMap = new Map<string, number>();

    windowRows.forEach((r) => {
      if (!r.product) return;
      revMap.set(r.product, (revMap.get(r.product) || 0) + r.rev);
      qtyMap.set(r.product, (qtyMap.get(r.product) || 0) + r.qty);
      discMap.set(r.product, (discMap.get(r.product) || 0) + r.discount);
      retMap.set(r.product, (retMap.get(r.product) || 0) + r.retQty);
    });

    const sortedByRev = [...revMap.entries()].sort((a, b) => b[1] - a[1]);
    const sortedByQty = [...qtyMap.entries()].sort((a, b) => b[1] - a[1]);

    const leakList = [...revMap.keys()].map((p) => {
      const rev = revMap.get(p) || 0;
      const disc = discMap.get(p) || 0;
      const dp = (rev + disc) > 0 ? (disc / (rev + disc)) * 100 : 0;
      return { p, rev, disc, dp };
    }).filter((x) => x.disc > 0).sort((a, b) => b.dp - a.dp).slice(0, 5);

    const qualityList = [...retMap.keys()].map((p) => {
      const rq = retMap.get(p) || 0;
      const q = qtyMap.get(p) || 0;
      const rr = q > 0 ? (rq / q) * 100 : 0;
      return { p, rq, q, rr };
    }).filter((x) => x.rq > 0).sort((a, b) => b.rr - a.rr).slice(0, 5);

    return { sortedByRev, sortedByQty, leakList, qualityList };
  }, [windowRows]);

  // Chart top products by revenue
  const revChartData = useMemo(() => {
    const labels = productPerformance.sortedByRev.slice(0, 5).map((x) => x[0].replace("Frido ", ""));
    const data = productPerformance.sortedByRev.slice(0, 5).map((x) => x[1]);

    return {
      labels,
      datasets: [
        { label: "Product Rev (₹)", data, backgroundColor: "#E6BD00", borderRadius: 4 }
      ]
    };
  }, [productPerformance]);

  return (
    <div className="space-y-6">
      {/* Performance chart */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Top 5 Products by Revenue" />
        <CardBody className="pt-2">
          <ChartCanvas type="bar" data={revChartData} height={180} />
        </CardBody>
      </Card>

      {/* Margin leakage list */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Margin Leak watchlist" subtitle="Movers sorted by highest discount percentage" />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left fs-small">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase text-[9px] font-bold">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Disc%</th>
                  <th className="py-2 text-right">Discount</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {productPerformance.leakList.map((x) => (
                  <tr key={x.p}>
                    <td className="py-2.5 font-semibold text-text-primary">{x.p}</td>
                    <td className="py-2.5 text-right font-bold text-red-600">{x.dp.toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-text-secondary">₹{x.disc.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-right text-text-primary font-bold">₹{x.rev.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {productPerformance.leakList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-tertiary">No discounts logged in selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Quality watchlist returns */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Returns watchlist" subtitle="Movers sorted by highest return rate" />
        <CardBody className="pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left fs-small">
              <thead>
                <tr className="border-b border-border text-text-tertiary uppercase text-[9px] font-bold">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Returned</th>
                  <th className="py-2 text-right">Sold</th>
                  <th className="py-2 text-right">Return Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {productPerformance.qualityList.map((x) => (
                  <tr key={x.p}>
                    <td className="py-2.5 font-semibold text-text-primary">{x.p}</td>
                    <td className="py-2.5 text-right text-text-secondary">{x.rq}</td>
                    <td className="py-2.5 text-right text-text-secondary">{x.q}</td>
                    <td className="py-2.5 text-right font-bold text-red-600">{x.rr.toFixed(1)}%</td>
                  </tr>
                ))}
                {productPerformance.qualityList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-text-tertiary">No returns logged in selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── SUB-PAGE 9: Store Health Score ──
interface HealthProps {
  st: string;
  windowRows: DashboardRow[];
  getTarget: (s: string) => { daily: number; monthly: number };
}

function StoreHealth({ st, windowRows, getTarget }: HealthProps) {
  const target = getTarget(st).monthly;

  // Composite health calculation
  const healthInfo = useMemo(() => {
    const k = calculateKpis(windowRows);
    const empSet = new Set(windowRows.map((r) => r.emp).filter(Boolean));
    const empCount = Math.max(1, empSet.size);
    const revPerEmp = k.rev / empCount;
    const newPct = k.orders > 0 ? (k.newCust / k.orders) * 100 : 0;

    const W = CONFIG.healthWeights;
    const T = CONFIG.thresholds;

    // Prorated target multiplier
    const now = new Date();
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const prog = Math.max(now.getDate() / dim, 1 / dim);
    const revExp = target * prog;
    const empExp = T.empRevBenchmark * prog;
    const ordExp = k.aov > 0 ? revExp / k.aov : 0;

    const cl = (v: number) => Math.max(0, Math.min(100, v));

    const comps = [
      { name: "Revenue Pace", weight: W.revenue, score: cl(revExp > 0 ? (k.rev / revExp) * 100 : 0), desc: `₹${k.rev.toLocaleString("en-IN")} MTD vs ₹${Math.round(revExp).toLocaleString("en-IN")} expected pace` },
      { name: "Order Volume", weight: W.orders, score: cl(ordExp > 0 ? (k.orders / ordExp) * 100 : 50), desc: `${k.orders} orders processed vs ~${Math.round(ordExp)} target pace` },
      { name: "Average Order Value", weight: W.aov, score: cl((k.aov / T.aovBenchmark) * 100), desc: `₹${k.aov.toFixed(0)} avg vs ₹${T.aovBenchmark} benchmark` },
      { name: "Discount Discipline", weight: W.discount, score: cl((100 * (20 - k.wdisc)) / (20 - 8)), desc: `${k.wdisc.toFixed(1)}% weighted average discount (goal ≤${T.discountPct}%)` },
      { name: "Return Control", weight: W.returns, score: cl((100 * (8 - k.returnRate)) / (8 - 1)), desc: `${k.returnRate.toFixed(1)}% return rate (goal ≤${T.returnRatePct}%)` },
      { name: "Customer Acquisition", weight: W.customer, score: cl((newPct / T.newCustTarget) * 100), desc: `${newPct.toFixed(1)}% new customers (target ≥${T.newCustTarget}%)` },
      { name: "Staff Productivity", weight: W.employee, score: cl(empExp > 0 ? (revPerEmp / empExp) * 100 : 0), desc: `₹${revPerEmp.toFixed(0)} rev / manager average` }
    ];

    const total = Math.round(comps.reduce((acc, c) => acc + c.score * c.weight, 0) / 100);

    let bandText = "Needs Attention";
    let bandColor = "text-red-600";
    if (total >= 80) {
      bandText = "Excellent Health";
      bandColor = "text-green-600";
    } else if (total >= 65) {
      bandText = "Good Health";
      bandColor = "text-amber-600";
    } else if (total >= 50) {
      bandText = "Average Health";
      bandColor = "text-text-primary";
    }

    return { total, bandText, bandColor, comps };
  }, [windowRows, target]);

  return (
    <div className="space-y-6">
      {/* Gauge ring */}
      <Card className="bg-bg-secondary p-4 shadow-elevation">
        <CardHeader title="Health Score Summary" />
        <CardBody className="flex flex-col items-center pt-2">
          <div className="relative w-36 h-36 flex items-center justify-center my-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(10,10,10,0.04)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#E6BD00"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthInfo.total / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="fs-display font-bold text-text-primary block">{healthInfo.total}</span>
              <span className="fs-caption text-text-tertiary uppercase tracking-wider font-bold">Health / 100</span>
            </div>
          </div>

          <div className={`fs-section font-bold ${healthInfo.bandColor} mt-2`}>{healthInfo.bandText}</div>
        </CardBody>
      </Card>

      {/* Breakdown list */}
      <div className="space-y-4">
        {healthInfo.comps.map((c) => (
          <Card key={c.name} className="bg-bg-secondary p-4 shadow-elevation">
            <div className="flex justify-between items-baseline mb-2">
              <span className="fs-small font-bold text-text-primary">{c.name}</span>
              <span className="fs-small font-bold text-brand-yellow">{c.score.toFixed(0)} / 100</span>
            </div>
            <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden mb-2">
              <div className="bg-brand-yellow h-full rounded-full" style={{ width: `${c.score}%` }} />
            </div>
            <p className="fs-caption text-text-secondary leading-normal">{c.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── CUSTOM HELPER PARSING FUNCTIONS ──
function calculateKpis(rows: DashboardRow[]) {
  const orderSet = new Set(rows.map((r) => r.orderId).filter(Boolean));
  const orders = orderSet.size;
  const rev = rows.reduce((s, r) => s + r.rev, 0);
  const qty = rows.reduce((s, r) => s + r.qty, 0);
  const retQty = rows.reduce((s, r) => s + r.retQty, 0);
  const retAmt = rows.reduce((s, r) => s + r.retAmt, 0);
  const disc = rows.reduce((s, r) => s + r.discount, 0);
  const gross = rev + disc;

  const newCustSet = new Set(rows.filter((r) => r.newCust).map((r) => r.custKey).filter(Boolean));

  return {
    orders,
    rev,
    qty,
    retQty,
    retAmt,
    net: rev - retAmt,
    disc,
    wdisc: gross > 0 ? (disc / gross) * 100 : 0,
    aov: orders > 0 ? rev / orders : 0,
    upt: orders > 0 ? qty / orders : 0,
    asp: qty > 0 ? rev / qty : 0,
    returnRate: qty > 0 ? (retQty / qty) * 100 : 0,
    newCust: newCustSet.size
  };
}

function detectDateOrder(strs: string[]): boolean {
  let df = 0, mf = 0;
  strs.forEach((s) => {
    const m = String(s || "").match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]/);
    if (m) {
      const a = +m[1];
      const b = +m[2];
      if (a > 12 && b <= 12) df++;
      else if (b > 12 && a <= 12) mf++;
    }
  });
  return mf > df ? false : true;
}

function parseDate(s: any, dateDayFirst: boolean): Date | null {
  if (s == null) return null;
  s = String(s).trim();
  if (!s || s === "-" || s.indexOf("#") > -1) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n >= 20000 && n <= 80000) return new Date(Math.round((n - 25569) * 86400000));
    if (n > 1e12) return new Date(n);
    return null;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}([ T]|$)/.test(s)) {
    const iso = new Date(s.replace(" ", "T"));
    if (!isNaN(iso.getTime())) return iso;
  }
  const t = s.replace(/^[A-Za-z]{3,9},?\s+/, "").replace(/\s+/g, " ").trim();
  const MON: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const hr = (h: number, ap?: string) => {
    h = +h || 0;
    if (/p/i.test(ap || "") && h < 12) h += 12;
    if (/a/i.test(ap || "") && h === 12) h = 0;
    return h;
  };
  
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    let y3 = +m[3];
    if (y3 < 100) y3 += 2000;
    let mo, day;
    if (a > 12) {
      mo = b - 1;
      day = a;
    } else if (b > 12) {
      mo = a - 1;
      day = b;
    } else if (dateDayFirst) {
      mo = b - 1;
      day = a;
    } else {
      mo = a - 1;
      day = b;
    }
    const dd = new Date(y3, mo, day, hr(Number(m[4]), m[7]), +(m[5] || 0), +(m[6] || 0));
    if (!isNaN(dd.getTime())) return dd;
  }
  
  const mm = t.match(/^(\d{1,2})[ \-]([A-Za-z]{3,9})[ \-,]+(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  if (mm) {
    const k = mm[2].slice(0, 3).toLowerCase();
    if (k in MON) {
      let y = +mm[3];
      if (y < 100) y += 2000;
      const d1 = new Date(y, MON[k], +mm[1], hr(Number(mm[4]), mm[7]), +(mm[5] || 0), +(mm[6] || 0));
      if (!isNaN(d1.getTime())) return d1;
    }
  }
  
  const mn = t.match(/^([A-Za-z]{3,9})[ \-](\d{1,2})[ \-,]+(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?/);
  if (mn) {
    const k2 = mn[1].slice(0, 3).toLowerCase();
    if (k2 in MON) {
      let y2 = +mn[3];
      if (y2 < 100) y2 += 2000;
      const d2 = new Date(y2, MON[k2], +mn[2], hr(Number(mn[4]), mn[7]), +(mn[5] || 0), +(mn[6] || 0));
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  
  const g = new Date(s);
  if (!isNaN(g.getTime())) return g;
  return null;
}

function payCat(p: string): string {
  p = (p || "").toUpperCase();
  if (p.includes("CASH")) return "Cash";
  if (p.includes("QR") || p.includes("UPI")) return "UPI";
  if (p.includes("RAZORPAY_POS") || p.includes("CARD") || p.includes("POS")) return "Card / POS";
  if (p.includes("RAZORPAY")) return "Razorpay";
  return p ? "Others" : "Unknown";
}

function toNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function buildRow(r: any, dt: Date | null, i: number, dateDayFirst: boolean): DashboardRow {
  const otRaw = (r["Order Type"] || "").trim().toUpperCase();
  const orderType = otRaw === "ONLINE" ? "Online" : "Offline";
  const coupon = toNum(r["Total Coupon Amount"]);
  const combo = toNum(r["Combo Discount Amount"]);
  const rev = toNum(r["Amount Paid"]);
  const empName = (r["Employee Name"] || "").trim();
  const storeName = (r["Store Name"] || "").trim();
  return {
    idx: i,
    orderId: (r["POS Order ID"] || "").trim(),
    date: dt,
    type: orderType,
    otRaw,
    product: (r["Product Name"] || "").trim() || "—",
    variant: (r["Variant Name"] || "").trim(),
    size: (r["Size"] || "").trim(),
    sku: (r["Item Code"] || "").trim() || "—",
    qty: toNum(r["Quantity"]),
    retQty: Math.abs(toNum(r["Returned Quantity"])),
    mrp: toNum(r["MRP"]),
    rev: rev,
    retAmt: Math.abs(toNum(r["Return Amount"])),
    coupon,
    combo,
    priceAdj: toNum(r["Price Adjustment Discount Amount"]),
    freebie: toNum(r["Freebie Discount Amount"]),
    discount: coupon + combo,
    couponName: [r["Shopify Coupon Name"], r["Store Coupon Name"], r["Custom Coupon Name"]]
      .map((x) => (x || "").trim())
      .filter((x) => x && x !== "-" && x !== "PERCENTAGE" && x !== "FIXED")[0] || "No coupon",
    store: storeName,
    emp: empName || "Store login",
    empId: (r["Employee ID"] || "").trim(),
    custKey: (r["Customer Phone"] || r["Customer Email"] || r["Customer Name"] || "").trim(),
    custName: (r["Customer Name"] || "").trim() || "Guest",
    newCust: /^y/i.test(r["New Customer"] || ""),
    source: (r["Source"] || "").trim() && r["Source"] !== "-" ? r["Source"].trim() : "Unattributed",
    heard: (r["Heard About Frido"] || "").trim(),
    payment: payCat(r["Payment Modes"]),
    payRaw: (r["Payment Modes"] || "").trim(),
    retReason: (r["Return Reason"] || "").trim() && r["Return Reason"] !== "-" ? r["Return Reason"].trim() : ""
  };
}
