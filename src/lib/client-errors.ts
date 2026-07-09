/** Map Zernio / upstream messages to client-friendly copy for this SaaS. */
export function toClientFacingMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("payment method") &&
    (lower.includes("more than 2") ||
      lower.includes("more than two") ||
      lower.includes("account"))
  ) {
    return "Upgrade to add more accounts.";
  }

  return message;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const raw = error instanceof Error ? error.message : fallback;
  return toClientFacingMessage(raw);
}
