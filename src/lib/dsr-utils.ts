import type { DSRFormValues, DSRMetrics } from "./types";

export function isMobilityStore(store: string): boolean {
  return true;
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
    newWalkinsMtd: values.newWalkinsMtd,
    otherWalkinsMtd: values.otherWalkinsMtd,
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

/**
 * Capture the DSR preview as a canvas that matches the on-screen table.
 *
 * The live preview uses `border-collapse`, whose internal borders html2canvas
 * drops. We fix this only inside html2canvas's cloned DOM (`onclone`), leaving
 * the on-screen UI untouched: switch the table to `border-separate` and put real
 * 1px borders on every cell so the exported grid matches the preview.
 *
 * Note: box-shadow borders are intentionally avoided — html2canvas renders
 * inset box-shadows as solid black fills.
 */
export async function captureDsrSnapshot(
  element: HTMLElement
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;

  return html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
    useCORS: true,
    onclone: (_doc: Document, clonedRoot: HTMLElement) => {
      const root =
        clonedRoot ||
        (_doc.querySelector("[data-dsr-capture]") as HTMLElement) ||
        _doc.body;
      if (!root) return;

      root.querySelectorAll("table").forEach((tableNode) => {
        const table = tableNode as HTMLElement;
        table.style.borderCollapse = "separate";
        table.style.borderSpacing = "0";
        table.style.border = "2px solid #000000";
      });

      root.querySelectorAll("td, th").forEach((cellNode) => {
        const cell = cellNode as HTMLElement;
        cell.style.boxShadow = "none";
        cell.style.borderTop = "none";
        cell.style.borderLeft = "none";
        cell.style.borderRight = "1px solid #000000";
        cell.style.borderBottom = "1px solid #000000";
      });
    },
  });
}
