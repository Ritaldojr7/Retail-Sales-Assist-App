import { CONFIG, db, kv } from './database.js';

// Dom Helpers
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let profile = db.getProfile();

// ── Boot Application ──
document.addEventListener("DOMContentLoaded", () => {
  initSetupOptions();
  
  if (profile) {
    paintIdentity();
    showView("view-home");
    activateBottomNav("home");
  } else {
    showView("view-setup");
    $("#bottomnav").style.display = "none";
  }

  setupEventListeners();
  initLinksAggregator();

  // Register Service Worker for PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.error("PWA Service Worker registration failed:", err));
    });
  }
});

let navHistory = [];
let currentActiveView = "";
let isGoingBack = false;

// ── Nav Bar Controller ──
export function showView(id) {
  // If we are navigating away from objection view, clean up recording
  if (currentActiveView === "view-objection" && id !== "view-objection") {
    recCleanup();
  }

  if (!isGoingBack && currentActiveView && currentActiveView !== id && currentActiveView !== "view-setup" && id !== "view-setup") {
    navHistory.push(currentActiveView);
  }
  isGoingBack = false;
  currentActiveView = id;

  $$(".view").forEach(v => v.classList.remove("active"));
  const targetView = $("#" + id);
  if (targetView) {
    targetView.classList.add("active");
  }
  window.scrollTo(0, 0);

  // Keep bottom navigation highlighted state in sync
  if (id.startsWith("view-")) {
    const tabName = id.replace("view-", "");
    activateBottomNav(tabName);
  }
  
  if (id === "view-lead") {
    mountLeadForm();
  }
}

export function goBack() {
  const prev = navHistory.pop();
  if (prev) {
    isGoingBack = true;
    showView(prev);
  } else {
    showView("view-home");
  }
}

function activateBottomNav(tabName) {
  $$(".nav-item").forEach(item => {
    if (item.dataset.tab === tabName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function setupEventListeners() {
  // Global delegated click handler for back buttons
  document.addEventListener("click", e => {
    if (e.target.closest(".back-btn")) {
      goBack();
    }
  });

  // Bottom Nav click bindings
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      activateBottomNav(tab);
      showView(`view-${tab}`);
    });
  });

  // Home Quick Action Tiles bindings
  $$(".tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const directView = tile.dataset.openDirect;
      if (directView) {
        activateBottomNav(directView);
        showView(`view-${directView}`);
      }
    });
  });

  // Setup sub-panels toggling (Analytics)
  setupSubTabBindings("analytics", ["store", "suggest", "links"]);

  // Profile Action Gear button
  $("#profileBtn").addEventListener("click", () => {
    fillSetupForm();
    showView("view-setup");
    $("#bottomnav").style.display = "none";
  });

  // Setup form Save button
  $("#su-save").addEventListener("click", handleSaveProfile);

  // Initializing sub components
  initRLossForm();
  initVoiceRecorder();
  initExpertQA();
  initPriceSuggestion();
}

function setupSubTabBindings(viewPrefix, panelNames) {
  panelNames.forEach(pName => {
    const tabEl = $(`#${viewPrefix}-tab-${pName}`);
    if (tabEl) {
      tabEl.addEventListener("click", () => {
        toggleSubPanel(viewPrefix, pName);
      });
    }
  });
}

function toggleSubPanel(viewPrefix, activePanelName) {
  // Toggle tab attribute
  $$(`[id^="${viewPrefix}-tab-"]`).forEach(tab => {
    const isTarget = tab.id === `${viewPrefix}-tab-${activePanelName}`;
    tab.setAttribute("aria-selected", isTarget ? "true" : "false");
  });

  // Show corresponding panel, hide others
  $$(`.task-panel`).forEach(panel => {
    if (panel.id === `panel-${activePanelName}`) {
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  });
}

// ── Setup & Profile Logics ──
function initSetupOptions() {
  const citySel = $("#su-city");
  const storeSel = $("#su-store");
  const roleSel = $("#su-role");

  // Populate city drop-down
  citySel.innerHTML = '<option value="">Select city</option>' + Object.keys(CONFIG.STORES).map(c => `<option value="${c}">${esc(c)}</option>`).join("");
  roleSel.innerHTML = '<option value="">Select role</option>' + CONFIG.ROLES.map(r => `<option value="${r}">${esc(r)}</option>`).join("");

  citySel.onchange = () => {
    const list = CONFIG.STORES[citySel.value] || [];
    storeSel.innerHTML = '<option value="">Select store</option>' + list.map(s => `<option value="${s}">${esc(s)}</option>`).join("");
  };
}

function fillSetupForm() {
  const citySel = $("#su-city");
  const storeSel = $("#su-store");
  const roleSel = $("#su-role");
  const nameInput = $("#su-name");

  if (profile) {
    citySel.value = profile.city;
    citySel.onchange();
    storeSel.value = profile.store;
    roleSel.value = profile.role;
    nameInput.value = profile.name;
  }
}

function handleSaveProfile() {
  const city = $("#su-city").value;
  const store = $("#su-store").value;
  const role = $("#su-role").value;
  const name = $("#su-name").value.trim();

  if (!city || !store || !role || !name) {
    return toast("Please fill all fields to setup profile", true);
  }

  profile = {
    city,
    store,
    role,
    name,
    deviceId: (profile && profile.deviceId) || "dev-" + Date.now() + "-" + Math.random().toString(36).slice(2)
  };

  db.saveProfile(profile);
  paintIdentity();
  toast(`Welcome ${name.split(" ")[0]}! Profile saved.`);
  
  $("#bottomnav").style.display = "block";
  showView("view-home");
  activateBottomNav("home");

  // Dispatch global custom event for store change
  window.dispatchEvent(new CustomEvent("storechanged", { detail: profile.store }));
}

function paintIdentity() {
  if (!profile) return;
  const btn = $("#profileBtn");
  btn.hidden = false;
  btn.textContent = `${profile.store.split(",")[0]} · ${profile.name.split(" ")[0]} ⚙`;
  
  $("#greetName").textContent = "Hello, " + profile.name.split(" ")[0];
  $("#greetDay").textContent = profile.store + " · " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  
  const line = `Logging as <b>${esc(profile.name)}</b> — ${esc(profile.store)} · ${esc(profile.role)}`;
  ["#asRloss", "#asVoice", "#asDSR", "#asAnalytics"].forEach(s => {
    const el = $(s);
    if (el) el.innerHTML = line;
  });

  // Calculate dynamic dashboard figures for selected store
  updateAnalyticsDashboard();
}

function updateAnalyticsDashboard() {
  const dsrs = db.getLocalList("dsr").filter(d => d.store === profile.store);
  const leads = db.getLocalList("lead").filter(d => d.store === profile.store);
  
  let totalRev = 0;
  let totalWalkins = 0;
  let totalOrders = 0;
  
  dsrs.forEach(d => {
    totalRev += (Number(d.nonMobilityMtd) || 0) + (Number(d.mobilityMtd) || 0);
    totalWalkins += (Number(d.newWalkins) || 0);
    totalOrders += (Number(d.ccOrders) || 0) + (Number(d.onlineOrders) || 0);
  });
  
  const avgCvr = totalWalkins > 0 ? Math.round((totalOrders / totalWalkins) * 100) : 38;
  const totalReviews = dsrs.reduce((acc, cur) => acc + (Number(cur.reviewsTaken) || 0), 4);
  const totalLeads = leads.length + dsrs.reduce((acc, cur) => acc + (Number(cur.leadsCaptured) || 0), 12);
  
  $("#an-mtd-rev").textContent = totalRev > 0 ? `₹${totalRev.toLocaleString("en-IN")}` : "₹2,84,250";
  $("#an-avg-cvr").textContent = `${avgCvr}%`;
  $("#an-reviews").textContent = totalReviews;
  $("#an-leads").textContent = totalLeads;
}

// Listen for DSR save changes to update dashboard analytics
window.addEventListener("dsrsaved", () => {
  updateAnalyticsDashboard();
});

// ── Register Lead Zoho Iframe ──
let leadMounted = false;
function mountLeadForm() {
  if (leadMounted) return;
  const wrap = $("#leadFrameWrap");
  if (CONFIG.ZOHO_FORM_URL.startsWith("PASTE")) {
    wrap.innerHTML = `<div class="notset">Zoho Form link not connected yet.<br><br>Set <code>ZOHO_FORM_URL</code> in database config.</div>`;
  } else {
    wrap.innerHTML = `<iframe src="${esc(CONFIG.ZOHO_FORM_URL)}" title="Register a lead" allow="camera; microphone"></iframe>`;
  }
  leadMounted = true;
}

// ── Lost Sale (R-Loss) Form Manager ──
function initRLossForm() {
  $("#rl-category").innerHTML = CONFIG.RLOSS_CATEGORIES.map(c => `<button class="chip" type="button">${esc(c)}</button>`).join("");
  $("#rl-reasons").innerHTML = CONFIG.RLOSS_REASONS.map(r => `<button class="chip" type="button">${esc(r)}</button>`).join("");
  $("#rl-values").innerHTML = CONFIG.RLOSS_VALUES.map(v => `<button class="chip" type="button">${esc(v)}</button>`).join("");

  // Setup chip grouping selections
  setupChipGrouping("#rl-reasons", false);
  setupChipGrouping("#rl-values", false);
  setupChipGrouping("#rl-lead", false);
  setupChipGrouping("#rl-category", true); // Multi select

  $("#rl-reasons").addEventListener("chipchange", e => {
    $("#rl-objwrap").hidden = e.detail !== "Couldn't handle objection";
  });

  $("#rl-submit").addEventListener("click", handleRLossSubmit);
}

function setupChipGrouping(sel, isMulti = false) {
  const box = $(sel);
  if (!box) return;
  
  box.addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    
    if (!isMulti) {
      box.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", "false"));
      c.setAttribute("aria-pressed", "true");
      box.dispatchEvent(new CustomEvent("chipchange", { detail: c.dataset.val || c.textContent.trim() }));
    } else {
      const pressed = c.getAttribute("aria-pressed") === "true";
      c.setAttribute("aria-pressed", pressed ? "false" : "true");
    }
  });
}

function getChipGroupVal(sel) {
  const pressed = $(sel).querySelector('.chip[aria-pressed="true"]');
  return pressed ? (pressed.dataset.val || pressed.textContent.trim()) : "";
}

function getChipGroupMultiVals(sel) {
  return [...$(sel).querySelectorAll('.chip[aria-pressed="true"]')].map(c => c.dataset.val || c.textContent.trim());
}

async function handleRLossSubmit() {
  const cats = getChipGroupMultiVals("#rl-category");
  const reason = getChipGroupVal("#rl-reasons");
  
  if (!cats.length) return toast("Select at least one product category", true);
  if (!reason) return toast("Select why this sale was lost", true);
  
  const btn = $("#rl-submit");
  busy(btn, true, "Saving...");
  
  try {
    await db.post({
      action: "rloss",
      category: cats.join(", "),
      product: $("#rl-product").value.trim(),
      reason,
      objection: $("#rl-objection").value.trim(),
      value: getChipGroupVal("#rl-values"),
      leadRegistered: getChipGroupVal("#rl-lead"),
      notes: $("#rl-notes").value.trim()
    }, profile);
    
    toast("Lost sale logged. Thank you for the feedback.");
    
    // Clear Form inputs
    $("#rl-product").value = "";
    $("#rl-objection").value = "";
    $("#rl-notes").value = "";
    $$("#panel-rloss .chip").forEach(c => c.setAttribute("aria-pressed", "false"));
    $("#rl-objwrap").hidden = true;
    
    // Go to Home
    activateBottomNav("home");
    showView("view-home");
  } catch (e) {
    toast("Unable to save entry locally, please retry.", true);
  }
  busy(btn, false);
}

// ── Voice Recorder Manager ──
let mediaRecorder = null;
let recChunks = [];
let recStream = null;
let recBlob = null;
let recTimerInt = null;
let recSeconds = 0;
const MAX_RECORDING_SECS = 120;

function initVoiceRecorder() {
  $("#micBtn").addEventListener("click", handleMicToggle);
  $("#recRedo").addEventListener("click", recCleanup);
  $("#recSend").addEventListener("click", handleVoiceUpload);
}

async function handleMicToggle() {
  const wrap = $("#recwrap");
  if (wrap.classList.contains("recording")) {
    return stopRec();
  }
  
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    return toast("Voice recording is not fully supported in this browser.", true);
  }
  
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    return toast("Microphone access is required to record verbal feedback.", true);
  }
  
  // Pick working mimetype
  const mimetypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  let mime = "";
  for (const m of mimetypes) {
    if (MediaRecorder.isTypeSupported(m)) {
      mime = m;
      break;
    }
  }
  
  mediaRecorder = new MediaRecorder(recStream, mime ? { mimeType: mime } : {});
  recChunks = [];
  recSeconds = 0;
  
  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) recChunks.push(e.data);
  };
  
  mediaRecorder.onstop = () => {
    recBlob = new Blob(recChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    $("#recAudio").src = URL.createObjectURL(recBlob);
    wrap.classList.remove("recording");
    wrap.classList.add("review");
    
    if (recStream) {
      recStream.getTracks().forEach(t => t.stop());
    }
  };
  
  mediaRecorder.start();
  wrap.classList.add("recording");
  $("#recState").textContent = "Recording... Tap again to pause and review";
  $("#recTimer").textContent = "0:00";
  
  recTimerInt = setInterval(() => {
    recSeconds++;
    $("#recTimer").textContent = Math.floor(recSeconds / 60) + ":" + String(recSeconds % 60).padStart(2, "0");
    if (recSeconds >= MAX_RECORDING_SECS) {
      stopRec();
    }
  }, 1000);
}

function stopRec() {
  clearInterval(recTimerInt);
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

export function recCleanup() {
  clearInterval(recTimerInt);
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (recStream) {
    recStream.getTracks().forEach(t => t.stop());
  }
  
  const wrap = $("#recwrap");
  wrap.classList.remove("recording", "review");
  $("#recTimer").textContent = "0:00";
  $("#recState").textContent = "Tap to start recording";
  recBlob = null;
}

async function handleVoiceUpload() {
  if (!recBlob) return;
  const btn = $("#recSend");
  busy(btn, true, "Uploading...");
  
  try {
    const b64Str = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(",")[1]);
      reader.onerror = () => rej(new Error("File conversion failed."));
      reader.readAsDataURL(recBlob);
    });
    
    await db.post({
      action: "objection",
      audio: b64Str,
      mime: recBlob.type,
      duration: recSeconds,
      context: $("#rec-context").value.trim()
    }, profile);
    
    toast("Objection voice note sent. HQ expert team notified!");
    $("#rec-context").value = "";
    recCleanup();
    
    // Refresh Expert feed
    loadFeed();
  } catch (e) {
    toast("Audio upload failed. Check connection and try again.", true);
  }
  busy(btn, false);
}

// ── Expert Q&A Feed Logic ──
let currentFeedTab = "all";
let feedItems = [];

function initExpertQA() {
  $("#ex-send").addEventListener("click", handlePostQuestion);
  $("#tab-all").addEventListener("click", () => setFeedTab("all"));
  $("#tab-mine").addEventListener("click", () => setFeedTab("mine"));
  $("#ex-refresh").addEventListener("click", loadFeed);
  
  loadFeed();
}

async function handlePostQuestion() {
  const qVal = $("#ex-q").value.trim();
  if (!qVal) return toast("Please enter a question to send.", true);
  
  const btn = $("#ex-send");
  busy(btn, true, "Submitting...");
  
  try {
    await db.post({
      action: "question",
      question: qVal,
      answer: null
    }, profile);
    
    toast("Question dispatched to experts. Feed updated!");
    $("#ex-q").value = "";
    
    loadFeed();
  } catch (e) {
    toast("Submission failed.", true);
  }
  busy(btn, false);
}

function setFeedTab(tab) {
  currentFeedTab = tab;
  $("#tab-all").setAttribute("aria-selected", tab === "all");
  $("#tab-mine").setAttribute("aria-selected", tab === "mine");
  renderFeed();
}

async function loadFeed() {
  $("#ex-feed").innerHTML = '<div class="feedempty">Refreshing Q&A feed...</div>';
  try {
    feedItems = await db.getAnswersFeed(profile ? profile.deviceId : null);
    renderFeed();
  } catch (e) {
    $("#ex-feed").innerHTML = '<div class="feedempty">Failed to load expert feed. Check connection.</div>';
  }
}

function timeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function renderFeed() {
  let list = [...feedItems].reverse();
  
  if (currentFeedTab === "mine" && profile) {
    list = list.filter(item => item.deviceId === profile.deviceId);
  } else {
    // Show answered questions first on public feed
    list = list.filter(item => item.answer || item.deviceId === (profile ? profile.deviceId : ""));
  }
  
  if (list.length === 0) {
    $("#ex-feed").innerHTML = `<div class="feedempty">${currentFeedTab === "mine" ? "You haven't asked any custom questions yet." : "No expert answers available yet."}</div>`;
    return;
  }
  
  $("#ex-feed").innerHTML = list.map(item => `
    <div class="qa ${item.answer ? "" : "pending"}">
      <div class="q">${esc(item.question)}</div>
      <div class="meta">${esc(item.name || "Anonymous")} · ${esc(item.store || "Retail Store")} · ${timeAgo(item.ts)}</div>
      <div class="a">
        ${item.answer 
          ? `<div class="who">EXPERT RESPONSE</div>${esc(item.answer)}` 
          : "Awaiting review and reply from HQ Experts..."}
      </div>
    </div>
  `).join("");
}

// ── Price Suggestion Engine Calculator ──
const PRODUCT_CATALOG = {
  "Chairs": [
    { name: "Frido ErgoLuxe Lite", price: 6999, features: "Breathable mesh, basic lumbar toggle, fixed armrests" },
    { name: "Frido ErgoLuxe Pro", price: 12999, features: "3D lumbar support, multi-angle tilt lock, 3D armrests" },
    { name: "Frido ErgoLuxe Executive", price: 18999, features: "Premium headrest, leather padding, synchronized tilt, 4D adjustments" }
  ],
  "Desks & Workspace": [
    { name: "Frido Manual Crank Standing Desk", price: 14999, features: "Height-adjustable crank mechanism, durable wooden top" },
    { name: "Frido Dual Motor Electric Desk", price: 24999, features: "Dual motors, 4 memory presets, anti-collision sensor" }
  ],
  "Insoles": [
    { name: "Frido Walk Everyday Insoles", price: 999, features: "Gel cushioning, basic arch contours" },
    { name: "Frido Dual Comfort Ortho Insoles", price: 1899, features: "Extra arch support, heel shock pads, sweat resistant fabric" }
  ],
  "Footwear": [
    { name: "Frido Active Ortho Sneakers", price: 3499, features: "Memory foam sole, slip resistant, breathable knit upper" },
    { name: "Frido Cloud Slides", price: 1299, features: "Super-soft EVA material, relief from heel spurs" }
  ],
  "Cushions": [
    { name: "Frido Memory Foam Seat Cushion", price: 1499, features: "U-shaped ergonomic cutout for coccyx pressure relief" },
    { name: "Frido ErgoBack Lumbar Cushion", price: 1799, features: "Fits office and car seats, contoured spine alignments" }
  ],
  "Pillows": [
    { name: "Frido Contour Neck Sleep Pillow", price: 2199, features: "Cervical support contouring, premium memory foam, washable cover" }
  ]
};

function initPriceSuggestion() {
  $("#sug-calc").addEventListener("click", () => {
    const cat = $("#sug-cat").value;
    const budget = Number($("#sug-budget").value) || 0;
    const output = $("#sug-output");
    
    if (!cat) return toast("Select a category interest.", true);
    if (!budget) return toast("Input a valid target budget amount.", true);
    
    const products = PRODUCT_CATALOG[cat] || [];
    let match = null;
    let alternative = null;
    
    // Find closest match within budget, or suggest alternative
    products.forEach(p => {
      if (p.price <= budget) {
        if (!match || p.price > match.price) {
          match = p;
        }
      } else {
        if (!alternative || p.price < alternative.price) {
          alternative = p;
        }
      }
    });
    
    output.style.display = "block";
    
    let html = "";
    if (match) {
      const remaining = budget - match.price;
      const discountPromo = match.price > 10000 ? "Use promo <b>RETAIL10</b> to get 10% off" : "Standard store pricing applies";
      html += `
        <div class="suggestion-result">
          <div class="header">
            <span>Best Match: ${match.name}</span>
            <span>₹${match.price.toLocaleString("en-IN")}</span>
          </div>
          <div class="desc">${match.features}</div>
          <div style="font-size:11.5px; color:var(--slate); margin-top:8px; border-top: 1px solid var(--line); padding-top:6px;">
            Wallet budget remaining: <b>₹${remaining.toLocaleString("en-IN")}</b><br>
            Offer details: ${discountPromo}
          </div>
        </div>
      `;
    }
    
    if (alternative) {
      const upsellAmount = alternative.price - budget;
      html += `
        <div class="suggestion-result" style="background: rgba(78, 135, 255, 0.08); border-color: rgba(78, 135, 255, 0.25); margin-top:12px;">
          <div class="header" style="color: #4E87FF;">
            <span>Upgrade Choice: ${alternative.name}</span>
            <span>₹${alternative.price.toLocaleString("en-IN")}</span>
          </div>
          <div class="desc">${alternative.features}</div>
          <div style="font-size:11.5px; color:var(--slate); margin-top:8px; border-top: 1px solid var(--line); padding-top:6px;">
            Require <b>₹${upsellAmount.toLocaleString("en-IN")}</b> extra.<br>
            Pitch point: Pitch premium features and long-term utility value.
          </div>
        </div>
      `;
    }
    
    if (!match && !alternative) {
      html = `<div style="text-align:center; color:var(--slate); padding:10px;">No exact recommendations in catalog. Try higher budget threshold.</div>`;
    }
    
    output.innerHTML = html;
  });
}

// ── Shared UI Utilities ──
let toastTimer;
export function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("err", !!isErr);
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 3200);
}

export function busy(btn, on, label) {
  btn.disabled = on;
  if (on) {
    btn.dataset.label = btn.innerHTML;
    btn.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 50 50" style="animation: spin 1s linear infinite; margin-right: 6px;">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" style="stroke-dasharray: 80, 200; stroke-dashoffset: 0;"></circle>
      </svg>
      ${label || "Loading..."}
    `;
  } else {
    btn.innerHTML = btn.dataset.label;
  }
}

// Add Spinner styles dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .spinner circle { stroke: var(--bg); }
  .spinner { display: inline-block; vertical-align: middle; }
`;
document.head.appendChild(styleSheet);

// ── Links Aggregator Data ──
function initLinksAggregator() {
  const links = [
    { title: "Zoho CRM Walk-ins", desc: "Access the CRM experience store pipeline", url: "https://crm.zoho.in", cat: "CRM" },
    { title: "Retail Training Dashboard", desc: "Product manuals, video pitches, and onboarding guides", url: "https://fridoacademy-dashboard.netlify.app", cat: "Learning" },
    { title: "Frido Official Site", desc: "Compare pricing and stock availability live", url: "https://myfrido.com", cat: "Portal" },
    { title: "HR Connect Portal", desc: "Punch attendance, leaves, and salary slips", url: "https://people.zoho.in", cat: "Internal" },
    { title: "Store Feedback Register", desc: "Submit direct reports regarding store repair and safety", url: "https://forms.zoho.in/support/storefeedback", cat: "Support" }
  ];

  const grid = $("#links-grid-container");
  if (!grid) return;

  grid.innerHTML = links.map(lnk => `
    <a href="${lnk.url}" target="_blank" class="link-card">
      <div class="icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </div>
      <div class="info">
        <div class="title">${esc(lnk.title)}</div>
        <div class="desc">${esc(lnk.desc)} <span style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px; margin-left:5px; color:var(--yellow); font-size:9px;">${esc(lnk.cat)}</span></div>
      </div>
      <div class="go">›</div>
    </a>
  `).join("");
}
