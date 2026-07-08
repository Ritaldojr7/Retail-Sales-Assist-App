// Authorized store email → city + store mapping (single-store access per login)

export interface StoreAuthRecord {
  city: string;
  store: string;
  label: string;
}

export const STORE_BY_EMAIL: Record<string, StoreAuthRecord> = {
  "store.vimannagar@myfrido.com": {
    city: "Pune",
    store: "Phoenix Marketcity, Vimannagar",
    label: "PMC, Vimannagar",
  },
  "store.amanora@myfrido.com": {
    city: "Pune",
    store: "Amanora Mall, Magarpatta",
    label: "Amanora Mall, Magarpatta",
  },
  "store.amartech@myfrido.com": {
    city: "Pune",
    store: "Amar Tech Park, Balewadi",
    label: "Amar Tech Park, Balewadi",
  },
  "store.elpro@myfrido.com": {
    city: "Pune",
    store: "Elpro Mall, PCMC",
    label: "Elpro Mall, PCMC",
  },
  "store.westend@myfrido.com": {
    city: "Pune",
    store: "Nexus Westend, Aundh",
    label: "Nexus Westend, Aundh",
  },
  "store.0006@myfrido.com": {
    city: "Pune",
    store: "Kopa Mall, Ghorpadi, KP",
    label: "Kopa Mall, Ghorpadi, KP",
  },
  "store.0007@myfrido.com": {
    city: "Bangalore",
    store: "Mall of Asia",
    label: "Mall of Asia",
  },
  "store.0008@myfrido.com": {
    city: "Hyderabad",
    store: "Lakeshore, Y junction",
    label: "Lakeshore, Y junction",
  },
  "store.0009@myfrido.com": {
    city: "Mumbai",
    store: "Sky City Mall, Borivali",
    label: "Sky City Mall, Borivali",
  },
  "store.0010@myfrido.com": {
    city: "Hyderabad",
    store: "Gachibowli, Hyderabad",
    label: "Gachibowli, Hyderabad",
  },
  "store.0011@myfrido.com": {
    city: "Hyderabad",
    store: "Banjara Hills",
    label: "Banjara Hills",
  },
  "store.0013@myfrido.com": {
    city: "Bangalore",
    store: "Bhartiya Mall, Bangalore",
    label: "Bhartiya Mall, Bangalore",
  },
  "store.0014@myfrido.com": {
    city: "Hyderabad",
    store: "Kompally, Hyderabad",
    label: "Kompally, Hyderabad",
  },
  "store.0015@myfrido.com": {
    city: "Delhi",
    store: "Vegas Mall, Dwarka",
    label: "Vegas Mall, Dwarka",
  },
  "store.0016@myfrido.com": {
    city: "Bangalore",
    store: "Lulu Mall, Bangalore",
    label: "Lulu Mall, Bangalore",
  },
  "store.0017@myfrido.com": {
    city: "Gurgaon",
    store: "Golfcourse Road, Gurgaon",
    label: "Golf Course Road, Gurgaon",
  },
  "store.0018@myfrido.com": {
    city: "Faridabad",
    store: "Omaxe world street, Faridabad",
    label: "Omaxe, Faridabad",
  },
  "store.0019@myfrido.com": {
    city: "Gurgaon",
    store: "Felix plaza, Gurgaon",
    label: "Felix, Gurgaon",
  },
  "store.0020@myfrido.com": {
    city: "Bangalore",
    store: "PMC, Whitefield Bangalore",
    label: "PMC, Whitefield, Bangalore",
  },
};

const MYFRIDO_DOMAIN = "@myfrido.com";

export function normalizeStoreEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isMyFridoEmail(email: string): boolean {
  return normalizeStoreEmail(email).endsWith(MYFRIDO_DOMAIN);
}

export function getStoreFromEmail(email: string): StoreAuthRecord | null {
  const normalized = normalizeStoreEmail(email);
  return STORE_BY_EMAIL[normalized] ?? null;
}

export function validateStoreEmail(email: string): string | null {
  const normalized = normalizeStoreEmail(email);
  if (!normalized) return "Email is required.";
  if (!isMyFridoEmail(normalized)) {
    return "Only authorized store emails ending with @myfrido.com are allowed.";
  }
  if (!getStoreFromEmail(normalized)) {
    return "This store email is not registered. Contact your area manager.";
  }
  return null;
}

export const AUTHORIZED_STORE_EMAILS = Object.keys(STORE_BY_EMAIL);

export function mapProfileStoreToSheetStore(profileStore: string, sheetStores: string[]): string {
  const pStoreNorm = profileStore.toLowerCase();
  
  // 1. Direct exact or substring matches
  for (const sheetStore of sheetStores) {
    const sNorm = sheetStore.toLowerCase();
    if (sNorm === pStoreNorm) return sheetStore;
    
    // Check if one contains the other
    const cleanP = pStoreNorm.replace(/[^a-z0-9]/g, "");
    const cleanS = sNorm.replace(/[^a-z0-9]/g, "");
    if (cleanP && cleanS && (cleanP.includes(cleanS) || cleanS.includes(cleanP))) {
      return sheetStore;
    }
  }
  
  // 2. Specific custom mappings
  const mappings: Record<string, string> = {
    "phoenix marketcity, vimannagar": "Phoenix Marketcity Vimannagar",
    "amanora mall, magarpatta": "Amanora Experience Store",
    "amar tech park, balewadi": "Amar Tech Park",
    "elpro mall, pcmc": "Elpro PCMC",
    "nexus westend, aundh": "Nexus Westend, Aundh",
    "kopa mall, ghorpadi, kp": "Kopa Mall",
    "lakeshore, y junction": "Lakeshore Y junction",
    "gachibowli, hyderabad": "Frido Experience Store Gachibowli",
    "banjara hills": "Frido Store Banjara Hills",
    "bhartiya mall, bangalore": "Bhartiya Mall Store",
    "kompally, hyderabad": "Kompally Store",
    "vegas mall, dwarka": "Vegas Mall",
    "lulu mall, bangalore": "Lulu Mall",
    "golfcourse road, gurgaon": "Golf Course Road",
    "omaxe world street, faridabad": "Omaxe Store",
    "felix plaza, gurgaon": "Felix Plaza",
    "pmc, whitefield bangalore": "PMC Whitefield",
  };
  
  const key = pStoreNorm.trim();
  if (mappings[key]) {
    const match = sheetStores.find(s => s.toLowerCase() === mappings[key].toLowerCase());
    if (match) return match;
  }
  
  // 3. Fallback: match by non-generic words
  const pWords = pStoreNorm.split(/[\s,]+/);
  for (const word of pWords) {
    if (word.length > 3 && !["mall", "road", "plaza", "store", "experience", "frido", "street"].includes(word)) {
      const match = sheetStores.find(s => s.toLowerCase().includes(word));
      if (match) return match;
    }
  }
  
  return profileStore;
}
