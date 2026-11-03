type Capture = (event: string, props?: Record<string, unknown>) => void;

/** PostHog if it is loaded on the page, otherwise a debug log in development. */
export function track(event: "store_code_entered" | "otp_verified" | "bundle_added" | "checkout_completed" | "pass_purchased", props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const posthog = (window as unknown as { posthog?: { capture: Capture } }).posthog;
  if (posthog) posthog.capture(event, props);
  else if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, props ?? {});
}
