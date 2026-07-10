export type ClientAccountType = "ADVERTISER" | "PUBLISHER";

export function parseAccountType(value: string | null | undefined): ClientAccountType | null {
  if (value === "ADVERTISER" || value === "PUBLISHER") return value;
  return null;
}

export function getDashboardHome(accountType: ClientAccountType) {
  return accountType === "PUBLISHER" ? "/dashboard/publisher" : "/dashboard/advertiser";
}

export function getLoginPath(accountType: ClientAccountType) {
  return accountType === "PUBLISHER" ? "/login/publisher" : "/login/advertiser";
}

export function getRegisterPath(accountType: ClientAccountType) {
  return accountType === "PUBLISHER" ? "/register/publisher" : "/register/advertiser";
}

export const ADVERTISER_DASHBOARD_PREFIXES = [
  "/dashboard/advertiser",
  "/dashboard/campaigns",
  "/dashboard/wallet",
];

export const PUBLISHER_DASHBOARD_PREFIXES = ["/dashboard/publisher"];

export const SHARED_DASHBOARD_PREFIXES = ["/dashboard/support", "/dashboard/settings"];

export function isAdvertiserDashboardPath(pathname: string) {
  return ADVERTISER_DASHBOARD_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isPublisherDashboardPath(pathname: string) {
  return PUBLISHER_DASHBOARD_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function accountTypeLabel(type: ClientAccountType) {
  return type === "PUBLISHER" ? "Publisher" : "Advertiser";
}
