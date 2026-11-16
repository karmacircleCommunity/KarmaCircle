import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  /** The safe answer. It takes initial focus. */
  cancelLabel: string;
  confirmLabel: string;
  /** Replaces `confirmLabel` while the request is running. */
  busyLabel: string;
  busy: boolean;
  /** Draws the confirm button as destructive. */
  destructive?: boolean;
  onConfirm: () => void;
  /** Called when the dialog closes by any route except a confirmed action. */
  onClose: () => void;
}

/**
 * A confirmation before something that is hard to undo. A native `<dialog>`
 * opened with `showModal()`, so the browser supplies the focus trap, the Escape
 * key and the backdrop. The safe answer takes initial focus, and Escape is held
 * back while a request is running so the dialog cannot vanish mid-request.
 * Used by `CancelEventDialog` and the leave-event confirmation.
 */
const ConfirmDialog = ({
  title,
  children,
  cancelLabel,
  confirmLabel,
  busyLabel,
  busy,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="m-auto w-[calc(100%-4.5rem)] max-w-md rounded-2xl border border-brand-secondary/10 bg-white p-6 text-ink shadow-[0_30px_80px_-30px_rgba(47,36,30,0.5)] backdrop:bg-black/60 sm:p-7"
    >
      <h2
        id="confirm-dialog-title"
        className="m-0 font-outfit text-xl font-semibold tracking-tight text-brand-secondary"
      >
        {title}
      </h2>
      {children}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={() => dialogRef.current?.close()}
          className="min-h-12 cursor-pointer rounded-lg border border-brand-secondary/15 bg-white px-5 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`min-h-12 cursor-pointer rounded-lg border-none px-5 font-outfit text-body font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 ${destructive ? "bg-error" : "bg-brand"}`}
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
