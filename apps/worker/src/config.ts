/** Worker settings from the environment. */
export const config = {
  redisUrl: process.env.REDIS_URL ?? null,
  /** Where the API's dev upload sink writes originals (`<photoId>.orig`). Production reads from S3/R2. */
  originalsDir: process.env.UPLOAD_DIR ?? ".data/uploads",
  /** Where watermarked derivatives are written. Production writes to the CDN bucket. */
  derivativesDir: process.env.DERIVATIVES_DIR ?? ".data/derivatives",
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  aws: {
    region: process.env.AWS_REGION ?? null,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? null,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? null,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? null,
    authToken: process.env.TWILIO_AUTH_TOKEN ?? null,
    from: process.env.TWILIO_FROM ?? null,
  },
  postmark: {
    token: process.env.POSTMARK_TOKEN ?? null,
    from: process.env.EMAIL_FROM ?? "Snapbell <hello@snapbell.com>",
  },
  /** Face data is kept for this many days after a job's picture day (biometrics policy). */
  faceRetentionDays: Number(process.env.FACE_RETENTION_DAYS ?? 180),
};

export function redisConnection(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export function rekognitionConfigured(): boolean {
  return !!(config.aws.region && config.aws.accessKeyId && config.aws.secretAccessKey);
}
