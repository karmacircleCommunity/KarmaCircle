import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiEdit2,
  FiEdit3,
  FiEyeOff,
  FiMapPin,
  FiRadio,
  FiSend,
  FiTrash2,
  FiUsers,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useState } from "react";
import useSWR from "swr";
import { SkeletonRegion, SkeletonRows } from "@components";
import CancelEventDialog from "@features/events/components/CancelEventDialog";
import ConfirmDialog from "@features/events/components/ConfirmDialog";
import MyEventsTabs from "@features/events/components/MyEventsTabs";
import { HOSTING_LISTS } from "@features/events/constants/myEvents";
import { describeWhere } from "@features/events/utils/eventMode";
import {
  eventPhase,
  formatEventDate,
} from "@features/events/utils/formatEventFacts";
import {
  MISSING_KIND_MESSAGE,
  onlyKindStopsPublish,
} from "@features/events/utils/validateEvent";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import {
  groupHostedEvents,
  hostedEventState,
} from "@features/organizations/utils/groupHostedEvents";
import {
  CancelEvent,
  DeleteDraft,
  PublishEvent,
  UnpublishEvent,
} from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type {
  ApiEvent,
  ApiEventList,
  HostingList,
} from "@features/events/types";

const EMPTY: Record<HostingList, { title: string; body: string }> = {
  Upcoming: {
    title: "No upcoming events",
    body: "Events you publish show up here until they end.",
  },
  Past: {
    title: "No past events",
    body: "Events you hosted show up here once they end.",
  },
  Drafts: {
    title: "No drafts",
    body: "Events you save as a draft show up here. Only you can see them.",
  },
};

interface HostedEventsProps {
  list: HostingList;
  onList: (list: HostingList) => void;
}

/**
 * My Events' Hosting view: the events the signed-in organization runs, whether
 * or not its public profile is finished. It fetches `GET /events?host={handle}`
 * (filtered by the API) and splits the answer into Upcoming (which includes
 * events running now), Past and Drafts. Rows are plain, not `EventCard`s: the
 * card needs fields a live event may not have. See docs/specs/events.md.
 *
 * **Drafts, publish and unpublish (PG-15).** Drafts is the one list a draft
 * shows in (the API includes the host's own drafts when the signed-in host asks
 * for its own events). A draft row has Edit, Publish and Delete draft actions,
 * and no Attendees link (nobody can join a draft); one whose end has passed
 * keeps only Delete draft. A draft may be saved with much less than publishing
 * needs, so when the API refuses Publish over a field, the row says why (the
 * first field's message) and links to the edit form. A draft whose only gap is
 * the kind of event is stopped the same way before the request, because only
 * the web requires one. A published event that has not ended also gets
 * Unpublish, which the API only allows while nobody has registered; otherwise
 * it answers with a message saying to cancel instead, shown as a toast.
 * Publishing or unpublishing opens the list the event moved to.
 *
 * **Edit and cancel (PG-1, PG-2).** Each event that has not ended and is not
 * already cancelled gets an Edit link (`/organization/events/:uid/edit`) and
 * a Cancel button that opens a confirmation dialog. A cancelled event stays in
 * its list with a "Cancelled" label and no actions; an ended one keeps just
 * its link and its attendees.
 */
const HostedEvents = ({ list, onList }: HostedEventsProps) => {
  const {
    organization,
    isLoading: loadingOrganization,
    error: organizationError,
    mutate: retryOrganization,
  } = useMyOrganization();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishingUid, setPublishingUid] = useState<string | null>(null);
  // The draft whose last Publish was refused over a field, and why.
  const [refusal, setRefusal] = useState<PublishRefusal | null>(null);

  const hostKey = organization
    ? eventEndpoints.byHost(organization.handle)
    : null;
  const { data, error, isLoading, mutate } = useSWR<ApiEventList>(
    hostKey,
    fetcher,
  );

  const events = data?.data ?? [];
  const groups = groupHostedEvents(events);
  const shown = {
    Upcoming: groups.upcoming,
    Past: groups.past,
    Drafts: groups.drafts,
  }[list];
  const loading = loadingOrganization || isLoading;
  const failed = !data && Boolean(error || organizationError);

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
    setPending(null);

    if (!result.ok) {
      showErrorToast(result.message ?? FAILURE_MESSAGE[kind]);
      void mutate();
      return;
    }
    showSuccessToast(SUCCESS_MESSAGE[kind]);
    await mutate();
    if (kind === "unpublish") onList("Drafts");
  };

  const publish = async (event: ApiEvent) => {
    if (onlyKindStopsPublish(event)) {
      setRefusal({ uid: event.uid, message: MISSING_KIND_MESSAGE });
      return;
    }
    setPublishingUid(event.uid);
    setRefusal(null);
    const result = await PublishEvent(event.uid);
    setPublishingUid(null);

    if (result.ok) {
      showSuccessToast("Event published");
      await mutate();
      onList("Upcoming");
      return;
    }
    if (result.errors?.[0]?.message) {
      // Something is missing or wrong: it stays on the row, beside the way to
      // fix it, instead of in a toast that is gone in two seconds.
      setRefusal({ uid: event.uid, message: result.errors[0].message });
    } else {
      showErrorToast(
        result.message ?? "Could not publish the event. Try again.",
      );
    }
    void mutate();
  };

  return (
    <>
      <MyEventsTabs
        label="Events you are hosting"
        idPrefix="my-events-tab"
        panelId="my-events-panel"
        options={HOSTING_LISTS.map((value) => ({
          value,
          label: value,
          // A draft is easy to forget, so its list says how many there are.
          count: value === "Drafts" ? groups.drafts.length : undefined,
        }))}
        selected={list}
        onSelect={onList}
        variant="line"
      />

      <div
        id="my-events-panel"
        role="tabpanel"
        aria-labelledby={`my-events-tab-${list}`}
      >
        {loading ? (
          <SkeletonRegion label="Loading your events…" className="mt-6">
            <SkeletonRows lines={2} />
          </SkeletonRegion>
        ) : failed ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-error/25 bg-error/5 px-6 py-8"
          >
            <p className="m-0 font-outfit text-lg font-medium text-brand-secondary">
              Could not load your events
            </p>
            <p className="mt-2 font-poppins text-body text-ink/70">
              Please try again.
            </p>
            <button
              type="button"
              onClick={() => {
                void retryOrganization();
                void mutate();
              }}
              className="mt-4 cursor-pointer rounded-lg border-none bg-brand px-5 py-2.5 font-poppins text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Try again
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-12 sm:text-center">
            <FiCalendar
              aria-hidden
              className="size-8 text-brand/70 sm:mx-auto"
            />
            <p className="mt-4 font-outfit text-lg font-medium text-brand-secondary">
              {events.length === 0
                ? "You haven't hosted anything yet"
                : EMPTY[list].title}
            </p>
            <p className="mt-2 font-poppins text-body text-ink/65">
              {events.length === 0
                ? "Your first event shows up here the moment you create one."
                : EMPTY[list].body}
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex list-none flex-col gap-3 p-0">
            {shown.map((event) => (
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
                      <HostedState event={event} />
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
                      {event.requestCount ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-caption font-semibold text-white">
                          {event.requestCount} waiting
                        </span>
                      ) : null}
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
                  {/* A draft can always be deleted, even once its dates pass. */}
                  {event.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => setPending({ kind: "delete", event })}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-error/25 bg-transparent px-4 font-outfit text-body font-medium text-error transition hover:bg-error/5"
                    >
                      <FiTrash2 aria-hidden className="size-4" />
                      Delete draft
                      <span className="sr-only"> {event.name}</span>
                    </button>
                  )}
                </div>
                {event.status === "draft" && refusal?.uid === event.uid && (
                  <div
                    role="alert"
                    className="flex flex-col items-start gap-3 rounded-b-2xl border-t border-error/20 bg-error/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <p className="m-0 min-w-0 font-poppins text-body leading-6 break-words text-ink/80">
                      <span className="font-medium text-error">
                        Not published yet.
                      </span>{" "}
                      {refusal.message}
                    </p>
                    {canManage(event) && (
                      <Link
                        to={`/organization/events/${event.uid}/edit`}
                        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-brand-secondary/15 bg-white px-4 font-outfit text-body font-medium text-brand-secondary no-underline transition hover:border-brand/45 hover:text-brand"
                      >
                        <FiEdit2 aria-hidden className="size-4" />
                        Finish this event
                        <span className="sr-only">: {event.name}</span>
                      </Link>
                    )}
                  </div>
                )}
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
    </>
  );
};

/** How each of a hosted row's labels looks. */
const STATE_STYLES = {
  Draft: {
    icon: FiEdit3,
    className: "border-brand/30 bg-brand/8 text-brand-hover",
  },
  Cancelled: {
    icon: FiXCircle,
    className: "border-error/25 bg-error/8 text-error",
  },
  "Happening now": {
    icon: FiRadio,
    className: "border-brand/30 bg-brand/8 text-brand-hover",
  },
  Ended: {
    icon: FiCheck,
    className:
      "border-brand-secondary/15 bg-brand-secondary/8 text-brand-secondary",
  },
} as const;

/** Where a hosted event stands, when that is more than "coming up". */
const HostedState = ({ event }: { event: ApiEvent }) => {
  const state =
    hostedEventState(event) ??
    (eventPhase(event.startTime, event.endTime) === "ended"
      ? "Ended"
      : undefined);
  if (!state) return null;
  const { icon: Icon, className } = STATE_STYLES[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-outfit text-caption font-medium tracking-wide uppercase ${className}`}
    >
      <Icon aria-hidden className="size-3.5" />
      {state}
    </span>
  );
};

type PublishRefusal = { uid: string; message: string };

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

export default HostedEvents;
