import type { ClientAccountType } from "@/lib/account-type";
import { getDashboardModeFromAccountType } from "@/lib/account-type-dashboard";

export type DashboardMode = "advertiser" | "publisher";

const MODE_STORAGE_KEY = "lacidaweb-dashboard-mode";

const SHARED_PREFIXES = ["/dashboard/support", "/dashboard/settings"];

export function getDashboardMode(
  pathname: string,
  accountType?: ClientAccountType,
): DashboardMode {
  if (accountType) {
    return getDashboardModeFromAccountType(accountType);
  }
  if (SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return readStoredMode() ?? "advertiser";
  }
  return readStoredMode() ?? "advertiser";
}

export function storeDashboardMode(mode: DashboardMode) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MODE_STORAGE_KEY, mode);
}

function readStoredMode(): DashboardMode | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(MODE_STORAGE_KEY);
  return value === "publisher" || value === "advertiser" ? value : null;
}
