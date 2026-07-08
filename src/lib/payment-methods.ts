export const PAYMENT_METHODS = ["USDT", "PAYPAL", "GCASH", "US_BANK"] as const;
export type ClientPaymentMethod = (typeof PAYMENT_METHODS)[number];

export type EnabledPaymentMethods = Record<ClientPaymentMethod, boolean>;

export const DEFAULT_ENABLED_METHODS: EnabledPaymentMethods = {
  USDT: true,
  PAYPAL: true,
  GCASH: true,
  US_BANK: false,
};

export function paymentMethodLabel(method: ClientPaymentMethod): string {
  const labels: Record<ClientPaymentMethod, string> = {
    USDT: "USDT",
    PAYPAL: "PayPal",
    GCASH: "GCash",
    US_BANK: "US Bank",
  };
  return labels[method];
}

export type UsBankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: string;
};
