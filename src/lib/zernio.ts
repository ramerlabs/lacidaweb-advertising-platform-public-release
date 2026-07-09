import Zernio, {
  RateLimitError,
  ValidationError,
  ZernioApiError,
} from "@zernio/node";
import { toClientFacingMessage } from "@/lib/client-errors";
import { getZernioApiKey } from "@/lib/integration-settings";

let client: Zernio | null = null;
let clientApiKey: string | null = null;

export function resetZernioClient() {
  client = null;
  clientApiKey = null;
}

export async function getZernio(): Promise<Zernio> {
  const apiKey = await getZernioApiKey();
  if (!apiKey) {
    throw new Error("Zernio API key is not configured. Set it in Admin → Integrations.");
  }

  if (!client || clientApiKey !== apiKey) {
    client = new Zernio({
      apiKey,
      baseURL: "https://zernio.com/api",
      timeout: 120_000,
    });
    clientApiKey = apiKey;
  }

  return client;
}

export type ZernioErrorInfo = {
  code: "rate_limit" | "validation" | "api" | "unknown";
  message: string;
  statusCode?: number;
  retryAfterSeconds?: number;
  fields?: unknown;
};

export function normalizeZernioError(error: unknown): ZernioErrorInfo {
  if (error instanceof RateLimitError) {
    return {
      code: "rate_limit",
      message: error.message || "Zernio rate limit exceeded",
      statusCode: error.statusCode,
      retryAfterSeconds: error.getSecondsUntilReset?.() ?? 60,
    };
  }

  if (error instanceof ValidationError) {
    return {
      code: "validation",
      message: error.message || "Invalid Zernio request",
      statusCode: error.statusCode,
      fields: error.fields,
    };
  }

  if (error instanceof ZernioApiError) {
    return {
      code: "api",
      message: error.message || "Zernio API error",
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return { code: "unknown", message: error.message };
  }

  return { code: "unknown", message: "Unknown Zernio error" };
}

export async function withZernioRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const label = opts.label ?? "zernio.call";
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const info = normalizeZernioError(error);
      console.error(`[${label}] attempt=${attempt + 1}`, info);

      if (info.code === "rate_limit" && attempt < retries) {
        const waitMs = Math.max(1, info.retryAfterSeconds ?? 5) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
        attempt += 1;
        continue;
      }

      throw Object.assign(new Error(toClientFacingMessage(info.message)), { zernio: info });
    }
  }
}
