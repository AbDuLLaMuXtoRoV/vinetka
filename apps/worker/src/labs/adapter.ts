import { createHash } from "node:crypto";

export interface LabOrderLine {
  sku: string;
  quantity: number;
  /** Signed URL to the full-resolution, unwatermarked print file. */
  imageUrl: string;
  customization?: Record<string, unknown> | null;
}

export interface LabOrder {
  submissionId: string;
  orderId: string;
  orderNumber: string;
  lines: LabOrderLine[];
  /** Null for bulk (school pickup) batches, which ship to the studio or school. */
  shipTo: { name: string; line1: string; line2: string | null; city: string; state: string; postalCode: string; country: string } | null;
}

export interface LabSubmitResult {
  externalRef: string;
  status: "submitted" | "accepted";
}

/**
 * One adapter per fulfilment lab. Status changes come back through the API's
 * POST /v1/webhooks/lab/:lab endpoint.
 */
export interface LabAdapter {
  readonly id: string;
  submit(order: LabOrder): Promise<LabSubmitResult>;
  cancel(externalRef: string): Promise<void>;
}

/** Accepts everything immediately; used in development and staging. */
export class MockLab implements LabAdapter {
  readonly submitted = new Map<string, LabOrder>();

  constructor(readonly id: string) {}

  async submit(order: LabOrder): Promise<LabSubmitResult> {
    const externalRef = `MOCK-${createHash("sha1").update(order.submissionId).digest("hex").slice(0, 10).toUpperCase()}`;
    this.submitted.set(externalRef, order);
    return { externalRef, status: "accepted" };
  }

  async cancel(externalRef: string): Promise<void> {
    this.submitted.delete(externalRef);
  }
}

const adapters = new Map<string, LabAdapter>();

/** Real lab integrations register here; unknown labs fall back to the mock in non-production environments. */
export function labAdapter(labId: string): LabAdapter {
  let adapter = adapters.get(labId);
  if (!adapter) {
    if (process.env.NODE_ENV === "production") throw new Error(`No lab adapter registered for ${labId}`);
    adapter = new MockLab(labId);
    adapters.set(labId, adapter);
  }
  return adapter;
}

export function registerLabAdapter(adapter: LabAdapter): void {
  adapters.set(adapter.id, adapter);
}
