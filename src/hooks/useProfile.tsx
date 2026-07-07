"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { Profile } from "@/lib/types";
import { db } from "@/lib/database";

interface ProfileContextType {
  profile: Profile | null;
  saveProfile: (profile: Profile) => void;
  isReady: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  saveProfile: () => {},
  isReady: false,
});

export function ProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = db.getProfile();
    if (stored) setProfile(stored);
    setIsReady(true);
  }, []);

  const saveProfile = useCallback((p: Profile) => {
    db.saveProfile(p);
    setProfile(p);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, saveProfile, isReady }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
