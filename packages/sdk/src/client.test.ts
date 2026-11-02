import { describe, expect, it } from "vitest";
import { ApiError, createClient } from "./client";

function fakeFetch(responses: Array<Response | Error>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${String(input)}`);
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { impl, calls };
}

const gateway = () => new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("client retries while the API wakes up", () => {
  it("retries a gateway 502 (the request never reached the API) and succeeds", async () => {
    const { impl, calls } = fakeFetch([gateway(), json(200, { ok: true })]);
    const client = createClient({ baseUrl: "https://api.test/v1", fetch: impl });
    await expect(client.auth.sendOtp({ destination: "+998901234567", channel: "sms" })).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("never retries an error answered by the API itself", async () => {
    const { impl, calls } = fakeFetch([json(503, { statusCode: 503, error: "maintenance", message: "Down for maintenance" })]);
    const client = createClient({ baseUrl: "https://api.test/v1", fetch: impl });
    await expect(client.studio.get()).rejects.toMatchObject({ status: 503, code: "maintenance" });
    expect(calls).toHaveLength(1);
  });

  it("does not resend a POST that failed mid-flight (it may have reached the API)", async () => {
    const reset = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    const { impl, calls } = fakeFetch([reset]);
    const client = createClient({ baseUrl: "https://api.test/v1", fetch: impl, locale: "uz" });
    const error = await client.checkout.confirm("ord_1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("unreachable");
    expect((error as ApiError).message).toMatch(/Snapbell bilan bogʻlanib/);
    expect(calls).toHaveLength(1);
  });

  it("retries a POST whose connection was refused (it never reached the API)", async () => {
    const refused = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const { impl, calls } = fakeFetch([refused, json(200, { received: true, id: "c1" })]);
    const client = createClient({ baseUrl: "https://api.test/v1", fetch: impl });
    await expect(client.contact.submit({ kind: "contact", name: "A", email: "a@example.com", message: "Hi" })).resolves.toMatchObject({ received: true });
    expect(calls).toHaveLength(2);
  });

  it("shows a translated message instead of a raw HTML error page", async () => {
    const { impl } = fakeFetch([new Response("<html>oops</html>", { status: 500, statusText: "Internal Server Error" })]);
    const client = createClient({ baseUrl: "https://api.test/v1", fetch: impl, locale: "ru" });
    await expect(client.studio.get()).rejects.toMatchObject({ code: "unreachable", message: expect.stringMatching(/Не удалось связаться/) });
  });
});
