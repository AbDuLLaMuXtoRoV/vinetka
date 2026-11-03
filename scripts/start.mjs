#!/usr/bin/env node
/**
 * Runs the whole platform as ONE web service: the API on an internal port and
 * the website (main site + /shop + /studio + /admin) on $PORT. The website
 * forwards /v1/* to the API. If either process exits, the other is stopped and
 * this script exits with the same code, so the host restarts the service.
 *
 *   node scripts/start.mjs          production (Render)
 *   node scripts/start.mjs --demo   local run with demo settings (codes shown on screen)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webPort = process.env.PORT ?? "3000";
const apiPort = process.env.API_PORT ?? "4000";

const env = { ...process.env, NODE_ENV: "production" };
if (process.argv.includes("--demo")) {
  env.DEMO_MODE ??= "true";
  env.AUTH_SECRET ??= "local-demo-only-secret";
  // Image, download and upload links go through the website's /v1, as in production.
  env.PUBLIC_API_URL ??= `http://localhost:${webPort}`;
}
env.API_URL ??= `http://127.0.0.1:${apiPort}/v1`;

const children = [];

children.push(
  spawn(process.execPath, [join(root, "apps/api/dist/main.js")], {
    cwd: join(root, "apps/api"),
    env: { ...env, PORT: apiPort },
    stdio: "inherit",
  }),
);

// Open the public port only once the API answers, so the first visitor after a
// cold start never reaches the website while /v1 is still starting.
const healthUrl = `http://127.0.0.1:${apiPort}/v1/health`;
for (let waited = 0; ; waited += 250) {
  try {
    if ((await fetch(healthUrl)).ok) break;
  } catch {
    // not listening yet
  }
  if (waited >= 60_000 || children[0].exitCode !== null) {
    console.error("[start] the API did not become healthy; stopping");
    children[0].kill("SIGTERM");
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

children.push(
  spawn(process.execPath, [join(root, "apps/web/node_modules/next/dist/bin/next"), "start", "-p", webPort, "-H", "0.0.0.0"], {
    cwd: join(root, "apps/web"),
    env: { ...env, PORT: webPort },
    stdio: "inherit",
  }),
);

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 5_000).unref();
}

for (const child of children) {
  child.on("exit", (code) => {
    console.error(`[start] process ${child.spawnargs[1]} exited with ${code}; stopping the service`);
    stopAll(code ?? 1);
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stopAll(0));
