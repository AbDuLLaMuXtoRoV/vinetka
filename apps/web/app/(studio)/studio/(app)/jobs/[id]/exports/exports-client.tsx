"use client";

import type { ExportJob, ExportType } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Table, TBody, TD, TH, THead } from "@snapbell/ui/data";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Select } from "@snapbell/ui/select";
import { Download, FileSpreadsheet, Images, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@studio/components/use-action";
import { createExport } from "@studio/lib/actions";
import { useLabels } from "@studio/components/use-labels";
import { exportsMsgs } from "@studio/messages/job-orders";
import { photosMsgs } from "@studio/messages/photos";

const ICONS: Record<ExportType, typeof Download> = { subjects_csv: FileSpreadsheet, yearbook: BookOpen, images_by_label: Images };
const TONE = { queued: "outline", running: "sage", ready: "success", failed: "danger" } as const;

export function ExportsClient({ jobId, exports, labels, email }: { jobId: string; exports: ExportJob[]; labels: string[]; email: string }) {
  const { run, pending } = useAction();
  const t = useMessages(exportsMsgs);
  const labelNames = useMessages(photosMsgs).grid.labels;
  const fmt = useFormatters();
  const { exportTypes, exportStatus } = useLabels();
  const router = useRouter();
  const [label, setLabel] = useState(labels[0] ?? "Yearbook");
  const busy = exports.some((e) => e.status === "queued" || e.status === "running");

  // Exports run as background jobs; poll while any are in progress.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [busy, router]);

  const start = (type: ExportType) =>
    run(() => createExport(jobId, type, type === "images_by_label" ? label : undefined), {
      success: t.started,
      description: t.emailWhenReady(email),
    });

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(exportTypes) as ExportType[]).map((type) => {
          const Icon = ICONS[type];
          return (
            <Card key={type}>
              <CardBody className="grid h-full content-between gap-4">
                <div className="grid gap-2">
                  <Icon className="size-6 text-muted" aria-hidden />
                  <h2 className="font-semibold">{exportTypes[type].label}</h2>
                  <p className="text-sm text-muted">{exportTypes[type].description}</p>
                </div>
                <div className="grid gap-2">
                  {type === "images_by_label" && (
                    <Select value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t.labelToExport}>
                      {labels.map((l) => (
                        <option key={l} value={l}>
                          {labelNames[l] ?? l}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button variant="secondary" loading={pending} onClick={() => start(type)}>
                    {t.start}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t.recent}</h2>
        {exports.length === 0 ? (
          <p className="text-sm text-muted">{t.empty}</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t.colExport}</TH>
                <TH>{t.colStarted}</TH>
                <TH>{t.colStatus}</TH>
                <TH>
                  <span className="sr-only">{t.download}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {exports.map((e) => (
                <tr key={e.id}>
                  <TD className="font-medium">
                    {exportTypes[e.type].label}
                    {e.label && <span className="text-muted"> · {labelNames[e.label] ?? e.label}</span>}
                  </TD>
                  <TD className="text-muted">{fmt.dateTime(e.createdAt)}</TD>
                  <TD>
                    <Badge tone={TONE[e.status]}>{e.status === "running" ? t.running : exportStatus[e.status]}</Badge>
                  </TD>
                  <TD align="right">
                    {e.status === "ready" && e.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={e.url} download>
                          <Download /> {t.download}
                        </a>
                      </Button>
                    )}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}
