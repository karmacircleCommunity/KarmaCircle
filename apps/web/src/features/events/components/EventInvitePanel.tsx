import { useState } from "react";
import type { FormEvent } from "react";
import { FiMail, FiX } from "react-icons/fi";
import useSWR from "swr";
import { eventEndpoints } from "@services/ApiEndpoints";
import { InviteToEvent, RevokeInvite } from "@services/KarmaCircleApi";
import fetcher from "@utils/Fetcher";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import { parseInviteEmails } from "@features/events/utils/inviteEmails";
import {
  eventPhase,
  formatEventDate,
} from "@features/events/utils/formatEventFacts";
import type { ApiEvent, EventInvite } from "@features/events/types";

interface EventInvitePanelProps {
  uid: string;
  /** Invites cannot be sent for a cancelled event. */
  disabled: boolean;
  /** Called after an invitation is sent, so the attendee list can refresh. */
  onChanged: () => void;
}

/**
 * The organizer's invitation box on the attendee page (PG-4). Invited people
 * must sign in with the exact email they were invited on; an invitation lets
 * them join on any access level and past the capacity, and the invitation
 * email links them to the event. Shows what was sent and lets an unused
 * invitation be taken back.
 *
 * Once the event has started, invitations are closed (the API refuses them),
 * so the box says so instead of offering the form. The list of what was sent
 * stays, read only.
 */
const EventInvitePanel = ({
  uid,
  disabled,
  onChanged,
}: EventInvitePanelProps) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, mutate } = useSWR<{ data: EventInvite[] }>(
    eventEndpoints.invites(uid),
    fetcher,
  );
  const invites = data?.data ?? [];
  // The attendee list carries no times, so the event itself is read for them.
  const { data: record, mutate: refreshRecord } = useSWR<ApiEvent>(
    eventEndpoints.byUid(uid),
    fetcher,
  );
  const started =
    record !== undefined &&
    eventPhase(record.startTime, record.endTime) !== "upcoming";
  const emails = parseInviteEmails(text);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || emails.length === 0) return;
    setSending(true);
    const result = await InviteToEvent(uid, emails);
    setSending(false);

    if (!result.ok || !result.result) {
      // It may have started since this page loaded.
      void refreshRecord();
      showErrorToast(
        result.errors?.[0]?.message ??
          result.message ??
          "Could not send the invitations. Try again.",
      );
      return;
    }

    const { invited, skipped } = result.result;
    setText("");
    void mutate();
    onChanged();
    if (invited.length > 0) {
      showSuccessToast(
        `${invited.length} ${invited.length === 1 ? "invitation" : "invitations"} sent${
          skipped.length > 0 ? `, ${skipped.length} skipped` : ""
        }`,
      );
    } else {
      showErrorToast(
        "Everyone you listed was already invited or already registered.",
      );
    }
  };

  const revoke = async (invite: EventInvite) => {
    if (busyId) return;
    setBusyId(invite.id);
    const result = await RevokeInvite(uid, invite.id);
    setBusyId(null);
    if (result.ok) void mutate();
    else showErrorToast(result.message ?? "Could not remove the invitation.");
  };

  return (
    <section
      aria-labelledby="invite-heading"
      className="mt-8 rounded-2xl border border-brand-secondary/10 bg-white p-5"
    >
      <h2
        id="invite-heading"
        className="m-0 inline-flex items-center gap-2 font-outfit text-body-lg font-semibold text-brand-secondary"
      >
        <FiMail aria-hidden="true" className="size-4 text-brand" />
        Invite people
      </h2>
      <p className="mt-1.5 mb-0 font-poppins text-body leading-6 text-ink/65">
        {started
          ? "Invitations are closed because the event has started."
          : "An invited person skips approval and can join even when the event is full. They must sign in with the email you invite."}
      </p>

      {!started && (
        <form onSubmit={send} className="mt-4 flex flex-col gap-3">
          <label
            htmlFor="invite-emails"
            className="font-outfit text-body font-medium text-ink/75"
          >
            Email addresses
          </label>
          <textarea
            id="invite-emails"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={disabled}
            placeholder="name@example.com, another@example.com"
            className="w-full rounded-lg border border-brand-secondary/15 bg-white px-4 py-3 font-outfit text-body text-ink transition outline-none focus:border-brand/55 focus:ring-2 focus:ring-brand/15 disabled:opacity-55"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 font-poppins text-caption text-ink/65">
              Separate emails with commas, spaces or new lines. Up to 50 at a
              time.
            </p>
            <button
              type="submit"
              disabled={disabled || sending || emails.length === 0}
              className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-brand px-5 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55"
            >
              {sending
                ? "Sending…"
                : emails.length > 1
                  ? `Send ${emails.length} invitations`
                  : "Send invitation"}
            </button>
          </div>
        </form>
      )}

      {invites.length > 0 && (
        <ul className="mt-5 flex list-none flex-col gap-2 border-t border-brand-secondary/8 p-0 pt-4">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-3 font-poppins text-body text-ink/75"
            >
              <span className="min-w-0 truncate">
                {invite.email}
                <span className="ml-2 text-caption text-ink/65">
                  {invite.joined
                    ? "Joined"
                    : `Invited ${formatEventDate(invite.invitedAt)}`}
                </span>
              </span>
              {!invite.joined && (
                <button
                  type="button"
                  onClick={() => void revoke(invite)}
                  disabled={busyId !== null || disabled || started}
                  aria-label={`Remove the invitation for ${invite.email}`}
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink/65 transition hover:bg-error/8 hover:text-error disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <FiX aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EventInvitePanel;
