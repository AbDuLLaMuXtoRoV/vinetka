import "reflect-metadata";
import { Logger, type LogLevel } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { AddressInfo } from "node:net";
import { AppModule } from "./app.module";
import { ErrorFilter, bodyParserErrors } from "./common/errors";
import { assertProductionConfig, config } from "./config";
import { localeMiddleware } from "./i18n";

const LEVELS: Record<string, LogLevel[]> = {
  silent: [],
  error: ["error"],
  warn: ["error", "warn"],
  log: ["error", "warn", "log"],
  debug: ["error", "warn", "log", "debug"],
};

export async function createApp(): Promise<NestExpressApplication> {
  assertProductionConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
    logger: LEVELS[process.env.LOG_LEVEL ?? "log"] ?? LEVELS.log,
  });
  app.disable("x-powered-by");
  // First: every later middleware, handler and error sees the request's language.
  app.use(localeMiddleware);
  app.set("trust proxy", config.trustProxy);
  // Selfie search posts a base64 image; everything else is small.
  app.useBodyParser("json", { limit: "16mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "1mb" });
  app.use(bodyParserErrors);
  app.enableCors({
    origin: config.webOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "Accept-Language"],
    maxAge: 600,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new ErrorFilter());
  return app;
}

export async function bootstrap(port = config.port): Promise<{ app: NestExpressApplication; port: number }> {
  if (!process.env.PUBLIC_API_URL) config.publicApiUrl = `http://localhost:${port}`;
  const app = await createApp();
  await app.listen(port);
  const actual = (app.getHttpServer().address() as AddressInfo).port;
  if (!process.env.PUBLIC_API_URL) config.publicApiUrl = `http://localhost:${actual}`;
  new Logger("Snapbell").log(`API listening on http://localhost:${actual}/v1 (store: memory, queue: ${config.redisUrl ? "bullmq" : "inline"})`);
  return { app, port: actual };
}

if (require.main === module) {
  void bootstrap().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
