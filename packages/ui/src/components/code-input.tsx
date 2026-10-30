"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";
import { useLocale } from "./locale";

/**
 * Six boxes that auto-advance: album access codes (alphanumeric) and one-time
 * passcodes (numeric). Paste fills every box; Backspace walks back.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  mode = "alphanumeric",
  label,
  invalid,
  disabled,
  autoFocus,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  mode?: "alphanumeric" | "numeric";
  /** Accessible name for the group, e.g. "Album code". */
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const t = uiMessages[useLocale()];
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const pattern = mode === "numeric" ? /[^0-9]/g : /[^A-Za-z0-9]/g;
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const commit = (next: string) => {
    const clean = next.replace(pattern, "").toUpperCase().slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleInput = (i: number, raw: string) => {
    const typed = raw.replace(pattern, "").toUpperCase();
    if (!typed) return;
    const next = (value.slice(0, i) + typed + value.slice(i + typed.length)).slice(0, length);
    const clean = commit(next);
    focus(Math.min(i + typed.length, clean.length));
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = commit(e.clipboardData.getData("text"));
    focus(clean.length);
  };

  return (
    <div role="group" aria-label={label} className={cn("flex gap-2", className)}>
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={char}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode={mode === "numeric" ? "numeric" : "text"}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          maxLength={length}
          aria-label={t.codeChar(label, i + 1, length)}
          aria-invalid={invalid || undefined}
          className="h-14 w-11 min-w-0 flex-1 rounded-input border border-border bg-surface text-center font-mono text-xl font-semibold text-ink uppercase transition-colors duration-150 focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:outline-none aria-[invalid=true]:border-danger disabled:opacity-50 md:h-16 md:max-w-14"
        />
      ))}
    </div>
  );
}
