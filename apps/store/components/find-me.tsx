"use client";

import type { AlbumPhoto } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { PhotoTile } from "@snapbell/ui/commerce/photo-tile";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { useMessages } from "@snapbell/ui/locale";
import { Camera, ImageUp, RefreshCw, ScanFace, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addToMyAlbum, searchBySelfie } from "@/app/actions";
import { findMeMsgs } from "@/messages/find-me";

const MAX_EDGE = 640;

/** Draws a source onto a canvas no larger than 640px and returns raw base64 JPEG (no data: prefix). */
function toBase64(source: CanvasImageSource, width: number, height: number, mirror = false): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
}

type Step = "consent" | "capture" | "results";

/** Screen 4: Team and Open albums. Consent first; the selfie is deleted right after the search. */
export function FindMe({ code, studioName, tags }: { code: string; studioName: string; tags: string[] }) {
  const router = useRouter();
  const t = useMessages(findMeMsgs);
  const [step, setStep] = useState<Step>("consent");
  const [agreed, setAgreed] = useState(false);
  const [results, setResults] = useState<AlbumPhoto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  useEffect(() => {
    if (step !== "capture") return;
    let cancelled = false;
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.noCameraApi);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setCameraError(t.cameraBlocked));
    return () => {
      cancelled = true;
      stopCamera();
    };
    // Messages only change with the language, which reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const search = (imageBase64: string) => {
    setError(null);
    stopCamera();
    start(async () => {
      const res = await searchBySelfie(code, imageBase64);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResults(res.data);
      setSelected(res.data.map((p) => p.id));
      setStep("results");
    });
  };

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    search(toBase64(v, v.videoWidth, v.videoHeight, true));
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      search(toBase64(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setError(t.badFile);
    img.src = url;
  };

  const uploadButton = (
    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-input border border-ink/70 px-4 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
      <ImageUp className="size-4" aria-hidden /> {t.upload}
      <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
    </label>
  );

  if (step === "consent") {
    return (
      <div className="grid gap-6">
        <div className="grid justify-items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink">
            <ScanFace className="size-7" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="text-muted">{t.intro}</p>
        </div>
        <ul className="grid gap-3 rounded-card border border-border bg-surface p-5 text-sm">
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <span>
              {t.pointDeleted[0]}
              <strong>{t.pointDeleted[1]}</strong>
              {t.pointDeleted[2]}
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <span>{t.pointSeason}</span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <span>{t.pointPrivate(studioName)}</span>
          </li>
        </ul>
        <Checkbox
          id="biometric-consent"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          label={t.consent}
          description={
            <>
              {t.policy[0]}
              <a href="https://snapbell.com/biometrics" className="underline underline-offset-2" target="_blank" rel="noreferrer">
                {t.policy[1]}
              </a>
              {t.policy[2]}
            </>
          }
        />
        <div className="grid gap-3">
          <Button size="lg" block disabled={!agreed} onClick={() => setStep("capture")}>
            <Camera aria-hidden /> {t.continue}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/a/${code}`}>{tags.length ? t.skipTags : t.skipAll}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (step === "capture") {
    return (
      <div className="grid gap-5">
        <h1 className="text-xl font-semibold">{t.captureTitle}</h1>
        {cameraError ? (
          <Alert tone="warning">{cameraError}</Alert>
        ) : (
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-sheet bg-sunken">
            <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" aria-label={t.cameraPreview} />
            <div className="pointer-events-none absolute inset-[14%_18%] rounded-[50%] border-2 border-dashed border-white/80" aria-hidden />
          </div>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-3 md:grid-cols-2">
          {!cameraError && (
            <Button size="lg" loading={pending} onClick={capture}>
              <Camera aria-hidden /> {pending ? t.searching : t.takeSelfie}
            </Button>
          )}
          {uploadButton}
        </div>
        <p className="text-center text-xs text-muted">{t.captureHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{results.length ? t.found(results.length) : t.noMatches}</h1>
          <p className="text-sm text-muted">{t.deleted}</p>
        </div>
        <Button variant="ghost" onClick={() => setStep("capture")}>
          <RefreshCw aria-hidden /> {t.tryAgain}
        </Button>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<ScanFace />}
          title={t.clearerTitle}
          description={t.clearerBody}
          action={
            <Button asChild variant="outline">
              <Link href={`/a/${code}`}>{t.browse}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {results.map((p, i) => (
              <li key={p.id}>
                <PhotoTile
                  src={p.thumbUrl}
                  alt={t.matchAlt(i + 1)}
                  selected={selected.includes(p.id)}
                  onSelect={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                />
              </li>
            ))}
          </ul>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button
            size="lg"
            block
            disabled={selected.length === 0}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await addToMyAlbum(code, selected);
                if (res.ok) router.push(`/a/${code}`);
                else setError(res.message);
              })
            }
          >
            {t.add(selected.length)}
          </Button>
        </>
      )}
    </div>
  );
}
