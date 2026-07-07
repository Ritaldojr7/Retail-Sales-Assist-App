"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useProfile } from "@/hooks/useProfile";
import {
  adminDisplayNameFromEmail,
  adminUsernameFromEmail,
  ADMIN_CITY,
  ADMIN_STORE,
  isAdminEmail,
  normalizeAdminEmail,
} from "@/lib/admin-auth";
import { getStoreFromEmail, normalizeStoreEmail } from "@/lib/store-auth";
import { normalizeUsername, parseStaffMetadata } from "@/lib/user-auth";

export default function SyncProfile() {
  const { user, isLoaded } = useUser();
  const { profile, saveProfile } = useProfile();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const clerkEmail =
      user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
    const metadata = parseStaffMetadata(
      user.unsafeMetadata as Record<string, unknown>
    );

    const deviceId =
      profile?.deviceId ||
      `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (metadata?.isAdmin || isAdminEmail(clerkEmail) || isAdminEmail(metadata?.storeEmail ?? "")) {
      const email = normalizeAdminEmail(
        metadata?.storeEmail || clerkEmail || profile?.email || ""
      );
      if (!email) return;

      const nextProfile = {
        email,
        username: user.username
          ? normalizeUsername(user.username)
          : adminUsernameFromEmail(email),
        city: ADMIN_CITY,
        store: ADMIN_STORE,
        role: metadata?.role || profile?.role || "",
        name:
          metadata?.fullName ||
          profile?.name ||
          user.fullName ||
          adminDisplayNameFromEmail(email),
        deviceId,
        isAdmin: true,
      };

      if (
        profile?.email === nextProfile.email &&
        profile?.username === nextProfile.username &&
        profile?.store === nextProfile.store &&
        profile?.city === nextProfile.city &&
        profile?.role === nextProfile.role &&
        profile?.name === nextProfile.name &&
        profile?.deviceId === nextProfile.deviceId &&
        profile?.isAdmin === true
      ) {
        return;
      }

      saveProfile(nextProfile);
      return;
    }

    const storeEmail = metadata?.storeEmail || profile?.email;
    if (!storeEmail) return;

    const normalizedStoreEmail = normalizeStoreEmail(storeEmail);
    const storeInfo = getStoreFromEmail(normalizedStoreEmail);
    if (!storeInfo) return;

    const username = user.username
      ? normalizeUsername(user.username)
      : profile?.username || "";

    const nextProfile = {
      email: normalizedStoreEmail,
      username,
      city: storeInfo.city,
      store: storeInfo.store,
      role: metadata?.role || profile?.role || "",
      name: metadata?.fullName || profile?.name || user.fullName || "",
      deviceId,
    };

    if (
      profile?.email === nextProfile.email &&
      profile?.username === nextProfile.username &&
      profile?.store === nextProfile.store &&
      profile?.city === nextProfile.city &&
      profile?.role === nextProfile.role &&
      profile?.name === nextProfile.name &&
      profile?.deviceId === nextProfile.deviceId
    ) {
      return;
    }

    saveProfile(nextProfile);
  }, [
    user,
    isLoaded,
    profile?.email,
    profile?.username,
    profile?.store,
    profile?.city,
    profile?.role,
    profile?.name,
    profile?.deviceId,
    profile?.isAdmin,
    saveProfile,
  ]);

  return null;
}
