import { CONFIG, db, kv } from './database.js';
import { toast, busy } from './app.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let activeStore = "";

document.addEventListener("DOMContentLoaded", () => {
  initDSRView();

  // Listen to profile/store changes to adapt form layout
  window.addEventListener("storechanged", e => {
    activeStore = e.detail;
    renderDSRSalesFields();
    updateDSRPreviewTable();
  });

  const profile = db.getProfile();
  if (profile) {
    activeStore = profile.store;
    renderDSRSalesFields();
    updateDSRPreviewTable();
  }
});

function initDSRView() {
  // Pre-fill date with today's date in local time (YYYY-MM-DD for input)
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset*60*1000));
  $("#dsr-date").value = localToday.toISOString().split('T')[0];

  // Setup form change listener to update Excel format live
  const formInputs = [
    "#dsr-date", "#dsr-cc-orders", "#dsr-online-orders",
    "#dsr-new-walkins", "#dsr-other-walkins", "#dsr-cash-counter",
    "#dsr-reviews-taken", "#dsr-leads-captured", "#dsr-last-month-rev"
  ];

  formInputs.forEach(selector => {
    $(selector).addEventListener("input", updateDSRPreviewTable);
    $(selector).addEventListener("change", updateDSRPreviewTable);
  });

  // Action Buttons
  $("#dsr-snap-btn").addEventListener("click", handleTakeDSRSnapshot);
  $("#dsr-save-btn").addEventListener("click", handleSaveDSR);

  renderDSRHistoryLog();
}

// Check if selected store is Sky City Mall, Borivali
function isMobilityStore() {
  return activeStore.includes("Sky City Mall") || activeStore.toLowerCase().includes("skycity");
}

// Render sales inputs depending on if store supports mobility or single sales
function renderDSRSalesFields() {
  const container = $("#dsr-sales-section");
  if (!container) return;

  if (isMobilityStore()) {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label class="f" for="dsr-nm-today">Non Mobility Sales Today (₹)</label>
          <input type="number" id="dsr-nm-today" value="0" min="0">
        </div>
        <div>
          <label class="f" for="dsr-nm-mtd">Non Mobility Sales MTD (₹)</label>
          <input type="number" id="dsr-nm-mtd" value="0" min="0">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
        <div>
          <label class="f" for="dsr-m-today">Mobility Sales Today (₹)</label>
          <input type="number" id="dsr-m-today" value="0" min="0">
        </div>
        <div>
          <label class="f" for="dsr-m-mtd">Mobility Sales MTD (₹)</label>
          <input type="number" id="dsr-m-mtd" value="0" min="0">
        </div>
      </div>
    `;
    $("#dsr-nm-today").addEventListener("input", updateDSRPreviewTable);
    $("#dsr-nm-mtd").addEventListener("input", updateDSRPreviewTable);
    $("#dsr-m-today").addEventListener("input", updateDSRPreviewTable);
    $("#dsr-m-mtd").addEventListener("input", updateDSRPreviewTable);
  } else {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label class="f" for="dsr-sales-today">Sales Today (₹)</label>
          <input type="number" id="dsr-sales-today" value="0" min="0">
        </div>
        <div>
          <label class="f" for="dsr-sales-mtd">Sales MTD (₹)</label>
          <input type="number" id="dsr-sales-mtd" value="0" min="0">
        </div>
      </div>
    `;
    $("#dsr-sales-today").addEventListener("input", updateDSRPreviewTable);
    $("#dsr-sales-mtd").addEventListener("input", updateDSRPreviewTable);
  }
}

// ── Math Calculations & Formula Logic ──
function calculateDSRMetrics() {
  const dateVal = $("#dsr-date").value;
  const dateObj = dateVal ? new Date(dateVal) : new Date();
  
  // Date and calendar counts
  const dayOfMonth = dateObj.getDate();
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Basic values
  const ccOrders = Number($("#dsr-cc-orders").value) || 0;
  const onlineOrders = Number($("#dsr-online-orders").value) || 0;
  const totalOrders = ccOrders + onlineOrders;

  const newWalkins = Number($("#dsr-new-walkins").value) || 0;
  const otherWalkins = Number($("#dsr-other-walkins").value) || 0;
  const totalWalkins = newWalkins + otherWalkins;

  const cashCounter = Number($("#dsr-cash-counter").value) || 0;
  const reviewsTaken = Number($("#dsr-reviews-taken").value) || 0;
  const leadsCaptured = Number($("#dsr-leads-captured").value) || 0;
  const lastMonthRev = Number($("#dsr-last-month-rev").value) || 0;

  // Percentage Calculations
  const cvrRate = newWalkins > 0 ? (totalOrders / newWalkins) * 100 : 0;
  const reviewRate = newWalkins > 0 ? (reviewsTaken / newWalkins) * 100 : 0;
  const nonConverting = newWalkins - totalOrders;
  const captureRate = nonConverting > 0 ? (leadsCaptured / nonConverting) * 100 : 0;

  // Store Sales Variables
  let nmToday = 0, nmMtd = 0, mToday = 0, mMtd = 0;
  let salesToday = 0, salesMtd = 0;
  let dailyAverage = 0, projectedRevenue = 0;

  if (isMobilityStore()) {
    nmToday = Number($("#dsr-nm-today")?.value) || 0;
    nmMtd = Number($("#dsr-nm-mtd")?.value) || 0;
    mToday = Number($("#dsr-m-today")?.value) || 0;
    mMtd = Number($("#dsr-m-mtd")?.value) || 0;
    
    // In Skycity, daily average is calculated on Non Mobility MTD
    dailyAverage = dayOfMonth > 0 ? (nmMtd / dayOfMonth) : 0;
    projectedRevenue = dailyAverage * daysInMonth;
  } else {
    salesToday = Number($("#dsr-sales-today")?.value) || 0;
    salesMtd = Number($("#dsr-sales-mtd")?.value) || 0;

    dailyAverage = dayOfMonth > 0 ? (salesMtd / dayOfMonth) : 0;
    projectedRevenue = dailyAverage * daysInMonth;
  }

  return {
    dateStr: dateVal.split('-').reverse().join('-'), // DD-MM-YYYY format
    dayOfMonth,
    daysInMonth,
    ccOrders,
    onlineOrders,
    totalOrders,
    newWalkins,
    otherWalkins,
    totalWalkins,
    cashCounter,
    reviewsTaken,
    leadsCaptured,
    lastMonthRev,
    cvrRate,
    reviewRate,
    captureRate,
    nmToday,
    nmMtd,
    mToday,
    mMtd,
    salesToday,
    salesMtd,
    dailyAverage,
    projectedRevenue
  };
}

// ── Render Dynamic DSR Preview Table ──
function updateDSRPreviewTable() {
  const table = $("#dsr-preview-table");
  if (!table) return;

  const data = calculateDSRMetrics();
  const formatNum = val => Math.round(val).toLocaleString("en-IN");
  
  // Format percentage helper: rounds to integer if it fits, else 2 decimals (to match images)
  const formatPct = (p, forceDecimals = null) => {
    if (forceDecimals !== null) return p.toFixed(forceDecimals) + "%";
    return (p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)) + "%";
  };

  const storeNameShort = activeStore.includes("Sky City Mall") ? "Skycity" : activeStore.split(",")[0];

  let html = "";
  if (isMobilityStore()) {
    // Render Dual Sales Table (Non-Mobility + Mobility) matching Image 2
    html = `
      <tr class="header-row">
        <td colspan="3">DSR Format</td>
      </tr>
      <tr class="date-row">
        <td class="label-cell">Date</td>
        <td colspan="2" class="center-value-cell">${data.dateStr}</td>
      </tr>
      <tr class="store-row">
        <td class="label-cell">Store</td>
        <td colspan="2" class="center-value-cell">${esc(storeNameShort)}</td>
      </tr>
      <tr class="today-mtd-header">
        <td></td>
        <td>Today</td>
        <td>MTD</td>
      </tr>
      <tr>
        <td class="label-cell">Non Mobility Sales</td>
        <td class="value-cell">${formatNum(data.nmToday)}</td>
        <td class="value-cell">${formatNum(data.nmMtd)}</td>
      </tr>
      <tr>
        <td class="label-cell">Mobility Sales</td>
        <td class="value-cell">${data.mToday > 0 ? formatNum(data.mToday) : ""}</td>
        <td class="value-cell">${formatNum(data.mMtd)}</td>
      </tr>
      <tr class="cc-online-header">
        <td></td>
        <td>C&C</td>
        <td>Online</td>
      </tr>
      <tr>
        <td class="label-cell">Orders</td>
        <td class="value-cell">${data.ccOrders}</td>
        <td class="value-cell">${data.onlineOrders}</td>
      </tr>
      <tr class="new-other-header">
        <td></td>
        <td>New</td>
        <td>Other</td>
      </tr>
      <tr>
        <td class="label-cell">Walk-ins</td>
        <td class="value-cell">${data.newWalkins}</td>
        <td class="value-cell">${data.otherWalkins}</td>
      </tr>
      <tr>
        <td class="label-cell">Total Walkins</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${data.totalWalkins}</td>
      </tr>
      <tr>
        <td class="label-cell">CVR %</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatPct(data.cvrRate, 2)}</td>
      </tr>
      <tr>
        <td class="label-cell">Cash In Counter</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.cashCounter)}</td>
      </tr>
      <tr class="reviews-header">
        <td></td>
        <td>Total</td>
        <td>Taken Rate</td>
      </tr>
      <tr>
        <td class="label-cell">Review Taken</td>
        <td class="value-cell">${data.reviewsTaken}</td>
        <td class="value-cell">${formatPct(data.reviewRate, 2)}</td>
      </tr>
      <tr class="leads-header">
        <td></td>
        <td>Total</td>
        <td>Capture Rate</td>
      </tr>
      <tr>
        <td class="label-cell">Leads Captured</td>
        <td class="value-cell">${data.leadsCaptured}</td>
        <td class="value-cell">${formatPct(data.captureRate, 0)}</td>
      </tr>
      <tr class="revenue-header-row">
        <td colspan="3">★ Revenue Insights ★</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Last Month's Revenue</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.lastMonthRev)}</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Daily Average / Day</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.dailyAverage)}</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Projected Revenue</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.projectedRevenue)}</td>
      </tr>
    `;
  } else {
    // Render Single Sales Table matching Image 3
    html = `
      <tr class="header-row">
        <td colspan="3">DSR Format</td>
      </tr>
      <tr class="date-row">
        <td class="label-cell">Date</td>
        <td colspan="2" class="center-value-cell">${data.dateStr}</td>
      </tr>
      <tr class="store-row">
        <td class="label-cell">Store</td>
        <td colspan="2" class="center-value-cell">${esc(storeNameShort)}</td>
      </tr>
      <tr class="today-mtd-header">
        <td></td>
        <td>Today</td>
        <td>MTD</td>
      </tr>
      <tr>
        <td class="label-cell">Sales</td>
        <td class="value-cell">${formatNum(data.salesToday)}</td>
        <td class="value-cell">${formatNum(data.salesMtd)}</td>
      </tr>
      <tr class="cc-online-header">
        <td></td>
        <td>C&C</td>
        <td>Online</td>
      </tr>
      <tr>
        <td class="label-cell">Orders</td>
        <td class="value-cell">${data.ccOrders}</td>
        <td class="value-cell">${data.onlineOrders}</td>
      </tr>
      <tr class="new-other-header">
        <td></td>
        <td>New</td>
        <td>Other</td>
      </tr>
      <tr>
        <td class="label-cell">Walk-ins</td>
        <td class="value-cell">${data.newWalkins}</td>
        <td class="value-cell">${data.otherWalkins}</td>
      </tr>
      <tr>
        <td class="label-cell">Total</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${data.totalWalkins}</td>
      </tr>
      <tr>
        <td class="label-cell">CVR %</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatPct(data.cvrRate, 2)}</td>
      </tr>
      <tr>
        <td class="label-cell">Cash In Counter</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.cashCounter)}</td>
      </tr>
      <tr class="reviews-header">
        <td></td>
        <td>Total</td>
        <td>Taken Rate</td>
      </tr>
      <tr>
        <td class="label-cell">GMB Reviews taken</td>
        <td class="value-cell">${data.reviewsTaken}</td>
        <td class="value-cell">${formatPct(data.reviewRate, 0)}</td>
      </tr>
      <tr class="leads-header">
        <td></td>
        <td>Total</td>
        <td>Captured Rate</td>
      </tr>
      <tr>
        <td class="label-cell">Leads Captured</td>
        <td class="value-cell">${data.leadsCaptured}</td>
        <td class="value-cell">${formatPct(data.captureRate, 0)}</td>
      </tr>
      <tr class="revenue-header-row">
        <td colspan="3">★ Revenue Insights ★</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Last Month's Revenue</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.lastMonthRev)}</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Daily Average / Day</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.dailyAverage)}</td>
      </tr>
      <tr class="insights-row">
        <td class="label-cell">Projected Revenue</td>
        <td colspan="2" class="value-cell" style="font-weight:700;">${formatNum(data.projectedRevenue)}</td>
      </tr>
    `;
  }
  table.innerHTML = html;
}

// ── html2canvas Snapshot Handler ──
function handleTakeDSRSnapshot() {
  const captureArea = $("#dsr-table-capture-area");
  if (!captureArea) return;

  const btn = $("#dsr-snap-btn");
  busy(btn, true, "Capturing...");

  // Capture table as high-quality image
  html2canvas(captureArea, {
    backgroundColor: "#FFFBF0",
    scale: 2, // 2x density
    logging: false
  }).then(canvas => {
    try {
      const link = document.createElement("a");
      const dateStr = $("#dsr-date").value;
      const storeClean = activeStore.split(',')[0].trim().replace(/\s+/g, '_');
      link.download = `DSR_${storeClean}_${dateStr}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("DSR Snapshot captured & downloaded successfully!");
    } catch (e) {
      toast("Snapshot save failed. Try on desktop browser.", true);
    }
    busy(btn, false);
  }).catch(err => {
    console.error("Canvas capture error: ", err);
    toast("Snapshot rendering failed.", true);
    busy(btn, false);
  });
}

// ── Save DSR Handler ──
async function handleSaveDSR() {
  if (!activeStore) return toast("Setup store profile before saving reports.", true);

  const data = calculateDSRMetrics();
  const dateVal = $("#dsr-date").value;
  
  const btn = $("#dsr-save-btn");
  busy(btn, true, "Saving...");

  try {
    await db.post({
      action: "dsr",
      date: dateVal,
      ...data
    });

    toast("DSR numbers successfully stored locally!");
    renderDSRHistoryLog();

    // Trigger custom event to notify analytics graphs
    window.dispatchEvent(new CustomEvent("dsrsaved"));
  } catch (e) {
    toast("Unable to save DSR metrics.", true);
  }
  busy(btn, false);
}

// ── Render Saved DSR Log History ──
function renderDSRHistoryLog() {
  const container = $("#dsr-history-list");
  if (!container) return;

  const items = db.getLocalList("dsr");
  if (items.length === 0) {
    container.innerHTML = `<div class="feedempty">No saved DSR submissions found.</div>`;
    return;
  }

  // Reverse list to show newest first
  container.innerHTML = [...items].reverse().map(item => {
    const isMob = item.store.includes("Sky City Mall") || item.store.toLowerCase().includes("skycity");
    const totalRev = isMob 
      ? (Number(item.nmMtd) || 0) + (Number(item.mMtd) || 0)
      : (Number(item.salesMtd) || 0);

    const dateFormatted = item.date.split('-').reverse().join('-');
    const storeShort = item.store.split(',')[0];

    return `
      <div class="history-card">
        <div class="history-info">
          <div class="store-name">${esc(storeShort)}</div>
          <div class="meta">Date: <b>${dateFormatted}</b> · MTD Sales: <b>₹${totalRev.toLocaleString("en-IN")}</b></div>
        </div>
        <div class="history-actions">
          <button class="action-icon-btn delete" data-ts="${item.ts}" title="Delete Log">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach delete click listeners
  container.querySelectorAll(".delete").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Delete this saved DSR log entry?")) {
        db.deleteLocalItem("dsr", btn.dataset.ts);
        toast("DSR log deleted.");
        renderDSRHistoryLog();
        window.dispatchEvent(new CustomEvent("dsrsaved"));
      }
    });
  });
}
