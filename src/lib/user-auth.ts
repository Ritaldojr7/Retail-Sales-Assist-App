// Staff auth helpers — multiple users share a store email in the UI.
// Clerk requires unique emails, so each person gets: nameSlug+storeLocal@myfrido.com

import { normalizeStoreEmail } from "@/lib/store-auth";

// Clerk usernames: letters, numbers, hyphens, underscores only (no dots).

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{3,63}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function slugifyUsernameFromName(fullName: string): string {
  return fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

/**
 * Unique Clerk login email per staff member at a shared store.
 * Example: ritwik_mukherjee+store.0010@myfrido.com
 */
export function clerkEmailForStaff(storeEmail: string, fullName: string): string {
  const normalizedStore = normalizeStoreEmail(storeEmail);
  const storeLocal = normalizedStore.split("@")[0];
  const nameSlug = slugifyUsernameFromName(fullName);
  return `${nameSlug}+${storeLocal}@myfrido.com`;
}

/** Username is for Clerk dashboard display only — auto-generated from full name */
export function dashboardUsernameFromName(fullName: string): string {
  return slugifyUsernameFromName(fullName);
}

export function validateDashboardUsername(fullName: string): string | null {
  const normalized = dashboardUsernameFromName(fullName);
  if (!normalized) return "Please enter your full name.";
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Full name must produce a username with 4+ characters (letters, numbers, - or _).";
  }
  return null;
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName?: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export interface ClerkStaffMetadata {
  storeEmail: string;
  role: string;
  fullName: string;
  isAdmin?: boolean;
}

export function parseStaffMetadata(
  metadata: Record<string, unknown> | null | undefined
): ClerkStaffMetadata | null {
  if (!metadata) return null;

  if (metadata.isAdmin === true) {
    const email =
      typeof metadata.adminEmail === "string"
        ? metadata.adminEmail
        : typeof metadata.storeEmail === "string"
          ? metadata.storeEmail
          : "";
    if (!email) return null;
    return {
      storeEmail: email,
      role: typeof metadata.role === "string" ? metadata.role : "",
      fullName: typeof metadata.fullName === "string" ? metadata.fullName : "",
      isAdmin: true,
    };
  }

  if (!metadata.storeEmail || typeof metadata.storeEmail !== "string") {
    return null;
  }
  return {
    storeEmail: metadata.storeEmail,
    role: typeof metadata.role === "string" ? metadata.role : "",
    fullName: typeof metadata.fullName === "string" ? metadata.fullName : "",
  };
}
