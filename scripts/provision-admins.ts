/**
 * One-time script to create admin Clerk accounts.
 * Run: bun --env-file=.env.local run scripts/provision-admins.ts
 */
import { createClerkClient } from "@clerk/backend";
import {
  ADMIN_EMAILS,
  adminDisplayNameFromEmail,
  adminUsernameFromEmail,
} from "../src/lib/admin-auth";

const secretKey = process.env.CLERK_SECRET_KEY;
const password = process.env.ADMIN_SEED_PASSWORD;

if (!secretKey) {
  console.error("Missing CLERK_SECRET_KEY in environment.");
  process.exit(1);
}

if (!password) {
  console.error(
    "Missing ADMIN_SEED_PASSWORD. Add it to .env.local (do not commit)."
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey });

for (const email of ADMIN_EMAILS) {
  const fullName = adminDisplayNameFromEmail(email);
  const nameParts = fullName.split(" ").filter(Boolean);

  try {
    const existing = await clerk.users.getUserList({ emailAddress: [email] });
    if (existing.data.length > 0) {
      console.log(`✓ ${email} — already exists`);
      continue;
    }

    await clerk.users.createUser({
      emailAddress: [email],
      username: adminUsernameFromEmail(email),
      password,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || undefined,
      skipPasswordChecks: true,
      unsafeMetadata: {
        isAdmin: true,
        adminEmail: email,
        role: "Admin",
        fullName,
      },
    });

    console.log(`✓ ${email} — created`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${email} — ${message}`);
  }
}
