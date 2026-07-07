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
