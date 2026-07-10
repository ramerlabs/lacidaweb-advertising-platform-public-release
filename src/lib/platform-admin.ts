export function parseAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  // Always allow the bootstrap admin username from seed-admin.mjs
  const emails = new Set(fromEnv);
  emails.add("admin");
  return [...emails];
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.toLowerCase());
}
