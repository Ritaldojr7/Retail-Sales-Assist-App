import type { Profile, PostPayload, PostResult, QAItem } from "./types";

// ── Application Configuration ──
export const CONFIG = {
  // 1) Apps Script Web App URLs
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbMxRlF5H_aGCMxDBUbKA-saQ97rXSs8ykmnFeBXfaOxhGLA_wAlh8nv9nGOm6MpAUdjg/exec",
  DSR_APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyJKcIFrnQbgGuSdN_1QP_Eswsa8014-vgEqwMxnHM2aCUqBn34Bi10zCxAuI2Jh09v6w/exec",
  FOOTFALL_APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzEavZOIhY7RSGed62ma83kMlDoMFrlIRoJzVVvy1Ntmd8YhKL4vUAEoZtHqM4ZyGT3/exec",

  // 2) Zoho Forms perma link for the lead form
  ZOHO_FORM_URL:
    "https://forms.zohopublic.in/prathamtmyf1/form/FridoExperienceStoreVimanNagarWalkins/formperma/_Mxam7cRfBlEj9S2ogxrNb7UaJ0nfo-fYUPYDh4nHC8",

  // 3) Live store list (19 stores, 7 cities)
  STORES: {
    Pune: [
      "Phoenix Marketcity, Vimannagar",
      "Amanora Mall, Magarpatta",
      "Amar Tech Park, Balewadi",
      "Elpro Mall, PCMC",
      "Nexus Westend, Aundh",
      "Kopa Mall, Ghorpadi, KP",
    ],
    Mumbai: ["Sky City Mall, Borivali"],
    Bangalore: [
      "Mall of Asia",
      "Bhartiya Mall, Bangalore",
      "Lulu Mall, Bangalore",
      "PMC, Whitefield Bangalore",
    ],
    Hyderabad: [
      "Lakeshore, Y junction",
      "Gachibowli, Hyderabad",
      "Banjara Hills",
      "Kompally, Hyderabad",
    ],
    Gurgaon: ["Golfcourse Road, Gurgaon", "Felix plaza, Gurgaon"],
    Delhi: ["Vegas Mall, Dwarka"],
    Faridabad: ["Omaxe world street, Faridabad"],
  } as Record<string, string[]>,

  ROLES: [
    "Admin",
    "CRE",
    "ASM",
    "Asst CRE",
    "Store Manager",
    "Area Manager",
    "Revenue Team",
  ],

  RLOSS_CATEGORIES: [
    "Chairs",
    "Desks & Workspace",
    "Insoles",
    "Footwear",
    "Frido Orthotics",
    "Cushions",
    "Pillows",
    "Mattress Topper",
    "Car Essentials",
    "Socks",
    "Maternity & Baby Care",
    "Mobility",
    "Other",
  ],

  RLOSS_REASONS: [
    "Couldn't handle objection",
    "Product out of stock",
    "Product not available for C&C",
    "Size / variant unavailable",
    "Price / discount",
    "Comparing competitors",
    "Will consult family",
    "Just browsing / trial",
    "Delivery timeline",
    "Payment / EMI issue",
    "Other",
  ],

  RLOSS_VALUES: [
    "Under ₹2,000",
    "₹2,000–5,000",
    "₹5,000–10,000",
    "₹10,000–25,000",
    "₹25,000+",
  ],
};

// ── All 19 stores flat list (for footfall dropdown) ──
export const ALL_STORES_LIST = [
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
  "PMC, Whitefield Bangalore",
];

// ── Safe storage (falls back to memory if localStorage is blocked) ──
const mem: Record<string, string> = {};

export const kv = {
  get(k: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(k);
    } catch {
      return k in mem ? mem[k] : null;
    }
  },
  set(k: string, v: string): void {
    mem[k] = v;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(k, v);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  },
};

// ── Database Methods ──
export const db = {
  // Profile Helpers
  getProfile(): Profile | null {
    try {
      return JSON.parse(kv.get("fsh_profile") || "null") as Profile | null;
    } catch {
      return null;
    }
  },

  saveProfile(profile: Profile): void {
    kv.set("fsh_profile", JSON.stringify(profile));
  },

  // Generic Post wrapper that falls back to Local Storage if network errors/dev mode
  async post(
    payload: PostPayload,
    profile?: Profile | null
  ): Promise<PostResult> {
    if (!profile) {
      profile = db.getProfile();
    }

    const requestData: Record<string, unknown> = {
      ...payload,
      city: profile?.city,
      store: (payload.store as string) || profile?.store,
      role: profile?.role,
      name: profile?.name,
      deviceId: profile?.deviceId || "dev-" + Date.now(),
      ts: new Date().toISOString(),
    };

    // Dynamically choose target URL based on action
    let targetUrl = CONFIG.APPS_SCRIPT_URL;
    if (payload.action === "dsr") {
      targetUrl = CONFIG.DSR_APPS_SCRIPT_URL;
    } else if (payload.action === "footfall") {
      targetUrl = CONFIG.FOOTFALL_APPS_SCRIPT_URL;
    }

    if (targetUrl && !targetUrl.startsWith("PASTE")) {
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(requestData),
        });
        const data = await res.json();
        if (data.ok) return data as PostResult;
      } catch (e) {
        console.warn(
          "Apps Script submission failed, saving locally: ",
          e
        );
      }
    }

    // Local DB fallbacks
    return db.saveLocal(payload.action, requestData);
  },

  // Local Storage Save Manager
  saveLocal(
    action: string,
    data: Record<string, unknown>
  ): PostResult {
    const key = `fsh_log_${action}`;
    const items = db.getLocalList(action);
    
    // Check if an item with the same store and date already exists to overwrite it
    if (data.store && data.date) {
      const idx = items.findIndex(
        (x: any) =>
          String(x.store || "").toLowerCase() === String(data.store || "").toLowerCase() &&
          String(x.date) === String(data.date)
      );
      if (idx > -1) {
        items[idx] = { ...items[idx], ...data, ts: items[idx].ts || data.ts };
        kv.set(key, JSON.stringify(items));
        return { ok: true, saved: "local", data };
      }
    }
    
    items.push(data);
    kv.set(key, JSON.stringify(items));
    return { ok: true, saved: "local", data };
  },

  getLocalList(action: string): Record<string, unknown>[] {
    const key = `fsh_log_${action}`;
    try {
      return JSON.parse(kv.get(key) || "[]") as Record<string, unknown>[];
    } catch {
      return [];
    }
  },

  deleteLocalItem(action: string, timestamp: string): void {
    const key = `fsh_log_${action}`;
    let items = db.getLocalList(action);
    items = items.filter((item) => item.ts !== timestamp);
    kv.set(key, JSON.stringify(items));
  },

  // Mid-Day footfall submissions
  saveFootfall(data: Record<string, unknown>): PostResult {
    const footfalls = db.getLocalList("footfall");
    const filtered = footfalls.filter(
      (f) =>
        !(
          f.storeName === data.storeName &&
          f.date === data.date
        )
    );
    filtered.push(data);
    kv.set("fsh_log_footfall", JSON.stringify(filtered));
    return { ok: true, saved: "local" };
  },

  // Questions and Answers Feed Manager
  async getAnswersFeed(
    _deviceId: string | null
  ): Promise<QAItem[]> {
    if (
      CONFIG.APPS_SCRIPT_URL &&
      !CONFIG.APPS_SCRIPT_URL.startsWith("PASTE")
    ) {
      try {
        const res = await fetch(
          CONFIG.APPS_SCRIPT_URL + "?action=answers"
        );
        const data = await res.json();
        if (data.ok && data.items) return data.items as QAItem[];
      } catch {
        console.warn(
          "Unable to fetch remote answers feed, using mock items."
        );
      }
    }

    // Default static expert questions for rich preview
    const localFeed = db.getLocalList("question") as unknown as QAItem[];
    const staticMock: QAItem[] = [
      {
        question:
          "Customer says the chair is costlier than SuperErgo Apex with same features. What do I say?",
        name: "Rahul",
        store: "PMC, Vimannagar",
        ts: new Date(Date.now() - 3600000 * 2).toISOString(),
        answer:
          "Highlight our 3-year warranty and the patented ergonomic double-cushion foam. SuperErgo uses standard density foam which sags within 6 months. Offer them a trial sitting and show the density comparison sheet.",
      },
      {
        question:
          "Is there any EMI offer on purchase of ErgoLuxe Desk?",
        name: "Pooja",
        store: "Sky City Mall, Borivali",
        ts: new Date(Date.now() - 3600000 * 24).toISOString(),
        answer:
          "Yes! 3 and 6-month No-Cost EMI is active on HDFC and ICICI cards for orders above ₹15,000. For others, standard EMI options are available.",
      },
      {
        question:
          "Customer wants custom variant of cushions with green piping.",
        name: "Amit",
        store: "Elpro Mall, PCMC",
        ts: new Date(Date.now() - 3600000 * 48).toISOString(),
        answer: null, // Awaiting expert answer
      },
    ];

    // Combine static mocks with user submitted local questions
    return [...localFeed, ...staticMock];
  },
};
