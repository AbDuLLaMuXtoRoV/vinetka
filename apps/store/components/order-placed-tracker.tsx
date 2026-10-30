"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/** Fires checkout_completed once when the order page opens straight after payment. */
export function OrderPlacedTracker({ orderId, totalCents }: { orderId: string; totalCents: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("checkout_completed", { orderId, totalCents });
    window.history.replaceState(window.history.state, "", `/orders/${orderId}`);
  }, [orderId, totalCents]);
  return null;
}
