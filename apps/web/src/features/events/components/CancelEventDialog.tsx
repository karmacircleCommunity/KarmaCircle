import ConfirmDialog from "@features/events/components/ConfirmDialog";

interface CancelEventDialogProps {
  /** The event's name, quoted back so a wrong row is easy to spot. */
  eventName: string;
  cancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirms cancelling an event (PG-2), on top of `ConfirmDialog`. "Keep event"
 * is the focused answer because cancelling cannot be undone.
 */
const CancelEventDialog = ({
  eventName,
  cancelling,
  onConfirm,
  onClose,
}: CancelEventDialogProps) => (
  <ConfirmDialog
    title="Cancel this event?"
    cancelLabel="Keep event"
    confirmLabel="Cancel event"
    busyLabel="Cancelling…"
    busy={cancelling}
    destructive
    onConfirm={onConfirm}
    onClose={onClose}
  >
    <p className="mt-3 mb-0 font-poppins text-body leading-6 text-ink/70">
      <span className="font-medium text-brand-secondary">{eventName}</span>{" "}
      stays on KarmaCircle marked as cancelled, and nobody new can join. People
      who already joined keep their registration, but they are not emailed yet,
      so tell them yourself.
    </p>
    <p className="mt-3 mb-0 font-poppins text-body font-medium text-ink/80">
      This can’t be undone.
    </p>
  </ConfirmDialog>
);

export default CancelEventDialog;
