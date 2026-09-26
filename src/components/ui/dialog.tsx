"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-lg rounded-xl border border-border bg-surface p-0 shadow-xl backdrop:bg-ink/40",
        className
      )}
    >
      <div className="flex items-start justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink rounded-md p-1 hover:bg-surface-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
