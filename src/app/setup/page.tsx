"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useProfile } from "@/hooks/useProfile";
import { CONFIG } from "@/lib/database";
import { isAdminProfile } from "@/lib/admin-auth";
import Card, { CardHeader, CardBody, CardFooter } from "@/components/Card";
import { InputField, SelectField } from "@/components/Forms";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { ArrowRight, LogOut } from "lucide-react";

export default function SetupPage() {
  const { profile, saveProfile } = useProfile();
  const { signOut } = useClerk();
  const router = useRouter();

  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setRole(profile.role);
      setName(profile.name);
    }
  }, [profile]);

  const handleSave = () => {
    const isAdmin = isAdminProfile(profile);
    if (
      !profile?.email ||
      !profile?.username ||
      (!isAdmin && (!profile?.store || !profile?.city))
    ) {
      setError("Store and username are locked to your account.");
      return;
    }
    if (!role || !name.trim()) {
      setError("Please fill all fields to complete profile setup");
      return;
    }

    saveProfile({
      ...profile,
      role,
      name: name.trim(),
    });
    router.push("/");
  };

  const roleOptions = CONFIG.ROLES.map((r) => ({ label: r, value: r }));

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-4">
      <Card>
        <CardHeader
          title="Profile Setup"
          subtitle={
            isAdminProfile(profile)
              ? "Your admin email and username are fixed. Update your role or display name below."
              : "Your store email and username are fixed. Update your role or display name below."
          }
        />
        <CardBody className="space-y-5">
          <InputField
            label="Username"
            required
            type="text"
            value={profile?.username || ""}
            disabled
            readOnly
          />

          <InputField
            label={isAdminProfile(profile) ? "Admin Email ID" : "Store Email ID"}
            required
            type="email"
            value={profile?.email || ""}
            disabled
            readOnly
          />

          {!isAdminProfile(profile) && (
            <>
              <SelectField
                label="City"
                required
                value={profile?.city || ""}
                onChange={() => {}}
                options={
                  profile?.city
                    ? [{ label: profile.city, value: profile.city }]
                    : []
                }
                placeholder="City"
                disabled
              />

              <SelectField
                label="Store"
                required
                value={profile?.store || ""}
                onChange={() => {}}
                options={
                  profile?.store
                    ? [{ label: profile.store, value: profile.store }]
                    : []
                }
                placeholder="Store"
                disabled
              />
            </>
          )}

          <SelectField
            label="Your Role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={roleOptions}
            placeholder="Select role"
          />

          <InputField
            label="Full Name"
            required
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {error && (
            <p className="fs-small text-red-500 font-semibold mt-2">{error}</p>
          )}
        </CardBody>
        <CardFooter className="justify-start gap-3 flex-wrap">
          <PrimaryButton onClick={handleSave} className="w-full">
            Save Profile
            <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
          <SecondaryButton
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </SecondaryButton>
        </CardFooter>
      </Card>
    </div>
  );
}
