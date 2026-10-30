"use client";

import { X } from "lucide-react";
import { Dialog, DropdownMenu, Popover as P } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";
import { useLocale } from "./locale";

interface DialogShellProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered asChild). */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Hide the title visually but keep it for screen readers. */
  hideTitle?: boolean;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Centered modal dialog. */
export function Modal({ open, onOpenChange, trigger, title, description, hideTitle, footer, className, children, size = "md" }: DialogShellProps & { size?: "sm" | "md" | "lg" }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-overlay" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 animate-pop-in grid-rows-[auto_1fr_auto] overflow-hidden rounded-card bg-surface shadow-overlay",
            size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-lg",
            className,
          )}
        >
          <DialogHeader title={title} description={description} hideTitle={hideTitle} />
          <div className="overflow-y-auto px-6 pb-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Bottom sheet on mobile (customizer, filters); `side` makes it a drawer. */
export function Sheet({ open, onOpenChange, trigger, title, description, hideTitle, footer, className, children, side = "bottom" }: DialogShellProps & { side?: "bottom" | "right" | "left" }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-overlay" />
        <Dialog.Content
          className={cn(
            "fixed z-50 grid grid-rows-[auto_1fr_auto] bg-surface shadow-overlay",
            side === "bottom" && "inset-x-0 bottom-0 max-h-[92dvh] animate-sheet-up rounded-t-sheet pb-[env(safe-area-inset-bottom)]",
            side === "right" && "inset-y-0 right-0 w-full max-w-md animate-fade-in",
            side === "left" && "inset-y-0 left-0 w-full max-w-xs animate-fade-in",
            className,
          )}
        >
          {side === "bottom" && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />}
          <DialogHeader title={title} description={description} hideTitle={hideTitle} />
          <div className="overflow-y-auto px-6 pb-6">{children}</div>
          {footer && <div className="flex flex-wrap gap-3 border-t border-border px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogHeader({ title, description, hideTitle }: { title: ReactNode; description?: ReactNode; hideTitle?: boolean }) {
  const t = uiMessages[useLocale()];
  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 pt-5", hideTitle ? "pb-0" : "pb-4")}>
      <div className={cn("grid gap-1", hideTitle && "sr-only")}>
        <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        {description ? (
          <Dialog.Description className="text-sm text-muted">{description}</Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{typeof title === "string" ? title : t.dialog}</Dialog.Description>
        )}
      </div>
      <Dialog.Close className="-mr-2 grid size-11 shrink-0 place-items-center rounded-input text-muted hover:bg-ink/5 hover:text-ink" aria-label={t.close}>
        <X className="size-5" aria-hidden />
      </Dialog.Close>
    </div>
  );
}

/** Re-exported so callers can place a close button anywhere inside Modal/Sheet. */
export const DialogClose = Dialog.Close;

export function Popover({ trigger, children, align = "start", className }: { trigger: ReactNode; children: ReactNode; align?: "start" | "center" | "end"; className?: string }) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content align={align} sideOffset={8} className={cn("z-50 w-72 animate-pop-in rounded-card border border-border bg-surface p-4 shadow-overlay", className)}>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

/** Dropdown menu for row actions ("…") and account menus. Use `null` for a separator. */
export function Menu({ trigger, items, align = "end", label }: { trigger: ReactNode; items: Array<MenuItem | null>; align?: "start" | "end"; label?: string }) {
  const itemClass =
    "flex min-h-10 cursor-pointer items-center gap-2 rounded-input px-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-ink/6 [&_svg]:size-4";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} aria-label={label} className="z-50 min-w-48 animate-pop-in rounded-card border border-border bg-surface p-1.5 shadow-overlay">
          {items.map((item, i) =>
            item === null ? (
              <DropdownMenu.Separator key={i} className="my-1 h-px bg-border" />
            ) : item.href ? (
              <DropdownMenu.Item key={i} asChild disabled={item.disabled} className={cn(itemClass, item.danger && "text-danger")}>
                <a href={item.href}>
                  {item.icon}
                  {item.label}
                </a>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item key={i} disabled={item.disabled} onSelect={item.onSelect} className={cn(itemClass, item.danger && "text-danger")}>
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
