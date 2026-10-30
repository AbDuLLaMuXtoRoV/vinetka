"use client";

import type { UploadTicket } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Alert, ProgressBar } from "@snapbell/ui/feedback";
import { FileDropZone } from "@snapbell/ui/file-drop-zone";
import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { CircleCheck, CircleX, LoaderCircle, RotateCcw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { completeUpload, presignUploads } from "@/lib/actions";
import { photosMsgs } from "@/messages/photos";

type Status = "queued" | "uploading" | "done" | "failed";
interface Item {
  key: string;
  file: File;
  status: Status;
  loaded: number;
  ticket: UploadTicket | null;
  error: string | null;
  offline: boolean;
}

const CONCURRENCY = 3;
const PRESIGN_BATCH = 25;

/** PUT with progress. Resolves with the HTTP status (0 = network failure, CORS or dropped connection). */
function put(url: string, file: File, headers: Record<string, string>, onProgress: (loaded: number) => void): Promise<number> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.onabort = () => resolve(0);
    xhr.send(file);
  });
}

async function dimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const d = { width: bmp.width, height: bmp.height };
    bmp.close();
    return d;
  } catch {
    return {};
  }
}

/**
 * Resumable at the file level: thousands of files, a few in flight at once.
 * Failed files keep their place and retry automatically when the connection comes back.
 */
export function Uploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const t = useMessages(photosMsgs).upload;
  const items = useRef<Item[]>([]);
  const active = useRef(0);
  const presigning = useRef(false);
  const [, setVersion] = useState(0);
  const rerender = useCallback(() => setVersion((v) => v + 1), []);

  const pump = useCallback(async () => {
    // Presign the next batch of files that don't have an upload ticket yet.
    const needTicket = items.current.filter((i) => i.status === "queued" && !i.ticket);
    if (needTicket.length > 0 && !presigning.current) {
      presigning.current = true;
      const batch = needTicket.slice(0, PRESIGN_BATCH);
      const res = await presignUploads(
        jobId,
        batch.map((i) => ({ name: i.file.name, size: i.file.size, type: i.file.type || "image/jpeg" })),
      );
      presigning.current = false;
      if (res.ok) {
        batch.forEach((item, idx) => (item.ticket = res.data[idx] ?? null));
      } else {
        batch.forEach((item) => Object.assign(item, { status: "failed", error: res.error, offline: !navigator.onLine }));
      }
      rerender();
    }

    while (active.current < CONCURRENCY) {
      const next = items.current.find((i) => i.status === "queued" && i.ticket);
      if (!next) break;
      active.current++;
      next.status = "uploading";
      next.loaded = 0;
      rerender();
      void upload(next).finally(() => {
        active.current--;
        rerender();
        if (items.current.some((i) => i.status === "queued")) void pump();
        else if (active.current === 0) router.refresh();
      });
    }
    if (items.current.some((i) => i.status === "queued" && !i.ticket)) setTimeout(() => void pump(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, rerender, router]);

  const upload = async (item: Item) => {
    const ticket = item.ticket!;
    const onProgress = (loaded: number) => {
      item.loaded = loaded;
      rerender();
    };
    let status = await put(ticket.url, item.file, ticket.headers, onProgress);
    if (status === 0 && navigator.onLine) {
      // Direct upload blocked (e.g. dev API without CORS): relay through this app.
      const relayHeaders: Record<string, string> = { "x-upload-url": ticket.url };
      for (const [k, v] of Object.entries(ticket.headers)) relayHeaders[`x-upload-header-${k.toLowerCase()}`] = v;
      status = await put("/api/upload", item.file, relayHeaders, onProgress);
    }
    if (status === 403) item.ticket = null; // expired ticket: presign again on retry
    if (status < 200 || status >= 300) {
      Object.assign(item, { status: "failed", offline: status === 0, error: status === 0 ? t.connectionLost : t.uploadFailed(status) });
      return;
    }
    const done = await completeUpload(ticket.uploadId, await dimensions(item.file));
    if (done.ok) Object.assign(item, { status: "done", loaded: item.file.size, error: null });
    else Object.assign(item, { status: "failed", error: done.error, offline: false });
  };

  const retryFailed = useCallback(() => {
    for (const i of items.current) if (i.status === "failed") Object.assign(i, { status: "queued", error: null, offline: false });
    rerender();
    void pump();
  }, [pump, rerender]);

  useEffect(() => {
    const online = () => {
      if (items.current.some((i) => i.status === "failed" && i.offline)) {
        toast({ title: t.backOnline, description: t.resuming });
        retryFailed();
      }
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (items.current.some((i) => i.status === "uploading" || i.status === "queued")) e.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [retryFailed, toast, t]);

  const add = (files: File[]) => {
    const known = new Set(items.current.map((i) => `${i.file.name}:${i.file.size}`));
    const fresh = files.filter((f) => !known.has(`${f.name}:${f.size}`));
    items.current.push(
      ...fresh.map((file, n) => ({ key: `${Date.now()}-${n}-${file.name}`, file, status: "queued" as Status, loaded: 0, ticket: null, error: null, offline: false })),
    );
    if (fresh.length < files.length) toast({ title: t.duplicatesSkipped(files.length - fresh.length) });
    rerender();
    void pump();
  };

  const list = items.current;
  const total = list.reduce((s, i) => s + i.file.size, 0);
  const loaded = list.reduce((s, i) => s + (i.status === "done" ? i.file.size : i.loaded), 0);
  const counts = {
    done: list.filter((i) => i.status === "done").length,
    failed: list.filter((i) => i.status === "failed").length,
    waiting: list.filter((i) => i.status === "queued" || i.status === "uploading").length,
  };
  const offline = list.some((i) => i.status === "failed" && i.offline);
  const recent = list.filter((i) => i.status !== "done").slice(0, 8);

  return (
    <section className="grid gap-4" aria-label={t.section}>
      <FileDropZone
        allowFolder
        accept="image/jpeg,image/png"
        title={t.dropTitle}
        hint={t.dropHint}
        onFiles={add}
      />
      {list.length > 0 && (
        <div className="grid gap-4 rounded-card border border-border bg-surface p-5">
          <ProgressBar value={total ? (loaded / total) * 100 : 0} label={t.progress(counts.done, list.length, counts.waiting)} tone={counts.waiting ? "accent" : "success"} />
          {offline && (
            <Alert tone="warning" title={t.connectionLost}>
              <span className="inline-flex items-center gap-1">
                <WifiOff className="size-4" aria-hidden /> {t.pauseResume}
              </span>
            </Alert>
          )}
          {recent.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {recent.map((i) => (
                <li key={i.key} className="flex items-center gap-2">
                  {i.status === "failed" ? <CircleX className="size-4 text-danger" aria-label={t.failed} /> : i.status === "uploading" ? <LoaderCircle className="size-4 animate-spin text-muted" aria-label={t.uploading} /> : <span className="size-4 rounded-full border border-border" aria-label={t.waiting} />}
                  <span className="min-w-0 flex-1 truncate">{i.file.name}</span>
                  <span className="text-xs text-muted tabular-nums">{i.status === "uploading" ? `${Math.round((i.loaded / i.file.size) * 100)}%` : i.error ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {counts.failed > 0 && (
              <Button variant="outline" size="sm" onClick={retryFailed}>
                <RotateCcw /> {t.retryFailed(counts.failed)}
              </Button>
            )}
            {counts.waiting === 0 && counts.failed === 0 && (
              <p className="inline-flex items-center gap-2 text-sm text-success">
                <CircleCheck className="size-4" aria-hidden /> {t.allDone}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
