import { NextResponse } from "next/server";
import { getPaymentSettings, getUsBankDetails } from "@/lib/payment-settings";

export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({
      methods: {
        USDT: settings.usdtEnabled,
        PAYPAL: settings.paypalEnabled,
        GCASH: settings.gcashEnabled,
        US_BANK: settings.usBankEnabled,
      },
      usdtWallet: settings.usdtEnabled ? settings.usdtTrc20Wallet : "",
      usBank: getUsBankDetails(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
