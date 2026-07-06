import { CONFIG, db } from './database.js';
import { toast, busy } from './app.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// List of all 19 store names from the configuration
const ALL_STORES_LIST = [
  "Phoenix Marketcity, Vimannagar",
  "Amanora Mall, Magarpatta",
  "Amar Tech Park, Balewadi",
  "Elpro Mall, PCMC",
  "Nexus Westend, Aundh",
  "Kopa Mall, Ghorpadi, KP",
  "Mall of Asia",
  "Lakeshore, Y junction",
  "Sky City Mall, Borivali",
  "Gachibowli, Hyderabad",
  "Banjara Hills",
  "Bhartiya Mall, Bangalore",
  "Kompally, Hyderabad",
  "Vegas Mall, Dwarka",
  "Lulu Mall, Bangalore",
  "Golfcourse Road, Gurgaon",
  "Omaxe world street, Faridabad",
  "Felix plaza, Gurgaon",
  "PMC, Whitefield Bangalore"
];

document.addEventListener("DOMContentLoaded", () => {
  initFootfallView();
});

function initFootfallView() {
  // Pre-fill date with today's date in local time
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset*60*1000));
  const dateInput = $("#ff-date");
  if (dateInput) {
    dateInput.value = localToday.toISOString().split('T')[0];
  }

  // Populate Dropdown selector with all 19 stores
  const storeSelect = $("#ff-store-select");
  if (storeSelect) {
    storeSelect.innerHTML = '<option value="">Select store</option>' + ALL_STORES_LIST.map(store => `
      <option value="${store}">${esc(store)}</option>
    `).join("");
  }

  // Pre-populate manager name & store from profile if available
  const profile = db.getProfile();
  if (profile) {
    const mgrInput = $("#ff-manager-name");
    if (mgrInput) mgrInput.value = profile.name;
    
    if (storeSelect) {
      storeSelect.value = profile.store;
    }
  }

  // Submission binding
  const submitBtn = $("#ff-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", handleFootfallSubmit);
  }
}

// ── Submit Mid-Day Footfall Entry ──
async function handleFootfallSubmit() {
  const storeName = $("#ff-store-select").value;
  const managerName = $("#ff-manager-name").value.trim();
  const dateVal = $("#ff-date").value;
  const count = $("#ff-count").value;
  const salesDone = $("#ff-sales-done").value;
  const anomaly = $("#ff-anomaly").value.trim();
  const remarks = $("#ff-remarks").value.trim();

  if (!storeName) return toast("Please select a Store Name.", true);
  if (!managerName) return toast("Please enter the Store Manager Name.", true);
  if (!dateVal) return toast("Please select a Date.", true);
  if (!count || count < 0) return toast("Please enter a valid Footfall Count.", true);
  if (!salesDone || salesDone < 0) return toast("Please enter the Sales Done till now.", true);

  const btn = $("#ff-submit");
  busy(btn, true, "Submitting...");

  try {
    const payload = {
      action: "footfall",
      storeName,
      managerName,
      date: dateVal,
      count: Number(count),
      salesDone: Number(salesDone),
      anomaly,
      remarks
    };

    // Save submission locally/remotely
    await db.post(payload);
    toast("Footfall Form submitted successfully!");

    // Clear form inputs except manager name & date & store select
    $("#ff-count").value = "";
    $("#ff-sales-done").value = "";
    $("#ff-anomaly").value = "";
    $("#ff-remarks").value = "";

  } catch (e) {
    toast("Failed to submit Footfall Form. Try again.", true);
  }
  busy(btn, false);
}
