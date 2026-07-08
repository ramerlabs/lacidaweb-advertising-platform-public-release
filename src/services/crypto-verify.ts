import { getPaymentSettings } from "@/lib/payment-settings";

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export async function getUsdtWalletAddress(): Promise<string> {
  const settings = await getPaymentSettings();
  if (!settings.usdtTrc20Wallet) {
    throw new Error("USDT wallet not configured. Set it in Admin → Payment details.");
  }
  return settings.usdtTrc20Wallet;
}

export async function usdToUsdt(usdAmount: number): Promise<number> {
  const settings = await getPaymentSettings();
  if (settings.usdtPerUsd && settings.usdtPerUsd > 0) {
    return roundUsdt(usdAmount / settings.usdtPerUsd);
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd",
      { next: { revalidate: 300 } },
    );
    const data = (await res.json()) as { tether?: { usd?: number } };
    const usdPerUsdt = data.tether?.usd;
    if (!usdPerUsdt || usdPerUsdt <= 0) {
      return roundUsdt(usdAmount);
    }
    return roundUsdt(usdAmount / usdPerUsdt);
  } catch {
    return roundUsdt(usdAmount);
  }
}

function roundUsdt(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function amountMatches(received: number, expected: number): boolean {
  const tolerance = Math.max(0.01, expected * 0.001);
  return Math.abs(received - expected) <= tolerance;
}

type TronTxInfo = {
  contractRet?: string;
  hash?: string;
  trc20TransferInfo?: Array<{
    to_address?: string;
    amount_str?: string;
  }>;
};

export async function verifyTrc20UsdtPayment(input: {
  txHash: string;
  walletAddress: string;
  expectedUsdt: number;
}): Promise<{ ok: boolean; message: string; receivedUsdt?: number }> {
  const hash = input.txHash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    return { ok: false, message: "Invalid transaction hash format" };
  }

  const res = await fetch(
    `https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(hash)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { ok: false, message: "Could not fetch transaction from blockchain" };
  }

  const data = (await res.json()) as TronTxInfo;
  if (data.contractRet !== "SUCCESS") {
    return { ok: false, message: "Transaction not confirmed on-chain yet" };
  }

  const transfers = data.trc20TransferInfo ?? [];
  for (const transfer of transfers) {
    if (!transfer.to_address || !transfer.amount_str) continue;
    if (transfer.to_address.toLowerCase() !== input.walletAddress.toLowerCase()) continue;

    const received = Number(transfer.amount_str) / 1_000_000;
    if (amountMatches(received, input.expectedUsdt)) {
      return {
        ok: true,
        message: "USDT payment verified",
        receivedUsdt: received,
      };
    }
    return {
      ok: false,
      message: `Amount mismatch. Expected ${input.expectedUsdt} USDT, received ${received} USDT`,
      receivedUsdt: received,
    };
  }

  return {
    ok: false,
    message: "No matching USDT transfer to your wallet found in this transaction",
  };
}

export function usdtPaymentInstructions(usdtAmount: number, wallet: string): string {
  return `Send exactly ${usdtAmount} USDT (TRC20) to: ${wallet}. Then paste your transaction hash below for automatic verification.`;
}

export { USDT_TRC20_CONTRACT };
