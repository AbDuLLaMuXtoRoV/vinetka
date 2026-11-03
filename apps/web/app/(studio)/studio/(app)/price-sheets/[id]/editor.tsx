"use client";

import { itemEconomics, parseMoney, type Package, type PriceSheet, type PriceSheetItem } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { Select } from "@snapbell/ui/select";
import { Switch } from "@snapbell/ui/switch";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useAction } from "@studio/components/use-action";
import { updatePriceSheet } from "@studio/lib/actions";
import { priceSheetMsgs } from "@studio/messages/price-sheets";

const CATEGORIES = ["print", "keepsake", "group", "digital"] as const;

function MoneyInput({ cents, onChange, label, invalid }: { cents: number; onChange: (cents: number) => void; label: string; invalid?: boolean }) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  return (
    <div className="relative w-28">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted">$</span>
      <input
        value={text}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setText(e.target.value);
          // Accept a decimal comma too ("12,50"), as typed in Russian and Uzbek.
          const c = parseMoney(e.target.value.replace(",", "."));
          if (c !== null && c >= 0) onChange(c);
        }}
        onBlur={() => setText((cents / 100).toFixed(2))}
        className="h-9 w-full rounded-input border border-border bg-surface pr-2 pl-6 text-right text-sm tabular-nums focus-visible:border-ink focus-visible:outline-none aria-[invalid=true]:border-danger"
      />
    </div>
  );
}

export function PriceSheetEditor({ sheet, platformFeeBps }: { sheet: PriceSheet; platformFeeBps: number }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = priceSheetMsgs[locale].editor;
  const fmt = useFormatters();
  const money = fmt.money;
  const pct = (bps: number) => fmt.percent(bps / 10_000, 1);
  const [name, setName] = useState(sheet.name);
  const [items, setItems] = useState<PriceSheetItem[]>(sheet.items);
  const [packages, setPackages] = useState<Package[]>(sheet.packages);
  const [dirty, setDirty] = useState(false);

  const setItem = (id: string, patch: Partial<PriceSheetItem>) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setDirty(true);
  };
  const setPackage = (id: string, patch: Partial<Package>) => {
    setPackages((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const economics = useMemo(() => new Map(items.map((i) => [i.id, itemEconomics({ priceCents: i.priceCents, labCostCents: i.labCostCents, platformFeeBps })])), [items, platformFeeBps]);
  const belowCost = items.filter((i) => i.enabled && economics.get(i.id)!.belowCost);
  const grouped = CATEGORIES.map((cat) => ({ cat, rows: items.filter((i) => i.category === cat) })).filter((g) => g.rows.length);

  const packageValue = (p: Package) => p.lines.reduce((s, l) => s + (items.find((i) => i.id === l.itemId)?.priceCents ?? 0) * l.quantity, 0);
  const packageLabCost = (p: Package) => p.lines.reduce((s, l) => s + (items.find((i) => i.id === l.itemId)?.labCostCents ?? 0) * l.quantity, 0);

  const addPackage = () => {
    setPackages((list) => [
      ...list,
      { id: `pkg_new_${Date.now()}`, name: t.newPackage, description: "", priceCents: 4900, lines: items[0] ? [{ itemId: items[0].id, quantity: 1 }] : [], featured: false, enabled: true },
    ]);
    setDirty(true);
  };

  return (
    <div className="grid gap-8 pb-24">
      <Field label={t.sheetName} htmlFor="ps-name" className="max-w-md" locale={locale}>
        <Input
          id="ps-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
      </Field>

      {belowCost.length > 0 && (
        <Alert tone="warning" title={t.belowCostTitle(belowCost.length)}>
          {t.belowCostBody(belowCost.map((i) => i.name).join(", "))}
        </Alert>
      )}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">{t.products}</h2>
          <p className="text-xs text-muted">
            {t.feeNote(pct(platformFeeBps))}
          </p>
        </div>
        <Table>
          <THead>
            <tr>
              <TH className="w-10">{t.colOn}</TH>
              <TH>{t.colProduct}</TH>
              <TH>{t.colSku}</TH>
              <TH align="right">{t.colLabCost}</TH>
              <TH align="right">{t.colPrice}</TH>
              <TH align="right">{t.colFees}</TH>
              <TH align="right">{t.colProfit}</TH>
              <TH>{t.colSoldOut}</TH>
            </tr>
          </THead>
          {grouped.map((g) => (
            <TBody key={g.cat}>
              <tr>
                <td colSpan={8} className="bg-sunken/50 px-4 py-2 text-xs font-medium text-muted">
                  {t.categories[g.cat]}
                </td>
              </tr>
              {g.rows.map((i) => {
                const e = economics.get(i.id)!;
                const warn = i.enabled && e.belowCost;
                return (
                  <TR key={i.id} className={cn(!i.enabled && "opacity-55", warn && "bg-danger/5")}>
                    <TD>
                      <Checkbox id={`on-${i.id}`} aria-label={t.offer(i.name)} checked={i.enabled} onCheckedChange={(v) => setItem(i.id, { enabled: v === true })} />
                    </TD>
                    <TD className="font-medium">{i.name}</TD>
                    <TD className="font-mono text-xs text-muted">{i.sku}</TD>
                    <TD align="right">{money(i.labCostCents)}</TD>
                    <TD align="right">
                      <div className="flex justify-end">
                        <MoneyInput cents={i.priceCents} label={t.priceFor(i.name)} invalid={warn} onChange={(c) => setItem(i.id, { priceCents: c })} />
                      </div>
                    </TD>
                    <TD align="right" className="text-muted">
                      {money(e.platformFeeCents + e.cardFeeCents)}
                    </TD>
                    <TD align="right">
                      <span className={cn("inline-flex items-center gap-1 font-medium", warn ? "text-danger" : "text-success")}>
                        {warn && <TriangleAlert className="size-4" aria-label={t.belowCost} />}
                        {money(e.profitCents)}
                      </span>
                      <span className="block text-xs text-muted">{t.margin(pct(e.marginBps))}</span>
                    </TD>
                    <TD>
                      <Switch id={`so-${i.id}`} aria-label={t.soldOut(i.name)} checked={i.soldOut} onCheckedChange={(v) => setItem(i.id, { soldOut: v })} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          ))}
        </Table>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{t.packages}</h2>
            <p className="text-sm text-muted">{t.packagesBody}</p>
          </div>
          <Button variant="outline" onClick={addPackage}>
            <Plus /> {t.addPackage}
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {packages.map((p) => {
            const value = packageValue(p);
            const e = itemEconomics({ priceCents: p.priceCents, labCostCents: packageLabCost(p), platformFeeBps });
            return (
              <Card key={p.id} className={cn(!p.enabled && "opacity-60")}>
                <CardBody className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <Input value={p.name} onChange={(ev) => setPackage(p.id, { name: ev.target.value })} aria-label={t.packageName} className="font-medium" />
                    <MoneyInput cents={p.priceCents} label={t.priceFor(p.name)} invalid={e.belowCost} onChange={(c) => setPackage(p.id, { priceCents: c })} />
                  </div>
                  <Textarea rows={2} value={p.description} onChange={(ev) => setPackage(p.id, { description: ev.target.value })} aria-label={t.packageDescription} placeholder={t.descriptionPlaceholder} className="min-h-0" />
                  <ul className="grid gap-2">
                    {p.lines.map((l, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={l.quantity}
                          aria-label={t.quantity}
                          onChange={(ev) => setPackage(p.id, { lines: p.lines.map((x, j) => (j === idx ? { ...x, quantity: Math.max(1, Number(ev.target.value) || 1) } : x)) })}
                          className="h-9 w-16 rounded-input border border-border bg-surface px-2 text-sm tabular-nums"
                        />
                        <Select value={l.itemId} aria-label={t.product} wrapperClassName="flex-1" className="h-9" onChange={(ev) => setPackage(p.id, { lines: p.lines.map((x, j) => (j === idx ? { ...x, itemId: ev.target.value } : x)) })}>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </Select>
                        <Button variant="ghost" size="icon-sm" aria-label={t.removeLine} onClick={() => setPackage(p.id, { lines: p.lines.filter((_, j) => j !== idx) })}>
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" className="w-fit" onClick={() => setPackage(p.id, { lines: [...p.lines, { itemId: items[0]!.id, quantity: 1 }] })}>
                    <Plus /> {t.addProduct}
                  </Button>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
                    <Badge tone={value > p.priceCents ? "success" : "outline"}>{value > p.priceCents ? t.saves(money(value - p.priceCents)) : t.noSavings}</Badge>
                    <span className={cn("font-medium", e.belowCost ? "text-danger" : "text-muted")}>{t.profit(money(e.profitCents))}</span>
                    <div className="ml-auto flex items-center gap-4">
                      <Switch id={`feat-${p.id}`} checked={p.featured} onCheckedChange={(v) => { setDirty(true); setPackages((list) => list.map((x) => ({ ...x, featured: x.id === p.id ? v : v ? false : x.featured }))); }} label={t.featured} />
                      <Switch id={`pen-${p.id}`} checked={p.enabled} onCheckedChange={(v) => setPackage(p.id, { enabled: v })} label={t.on} />
                      <Button variant="ghost" size="icon-sm" aria-label={t.deletePackage(p.name)} onClick={() => { setPackages((list) => list.filter((x) => x.id !== p.id)); setDirty(true); }}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <div className={cn("fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur transition-transform duration-250 lg:left-[248px]", dirty ? "translate-y-0" : "translate-y-full")}>
        <div className="mx-auto flex max-w-content items-center justify-end gap-3">
          <span className="text-sm text-muted">{t.unsaved}</span>
          <Button
            variant="ghost"
            onClick={() => {
              setItems(sheet.items);
              setPackages(sheet.packages);
              setName(sheet.name);
              setDirty(false);
            }}
          >
            {t.discard}
          </Button>
          <Button loading={pending} onClick={() => run(() => updatePriceSheet(sheet.id, { name, items, packages }), { success: t.saved, onSuccess: () => setDirty(false) })}>
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
