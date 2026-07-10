/** Map upstream / provider messages to client-friendly copy. */

const INTERNAL_PATTERNS: Array<[RegExp, string]> = [
  [/api key is not configured/i, "A required integration is not configured. Contact support."],
  [/rate limit/i, "Too many requests. Please wait a moment and try again."],
  [/insufficient/i, "Insufficient balance or credits for this action."],
];

export function toClientFacingMessage(message: string): string {
  for (const [pattern, replacement] of INTERNAL_PATTERNS) {
    if (pattern.test(message)) return replacement;
  }
  return message;
}
