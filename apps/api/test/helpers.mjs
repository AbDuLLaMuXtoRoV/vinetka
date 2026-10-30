import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Boots the compiled API (dist) in-process on a random port. */
export async function startApi() {
  process.env.LOG_LEVEL ??= "error";
  process.env.PROCESSING_DELAY_MS ??= "50";
  const { bootstrap } = require("../dist/main.js");
  const { Repository } = require("../dist/store/repository.js");
  const { app, port } = await bootstrap(0);
  const base = `http://localhost:${port}/v1`;

  async function call(method, path, { token, body, headers } = {}) {
    const res = await fetch(path.startsWith("http") ? path : base + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body (SVG, CSV, XML)
    }
    return { status: res.status, data, text, headers: res.headers };
  }

  return { app, base, call, repo: app.get(Repository), close: () => app.close() };
}

export async function staffToken(call, email = "owner@brightside.photo") {
  const res = await call("POST", "/auth/login", { body: { email, password: "picture-day" } });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data.token;
}

export async function parentToken(call, destination = "+15555550123") {
  const sent = await call("POST", "/auth/otp/send", { body: { destination, channel: "sms" } });
  if (sent.status !== 200) throw new Error(`otp send failed: ${sent.status} ${JSON.stringify(sent.data)}`);
  const verified = await call("POST", "/auth/otp/verify", {
    body: { destination, code: sent.data.devCode, consent: { smsUpdates: true, marketing: false } },
  });
  if (verified.status !== 200) throw new Error(`otp verify failed: ${verified.status}`);
  return verified.data.token;
}
