// ── TypeScript Interfaces for Retail Sales Assist ──

export interface Profile {
  email: string;
  username: string;
  city: string;
  store: string;
  role: string;
  name: string;
  deviceId: string;
  isAdmin?: boolean;
}

export interface DSRMetrics {
  dateStr: string;
  dayOfMonth: number;
  daysInMonth: number;
  ccOrders: number;
  onlineOrders: number;
  totalOrders: number;
  newWalkins: number;
  otherWalkins: number;
  totalWalkins: number;
  cashCounter: number;
  reviewsTaken: number;
  leadsCaptured: number;
  lastMonthRev: number;
  cvrRate: number;
  reviewRate: number;
  captureRate: number;
  nmToday: number;
  nmMtd: number;
  mToday: number;
  mMtd: number;
  salesToday: number;
  salesMtd: number;
  dailyAverage: number;
  projectedRevenue: number;
}

export interface DSRFormValues {
  date: string;
  ccOrders: number;
  onlineOrders: number;
  newWalkins: number;
  otherWalkins: number;
  cashCounter: number;
  reviewsTaken: number;
  leadsCaptured: number;
  lastMonthRev: number;
  // Mobility store fields
  nmToday: number;
  nmMtd: number;
  mToday: number;
  mMtd: number;
  // Single store fields
  salesToday: number;
  salesMtd: number;
}

export interface RLossPayload {
  action: "rloss";
  category: string;
  product: string;
  reason: string;
  objection: string;
  value: string;
  leadRegistered: string;
  notes: string;
  cxIntent?: string;
}

export interface FootfallPayload {
  action: "footfall";
  storeName: string;
  managerName: string;
  date: string;
  count: number;
  salesDone: number;
  anomaly: string;
  remarks: string;
}

export interface QAItem {
  question: string;
  name: string;
  store: string;
  ts: string;
  answer: string | null;
  deviceId?: string;
}

export interface ProductItem {
  name: string;
  price: number;
  features: string;
  maxDiscount?: number;
}

export interface ProductCatalog {
  [category: string]: ProductItem[];
}

export interface LinkItem {
  title: string;
  desc: string;
  url: string;
  cat: string;
}

export interface PostPayload {
  action: string;
  [key: string]: unknown;
}

export interface PostResult {
  ok: boolean;
  saved?: string;
  data?: Record<string, unknown>;
  items?: QAItem[];
}
