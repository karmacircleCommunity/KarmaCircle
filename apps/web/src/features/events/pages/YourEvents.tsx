import { Footer, Navbar } from "@components";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import {
  FiArrowUpRight,
  FiCalendar,
  FiEdit2,
  FiEdit3,
  FiEyeOff,
  FiMapPin,
  FiPlus,
  FiSend,
  FiTrash2,
  FiUsers,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useState } from "react";
import useSWR from "swr";
import CancelEventDialog from "@features/events/components/CancelEventDialog";
import { describeWhere } from "@features/events/utils/eventMode";
import { formatEventDate } from "@features/events/utils/formatEventFacts";
import ConfirmDialog from "@features/events/components/ConfirmDialog";
import {
  CancelEvent,
  DeleteDraft,
  PublishEvent,
  UnpublishEvent,
} from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { ApiEvent, ApiEventList } from "@features/events/types";

/**
 * The organization's own events, routed at `/organization/events` — where
 * the navbar's "Your events" now points. It used to point at
 * `/event/create`, a path no route has ever matched, so the menu item was
 * a 404.
 *
 * Behind `OrganizationSetupGate`: a draft organization gets told what is
 * still missing and a link that resumes setup, because an account that
 * nobody can find has nothing to host events for yet.
 *
 * This is a live host list. It fetches `GET /events?host={handle}` — the filter runs
 * server-side, so nothing is hidden on page two. Live records carry no
 * cover photo, cause or capacity, which is why these are plain rows rather
 * than `EventCard`s: the card needs three fields a real event does not
 * have yet. See docs/specs/events.md.
 *
 * **Drafts, publish and unpublish (PG-15).** This list is the one place a draft
 * shows (the API includes the host's own drafts when the signed-in host asks for
 * its own list). A draft row has a "Draft" label and Edit, Publish and Delete
 * draft actions, and no Attendees link (nobody can join a draft). A published
 * event that has not ended also gets Unpublish, which the API only allows
 * while nobody has registered; otherwise it answers with a message saying to
 * cancel instead, shown as a toast.
 *
 * **Edit and cancel (PG-1, PG-2).** Each event that has not ended and is not
 * already cancelled gets an Edit link (`/organization/events/:uid/edit`) and
 * a Cancel button that opens a confirmation dialog. A cancelled event stays in
 * the list with a "Cancelled" label and no actions; an ended one keeps just
 * its link.
 */
const YourEvents = () => {
  const { organization } = useMyOrganization();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishingUid, setPublishingUid] = useState<string | null>(null);

  const hostKey = organization?.isLive
    ? eventEndpoints.byHost(organization.handle)
    : null;
  const { data, isLoading, mutate } = useSWR<ApiEventList>(hostKey, fetcher);

  const events = data?.data ?? [];

  /** Runs the confirmed action, then refreshes the list. */
  const confirmPending = async () => {
    if (!pending) return;
    const { kind, event } = pending;
    setBusy(true);
    const result =
      kind === "cancel"
        ? await CancelEvent(event.uid)
        : kind === "unpublish"
          ? await UnpublishEvent(event.uid)
          : await DeleteDraft(event.uid);
    setBusy(false);

    if (result.ok) {
      showSuccessToast(SUCCESS_MESSAGE[kind]);
      setPending(null);
      void mutate();
    } else {
      showErrorToast(result.message ?? FAILURE_MESSAGE[kind]);
      setPending(null);
      void mutate();
    }
  };

  const publish = async (event: ApiEvent) => {
    setPublishingUid(event.uid);
    const result = await PublishEvent(event.uid);
    setPublishingUid(null);

    if (result.ok) {
      showSuccessToast("Event published");
    } else {
      showErrorToast(
        result.errors?.[0]?.message ??
          result.message ??
          "Could not publish the event. Try again.",
      );
    }
    void mutate();
  };

  return (
    <OrganizationSetupGate
      title="Your events open up once your profile is live"
      description="Events are how people meet your organization, and right now nobody can find it — your profile is still a draft. Finish the details and you can start hosting."
    >
      <Navbar />

      <div className="mx-auto max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              Your events
            </h1>
            <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
              Everything {organization?.name ?? "your organization"} is hosting,
              as it appears to everyone else.
            </p>
          </div>
          <Link
            to="/organization/events/new"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-outfit text-body font-semibold text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <FiPlus aria-hidden="true" />
            Create event
          </Link>
        </header>

        {isLoading ? (
          <p className="mt-10 font-poppins text-body text-ink/55">
            Loading your events…
          </p>
        ) : events.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-14 text-center">
            <p className="m-0 font-outfit text-body-lg font-medium text-brand-secondary">
              You haven&apos;t hosted anything yet
            </p>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body text-ink/60">
              Your first event shows up here the moment you create one, and on
              your public profile at the same time.
            </p>
          </div>
        ) : (
          <ul className="mt-10 flex list-none flex-col gap-3 p-0">
            {events.map((event) => (
              <li
                key={event._id}
                className="rounded-2xl border border-brand-secondary/10 bg-white transition-colors hover:border-brand/35"
              >
                <Link
                  to={`/events/${event.uid}`}
                  className="flex flex-col gap-2 p-5 no-underline sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div>
                    <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-outfit text-body-lg font-medium text-brand-secondary">
                      {event.name}
                      {event.status === "draft" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-2.5 py-0.5 font-outfit text-caption font-medium tracking-wide text-brand uppercase">
                          <FiEdit3 aria-hidden className="size-3.5" />
                          Draft
                        </span>
                      )}
                      {event.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/8 px-2.5 py-0.5 font-outfit text-caption font-medium tracking-wide text-error uppercase">
                          <FiXCircle aria-hidden className="size-3.5" />
                          Cancelled
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-poppins text-body text-ink/60">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar aria-hidden className="size-4" />
                        {formatEventDate(event.startTime, event.timezone)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {event.mode === "Online" ? (
                          <FiVideo aria-hidden className="size-4" />
                        ) : (
                          <FiMapPin aria-hidden className="size-4" />
                        )}
                        {describeWhere(event)}
                      </span>
                    </p>
                  </div>
                  <FiArrowUpRight
                    aria-hidden
                    className="hidden size-5 shrink-0 text-brand sm:block"
                  />
                </Link>
                <div className="flex flex-wrap gap-3 border-t border-brand-secondary/8 px-5 py-3">
                  {event.status !== "draft" && (
                    <Link
                      to={`/organization/events/${event.uid}/attendees`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-secondary/15 px-4 font-outfit text-body font-medium text-brand-secondary no-underline transition hover:border-brand/45 hover:text-brand"
                    >
                      <FiUsers aria-hidden className="size-4" />
                      Attendees
                      <span className="sr-only"> for {event.name}</span>
                    </Link>
                  )}
                  {canManage(event) && (
                    <>
                      <Link
                        to={`/organization/events/${event.uid}/edit`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-secondary/15 px-4 font-outfit text-body font-medium text-brand-secondary no-underline transition hover:border-brand/45 hover:text-brand"
                      >
                        <FiEdit2 aria-hidden className="size-4" />
                        Edit
                        <span className="sr-only"> {event.name}</span>
                      </Link>
                      {event.status === "draft" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void publish(event)}
                            disabled={publishingUid === event.uid}
                            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border-none bg-brand px-4 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
                          >
                            <FiSend aria-hidden className="size-4" />
                            {publishingUid === event.uid
                              ? "Publishing…"
                              : "Publish"}
                            <span className="sr-only"> {event.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPending({ kind: "delete", event })
                            }
                            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-error/25 bg-transparent px-4 font-outfit text-body font-medium text-error transition hover:bg-error/5"
                          >
                            <FiTrash2 aria-hidden className="size-4" />
                            Delete draft
                            <span className="sr-only"> {event.name}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPending({ kind: "unpublish", event })
                            }
                            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-brand-secondary/15 bg-transparent px-4 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45 hover:text-brand"
                          >
                            <FiEyeOff aria-hidden className="size-4" />
                            Unpublish
                            <span className="sr-only"> {event.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPending({ kind: "cancel", event })
                            }
                            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-error/25 bg-transparent px-4 font-outfit text-body font-medium text-error transition hover:bg-error/5"
                          >
                            <FiXCircle aria-hidden className="size-4" />
                            Cancel event
                            <span className="sr-only"> {event.name}</span>
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending?.kind === "cancel" && (
        <CancelEventDialog
          eventName={pending.event.name}
          cancelling={busy}
          onConfirm={confirmPending}
          onClose={() => !busy && setPending(null)}
        />
      )}
      {pending?.kind === "unpublish" && (
        <ConfirmDialog
          title="Take this event offline?"
          cancelLabel="Keep it public"
          confirmLabel="Unpublish"
          busyLabel="Unpublishing…"
          busy={busy}
          onConfirm={confirmPending}
          onClose={() => !busy && setPending(null)}
        >
          <p className="mt-3 mb-0 font-poppins text-body leading-6 text-ink/70">
            <span className="font-medium text-brand-secondary">
              {pending.event.name}
            </span>{" "}
            goes back to a draft that only you can see, and you can publish it
            again later. This only works while nobody has registered; once
            someone has, cancel the event instead.
          </p>
        </ConfirmDialog>
      )}
      {pending?.kind === "delete" && (
        <ConfirmDialog
          title="Delete this draft?"
          cancelLabel="Keep draft"
          confirmLabel="Delete draft"
          busyLabel="Deleting…"
          busy={busy}
          destructive
          onConfirm={confirmPending}
          onClose={() => !busy && setPending(null)}
        >
          <p className="mt-3 mb-0 font-poppins text-body leading-6 text-ink/70">
            <span className="font-medium text-brand-secondary">
              {pending.event.name}
            </span>{" "}
            is deleted for good. It was never public, so nobody loses anything.
          </p>
          <p className="mt-3 mb-0 font-poppins text-body font-medium text-ink/80">
            This can’t be undone.
          </p>
        </ConfirmDialog>
      )}

      <Footer />
    </OrganizationSetupGate>
  );
};

type PendingAction = {
  kind: "cancel" | "unpublish" | "delete";
  event: ApiEvent;
};

const SUCCESS_MESSAGE: Record<PendingAction["kind"], string> = {
  cancel: "Event cancelled",
  unpublish: "Event is now a draft",
  delete: "Draft deleted",
};

const FAILURE_MESSAGE: Record<PendingAction["kind"], string> = {
  cancel: "Could not cancel the event. Try again.",
  unpublish: "Could not unpublish the event. Try again.",
  delete: "Could not delete the draft. Try again.",
};

/** Edit and the rest apply until an event ends, and never to a cancelled one. */
const canManage = (event: ApiEvent) =>
  event.status !== "cancelled" &&
  new Date(event.endTime).getTime() >= Date.now();

export default YourEvents;
