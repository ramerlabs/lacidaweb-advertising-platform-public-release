import { z } from "zod";

export const walletTopUpSchema = z.object({
  amountUsd: z.number().positive().min(5).max(50_000),
  method: z.enum(["USDT", "PAYPAL", "GCASH", "US_BANK"]),
  notes: z.string().max(500).optional(),
  txHash: z.string().max(200).optional(),
  externalRef: z.string().max(200).optional(),
});

export type WalletTopUpInput = z.infer<typeof walletTopUpSchema>;
