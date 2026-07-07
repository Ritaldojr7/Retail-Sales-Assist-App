import type { DSRFormValues, DSRMetrics } from "./types";

/** Check if selected store is Sky City Mall, Borivali (supports Mobility split) */
export function isMobilityStore(store: string): boolean {
  return (
    store.includes("Sky City Mall") ||
    store.toLowerCase().includes("skycity")
  );
}

/** Calculate all DSR metrics from form values */
export function calculateDSRMetrics(
  values: DSRFormValues,
  activeStore: string
): DSRMetrics {
  const dateObj = values.date ? new Date(values.date) : new Date();

  // Date and calendar counts
  const dayOfMonth = dateObj.getDate();
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Basic values
  const totalOrders = values.ccOrders + values.onlineOrders;
  const totalWalkins = values.newWalkins + values.otherWalkins;

  // Percentage Calculations
  const cvrRate =
    values.newWalkins > 0
      ? (totalOrders / values.newWalkins) * 100
      : 0;
  const reviewRate =
    values.newWalkins > 0
      ? (values.reviewsTaken / values.newWalkins) * 100
      : 0;
  const nonConverting = values.newWalkins - totalOrders;
  const captureRate =
    nonConverting > 0
      ? (values.leadsCaptured / nonConverting) * 100
      : 0;

  // Revenue variables
  let dailyAverage = 0;
  let projectedRevenue = 0;

  if (isMobilityStore(activeStore)) {
    // In Skycity, daily average is calculated on Non Mobility MTD
    dailyAverage =
      dayOfMonth > 0 ? values.nmMtd / dayOfMonth : 0;
    projectedRevenue = dailyAverage * daysInMonth;
  } else {
    dailyAverage =
      dayOfMonth > 0 ? values.salesMtd / dayOfMonth : 0;
    projectedRevenue = dailyAverage * daysInMonth;
  }

  return {
    dateStr: values.date.split("-").reverse().join("-"), // DD-MM-YYYY format
    dayOfMonth,
    daysInMonth,
    ccOrders: values.ccOrders,
    onlineOrders: values.onlineOrders,
    totalOrders,
    newWalkins: values.newWalkins,
    otherWalkins: values.otherWalkins,
    totalWalkins,
    cashCounter: values.cashCounter,
    reviewsTaken: values.reviewsTaken,
    leadsCaptured: values.leadsCaptured,
    lastMonthRev: values.lastMonthRev,
    cvrRate,
    reviewRate,
    captureRate,
    nmToday: values.nmToday,
    nmMtd: values.nmMtd,
    mToday: values.mToday,
    mMtd: values.mMtd,
    salesToday: values.salesToday,
    salesMtd: values.salesMtd,
    dailyAverage,
    projectedRevenue,
  };
}

/** Format number with Indian locale */
export function formatNum(val: number): string {
  return Math.round(val).toLocaleString("en-IN");
}

/** Format percentage */
export function formatPct(
  p: number,
  forceDecimals: number | null = null
): string {
  if (forceDecimals !== null) return p.toFixed(forceDecimals) + "%";
  return (p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)) + "%";
}

/** Get today's date in YYYY-MM-DD format */
export function getTodayDate(): string {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000);
  return localToday.toISOString().split("T")[0];
}
