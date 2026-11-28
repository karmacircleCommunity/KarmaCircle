import { useState } from "react";
import ConfirmDialog from "@features/events/components/ConfirmDialog";
import { JOIN_NOTE_MAX_LENGTH } from "@features/events/constants/eventAccess";
import type { JoinAsk, JoinNoteDialogProps } from "@features/events/types";

const COPY: Record<JoinAsk, { title: string; body: string; send: string }> = {
  request: {
    title: "Request to join",
    body: "The organizer approves or declines each person.",
    send: "Send request",
  },
  waitlist: {
    title: "Join the waitlist",
    body: "This event is full. The organizer moves people up when a spot opens.",
    send: "Join waitlist",
  },
};

/**
 * The step before a request or a waitlist spot (PG-4, PG-14): an optional note
 * the organizer reads on the attendee page, then send. A direct join never
 * opens it. Built on `ConfirmDialog`, so focus trapping, Escape and the
 * backdrop behave like the other event dialogs; the note field is the first
 * focusable control, so it takes initial focus.
 *
 * A failed attempt is reported here rather than in a toast, which a modal
 * dialog would cover, and the typed note is kept for another try.
 */
const JoinNoteDialog = ({
  asks,
  eventTitle,
  busy,
  error,
  onSend,
  onClose,
}: JoinNoteDialogProps) => {
  const [note, setNote] = useState("");
  const copy = COPY[asks];

  return (
    <ConfirmDialog
      title={copy.title}
      cancelLabel="Not now"
      confirmLabel={copy.send}
      busyLabel="Sending…"
      busy={busy}
      onConfirm={() => onSend(note.trim())}
      onClose={onClose}
    >
      <p className="mt-3 mb-0 font-poppins text-body leading-6 break-words text-ink/70">
        <span className="font-medium text-brand-secondary">{eventTitle}</span>.{" "}
        {copy.body}
      </p>
      <label
        htmlFor="join-note"
        className="mt-4 block font-outfit text-body font-medium text-ink/75"
      >
        Note for the organizer (optional)
      </label>
      <textarea
        id="join-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={JOIN_NOTE_MAX_LENGTH}
        readOnly={busy}
        aria-describedby="join-note-count"
        className="mt-1.5 w-full resize-y rounded-lg border border-brand-secondary/15 bg-white px-4 py-3 font-outfit text-base text-ink transition outline-none focus:border-brand/55 focus:ring-2 focus:ring-brand/15"
      />
      <p
        id="join-note-count"
        className="mt-1 mb-0 font-poppins text-caption text-ink/65"
      >
        {note.length} of {JOIN_NOTE_MAX_LENGTH} characters
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 mb-0 font-poppins text-body leading-6 text-error"
        >
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
};

export default JoinNoteDialog;
