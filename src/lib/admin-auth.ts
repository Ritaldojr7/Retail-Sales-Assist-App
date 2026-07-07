import { slugifyUsernameFromName } from "@/lib/user-auth";

export const ADMIN_EMAILS = [
  "nishrit.p@myfrido.com",
  "saiyed.a@myfrido.com",
  "arsh.a@myfrido.com",
  "juned.m@myfrido.com",
  "ritwik.m@myfrido.com",
] as const;

export const ADMIN_CITY = "All Regions";
export const ADMIN_STORE = "All Stores";

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
  return (ADMIN_EMAILS as readonly string[]).includes(
    normalizeAdminEmail(email)
  );
}

export function validateAdminEmail(email: string): string | null {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return "Email is required.";
  if (!isAdminEmail(normalized)) {
    return "This email is not authorized for admin access.";
  }
  return null;
}

export function adminUsernameFromEmail(email: string): string {
  const local = normalizeAdminEmail(email).split("@")[0] ?? "";
  return slugifyUsernameFromName(local);
}

export function adminDisplayNameFromEmail(email: string): string {
  const local = normalizeAdminEmail(email).split("@")[0] ?? "";
  return local
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isAdminProfile(profile: { isAdmin?: boolean; email?: string } | null): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  return profile.email ? isAdminEmail(profile.email) : false;
}
