const DEV_SECRET = "dev-only-insecure-secret-change-me";

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every setting the API reads from the environment, with dev defaults. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  production: process.env.NODE_ENV === "production",
  /** Public demo: return one-time codes and magic links in responses even in production (no SMS/email provider). */
  demoMode: process.env.DEMO_MODE === "true",
  /**
   * Shared with the web apps. When a request carries this secret, the API trusts its
   * X-Snapbell-Client-IP header for per-visitor rate limits, whatever proxies sit in between.
   */
  internalProxySecret: process.env.INTERNAL_PROXY_SECRET || null,
  authSecret: process.env.AUTH_SECRET ?? DEV_SECRET,
  /** Absolute origin used in signed media/upload/download URLs. Defaults to http://localhost:<port>. */
  publicApiUrl: (process.env.PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  studioUrl: (process.env.STUDIO_URL ?? "http://localhost:3000/studio").replace(/\/$/, ""),
  storeUrl: (process.env.STORE_URL ?? "http://localhost:3000/shop").replace(/\/$/, ""),
  /** Where contact-page and partner requests are announced. */
  teamEmail: process.env.SNAPBELL_TEAM_EMAIL || "team@snapbell.com",
  /** One site serves the main site, /shop, /studio and /admin. */
  webOrigins: list(process.env.WEB_ORIGINS, ["http://localhost:3000"]),
  /** Express "trust proxy" setting so the Next.js servers can forward the client IP for rate limits. */
  trustProxy: process.env.TRUST_PROXY ?? "loopback, linklocal, uniquelocal",
  redisUrl: process.env.REDIS_URL ?? null,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? null,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? null,
    authToken: process.env.TWILIO_AUTH_TOKEN ?? null,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? null,
    from: process.env.TWILIO_FROM ?? null,
  },
  postmark: {
    token: process.env.POSTMARK_TOKEN ?? null,
    from: process.env.EMAIL_FROM ?? "Snapbell <hello@snapbell.com>",
  },
  labWebhookSecret: process.env.LAB_WEBHOOK_SECRET ?? null,
  /** When set, uploaded bytes are written here (dev); otherwise only the hash and size are kept. */
  uploadDir: process.env.UPLOAD_DIR ?? null,
  /** Simulated photo-processing delay when no worker/Redis is attached. */
  processingDelayMs: Number(process.env.PROCESSING_DELAY_MS ?? 2000),
};

export function assertProductionConfig(): void {
  if (config.production && config.authSecret === DEV_SECRET) {
    throw new Error("AUTH_SECRET must be set in production.");
  }
}

export function twilioVerifyEnabled(): boolean {
  return !!(config.twilio.accountSid && config.twilio.authToken && config.twilio.verifyServiceSid);
}
