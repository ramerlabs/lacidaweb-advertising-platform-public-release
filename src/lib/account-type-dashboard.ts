import type { ClientAccountType } from "@/lib/account-type";

export function getDashboardModeFromAccountType(accountType: ClientAccountType) {
  return accountType === "PUBLISHER" ? "publisher" : "advertiser";
}
