import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import type { Report } from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { badRequest, notFound } from "../common/errors";
import { DAY_MS, sum, toCsv } from "../common/util";
import { cents, id, parse, query } from "../common/validate";
import { Repository, type OrderRow } from "../store/repository";
import { AuthService, MANAGERS_ONLY } from "../services/auth.service";
import { CommerceService } from "../services/commerce.service";
import { ScopeService } from "../services/scope.service";
import { ViewsService } from "../services/views.service";
import { err } from "../i18n";

const refundSchema = z.object({ amountCents: cents.min(1).optional(), reason: z.string().trim().min(1).max(500) });
const reprintSchema = z.object({ itemIds: z.array(id).min(1), reason: z.string().trim().min(1).max(500) });

export function searchOrders(orders: OrderRow[], q: Record<string, unknown>): OrderRow[] {
  const status = query(q, "status");
  const jobId = query(q, "jobId");
  const text = query(q, "q")?.toLowerCase();
  return orders.filter(
    (o) =>
      (!status || o.status === status) &&
      (!jobId || o.jobId === jobId) &&
      (!text ||
        [o.number, o.contact.name, o.contact.email, o.contact.phone ?? "", ...o.items.map((i) => i.subjectName)].some((v) => v.toLowerCase().includes(text))),
  );
}

@Controller()
export class OrdersController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly views: ViewsService,
    private readonly scope: ScopeService,
    private readonly commerce: CommerceService,
  ) {}

  /** Staff see their studio's orders; parents see only their own. */
  @Get("orders")
  list(@Req() req: Request, @Query() q: Record<string, unknown>) {
    const session = this.auth.session(req);
    const orders =
      session?.k === "parent"
        ? this.views.paidOrders((o) => o.parentId === this.auth.parent(req).id)
        : this.views.paidOrders((o) => o.studioId === this.auth.staff(req).studio.id);
    return this.views.byNewest(searchOrders(orders, q)).map((o) => this.views.orderSummary(o));
  }

  @Get("orders/:id")
  get(@Req() req: Request, @Param("id") orderId: string) {
    const session = this.auth.session(req);
    if (session?.k === "parent") {
      const parent = this.auth.parent(req);
      const order = this.repo.orders.get(orderId);
      if (!order || order.parentId !== parent.id) throw notFound(err().notFound.order);
      return this.views.order(order);
    }
    const { studio } = this.auth.staff(req);
    return this.views.order(this.scope.order(studio, orderId));
  }

  @Post("orders/:id/refund")
  @HttpCode(200)
  async refund(@Req() req: Request, @Param("id") orderId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req, MANAGERS_ONLY);
    const order = this.scope.order(studio, orderId);
    return this.views.order(await this.commerce.refund(order, parse(refundSchema, body)));
  }

  @Post("orders/:id/reprint")
  @HttpCode(200)
  reprint(@Req() req: Request, @Param("id") orderId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const order = this.scope.order(studio, orderId);
    return this.views.order(this.commerce.reprint(order, parse(reprintSchema, body)));
  }

  // --- Reports (owners and admins only) ---------------------------------------------------

  private range(q: Record<string, unknown>) {
    const to = query(q, "to") ? new Date(query(q, "to")!) : new Date();
    const from = query(q, "from") ? new Date(query(q, "from")!) : new Date(to.getTime() - 29 * DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw badRequest("invalid_range", err().reports.isoDates);
    if (from > to) throw badRequest("invalid_range", err().reports.fromBeforeTo);
    if (to.getTime() - from.getTime() > 400 * DAY_MS) throw badRequest("invalid_range", err().reports.maxRange);
    // Whole days, inclusive.
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) + DAY_MS - 1);
    return { start, end };
  }

  private refunded(o: OrderRow): number {
    return sum(o.refunds, (r) => r.amountCents);
  }

  @Get("reports")
  report(@Req() req: Request, @Query() q: Record<string, unknown>): Report {
    const { studio } = this.auth.staff(req, MANAGERS_ONLY);
    const { start, end } = this.range(q);
    const jobId = query(q, "jobId");
    if (jobId) this.scope.job(studio, jobId);
    const inRange = (o: OrderRow) => {
      const t = Date.parse(o.createdAt);
      return o.studioId === studio.id && t >= start.getTime() && t <= end.getTime() && (!jobId || o.jobId === jobId);
    };
    const orders = this.views.paidOrders(inRange);
    const sales = (rows: OrderRow[]) => sum(rows, (o) => this.views.netSales(o));
    const totalSales = sales(orders);

    const byJob = [...new Set(orders.map((o) => o.jobId))]
      .map((jid) => {
        const rows = orders.filter((o) => o.jobId === jid);
        const s = sales(rows);
        return { jobId: jid, jobName: rows[0]!.jobName, orders: rows.length, salesCents: s, aovCents: rows.length ? Math.round(s / rows.length) : 0 };
      })
      .sort((a, b) => b.salesCents - a.salesCents);

    const byDay: Report["byDay"] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      const day = new Date(t).toISOString().slice(0, 10);
      const rows = orders.filter((o) => o.createdAt.slice(0, 10) === day);
      byDay.push({ date: day, orders: rows.length, salesCents: sales(rows) });
    }

    // Weekly payouts (Monday-start weeks), arriving 9 days after the week opens.
    const weeks = new Map<number, number>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY_MS;
      weeks.set(monday, (weeks.get(monday) ?? 0) + o.split.studioPayoutCents - this.refunded(o));
    }
    const now = Date.now();
    const payouts: Report["payouts"] = [...weeks.entries()]
      .sort(([a], [b]) => b - a)
      .map(([monday, amount]) => {
        const arrival = monday + 9 * DAY_MS;
        return {
          id: `po_${studio.id.slice(-6)}_${new Date(monday).toISOString().slice(0, 10)}`,
          amountCents: amount,
          arrivalDate: new Date(arrival).toISOString().slice(0, 10),
          status: arrival <= now ? "paid" : arrival - now < 3 * DAY_MS ? "in_transit" : "pending",
        };
      });

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      totals: {
        salesCents: totalSales,
        orders: orders.length,
        aovCents: orders.length ? Math.round(totalSales / orders.length) : 0,
        platformFeesCents: sum(orders, (o) => o.split.platformFeeCents),
        cardFeesCents: sum(orders, (o) => o.split.cardFeeCents),
        labCostCents: sum(orders, (o) => o.split.labCostCents),
        taxCents: sum(orders, (o) => o.split.taxCents),
        payoutCents: sum(orders, (o) => o.split.studioPayoutCents - this.refunded(o)),
      },
      byJob,
      byDay,
      payouts,
    };
  }

  @Get("reports/csv")
  reportCsv(@Req() req: Request, @Query() q: Record<string, unknown>) {
    const { studio } = this.auth.staff(req, MANAGERS_ONLY);
    const { start, end } = this.range(q);
    const orders = this.views
      .paidOrders((o) => o.studioId === studio.id && Date.parse(o.createdAt) >= start.getTime() && Date.parse(o.createdAt) <= end.getTime())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const money = (c: number) => (c / 100).toFixed(2);
    const rows = [
      ["order_number", "date", "job", "customer", "status", "subtotal", "discount", "shipping", "tax", "total", "lab_cost", "platform_fee", "card_fee", "refunded", "payout"],
      ...orders.map((o) => [
        o.number,
        o.createdAt,
        o.jobName,
        o.contact.name,
        o.status,
        money(o.split.subtotalCents),
        money(o.split.discountCents),
        money(o.split.shippingCents),
        money(o.split.taxCents),
        money(o.split.totalCents),
        money(o.split.labCostCents),
        money(o.split.platformFeeCents),
        money(o.split.cardFeeCents),
        money(this.refunded(o)),
        money(o.split.studioPayoutCents - this.refunded(o)),
      ]),
    ];
    return {
      filename: `snapbell-${studio.slug}-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.csv`,
      csv: toCsv(rows),
    };
  }
}
