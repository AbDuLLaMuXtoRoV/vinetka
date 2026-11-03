"use client";

import type { CsvImportResult } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Table, TBody, TD, TH, THead } from "@snapbell/ui/data";
import { Alert } from "@snapbell/ui/feedback";
import { FileDropZone } from "@snapbell/ui/file-drop-zone";
import { Field } from "@snapbell/ui/field";
import { Sheet } from "@snapbell/ui/overlay";
import { useLocale } from "@snapbell/ui/locale";
import { Select } from "@snapbell/ui/select";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useAction } from "@studio/components/use-action";
import { importSubjects } from "@studio/lib/actions";
import { parseCsv } from "@studio/lib/csv";
import { rosterMsgs } from "@studio/messages/roster";

type Target = "firstName" | "lastName" | "group" | "accessCode";
// Header guesses include common Russian and Uzbek column names too.
const TARGETS: Array<{ key: Target; required: boolean; guesses: RegExp }> = [
  { key: "firstName", required: true, guesses: /^(first|given|fname|first.?name|student.?first|имя|ism)/i },
  { key: "lastName", required: true, guesses: /^(last|family|surname|lname|last.?name|student.?last|фамилия|familiya)/i },
  { key: "group", required: true, guesses: /(grade|class|homeroom|teacher|team|group|room|класс|группа|команда|sinf|guruh|jamoa)/i },
  { key: "accessCode", required: false, guesses: /(code|access|код|kod)/i },
];

/** Upload a CSV, map its columns to roster fields, import, then show per-row errors. */
export function CsvImport({ jobId, primary }: { jobId: string; primary?: boolean }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = rosterMsgs[locale].csv;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<Target, string>>({ firstName: "", lastName: "", group: "", accessCode: "" });
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const headers = rows[0] ?? [];

  const reset = () => {
    setText("");
    setRows([]);
    setResult(null);
    setFileName("");
  };

  const load = async (file: File) => {
    const content = await file.text();
    const parsed = parseCsv(content);
    setText(content);
    setRows(parsed);
    setFileName(file.name);
    setResult(null);
    const hdr = parsed[0] ?? [];
    const guess = (re: RegExp) => hdr.find((h) => re.test(h.trim())) ?? "";
    setMapping({ firstName: guess(TARGETS[0]!.guesses), lastName: guess(TARGETS[1]!.guesses), group: guess(TARGETS[2]!.guesses), accessCode: guess(TARGETS[3]!.guesses) });
  };

  const ready = TARGETS.every((t) => !t.required || mapping[t.key]);
  const mappedIdx = (k: Target) => headers.indexOf(mapping[k]);

  return (
    <Sheet
      side="right"
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      trigger={
        <Button variant={primary ? "primary" : "outline"}>
          <FileSpreadsheet /> {t.button}
        </Button>
      }
      title={t.title}
      description={t.description}
      footer={
        rows.length > 1 && !result ? (
          <Button
            block
            loading={pending}
            disabled={!ready}
            onClick={() =>
              run(
                () =>
                  importSubjects(jobId, text, {
                    firstName: mapping.firstName,
                    lastName: mapping.lastName,
                    group: mapping.group,
                    ...(mapping.accessCode ? { accessCode: mapping.accessCode } : {}),
                  }),
                {
                  success: t.imported,
                  onSuccess: (r) => setResult(r),
                },
              )
            }
          >
            {t.importRows(rows.length - 1)}
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-5">
        {result ? (
          <>
            <Alert tone={result.errors.length ? "warning" : "success"} title={t.resultTitle(result.imported, result.updated)}>
              {result.errors.length ? t.resultErrors(result.errors.length) : t.resultOk}
            </Alert>
            {result.errors.length > 0 && (
              <Table>
                <THead>
                  <tr>
                    <TH>{t.colRow}</TH>
                    <TH>{t.colProblem}</TH>
                  </tr>
                </THead>
                <TBody>
                  {result.errors.map((e) => (
                    <tr key={e.row}>
                      <TD className="font-mono">{e.row}</TD>
                      <TD>{e.message}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
            <Button variant="outline" onClick={reset}>
              {t.another}
            </Button>
          </>
        ) : rows.length === 0 ? (
          <FileDropZone accept="text/csv,.csv,application/vnd.ms-excel" multiple={false} title={t.dropTitle} hint={t.dropHint} onFiles={(f) => f[0] && void load(f[0])} />
        ) : (
          <>
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> <span className="text-muted">· {t.rows(rows.length - 1)}</span>{" "}
              <button type="button" className="text-muted underline" onClick={reset}>
                {t.changeFile}
              </button>
            </p>
            <div className="grid gap-4">
              {TARGETS.map((target) => (
                <Field key={target.key} label={t.targets[target.key]} htmlFor={`map-${target.key}`} locale={locale}>
                  <Select id={`map-${target.key}`} value={mapping[target.key]} onChange={(e) => setMapping((m) => ({ ...m, [target.key]: e.target.value }))} aria-invalid={target.required && !mapping[target.key] ? true : undefined}>
                    <option value="">{target.required ? t.chooseColumn : t.generateCodes}</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t.preview}</p>
              <Table>
                <THead>
                  <tr>
                    <TH>{t.colFirst}</TH>
                    <TH>{t.colLast}</TH>
                    <TH>{t.colGroup}</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.slice(1, 6).map((r, i) => (
                    <tr key={i}>
                      <TD>{r[mappedIdx("firstName")] ?? "—"}</TD>
                      <TD>{r[mappedIdx("lastName")] ?? "—"}</TD>
                      <TD>{r[mappedIdx("group")] ?? "—"}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
