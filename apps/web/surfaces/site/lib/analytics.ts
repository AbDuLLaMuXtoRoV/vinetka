/**
 * Thin analytics wrapper. PostHog (or Plausible) is loaded by a script tag in
 * production; in development events are only logged so nothing leaves the machine.
 */
export type AnalyticsEvent =
  | "contact_submitted"
  | "demo_booked"
  | "calculator_used"
  | "store_code_entered";

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Props) => void };
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === "undefined") return;
  let sent = false;
  if (window.posthog) {
    window.posthog.capture(event, props);
    sent = true;
  }
  if (window.plausible) {
    window.plausible(event, { props });
    sent = true;
  }
  if (!sent && process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event, props);
  }
}
