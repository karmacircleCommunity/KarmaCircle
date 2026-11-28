import {
  FiCalendar,
  FiEdit3,
  FiMapPin,
  FiRadio,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  formatEventBadge,
  formatEventTime,
} from "@features/events/utils/formatEventFacts";
import type { EventRecord } from "@features/events/types";
import {
  groupHostedEvents,
  hostedEventState,
} from "../utils/groupHostedEvents";

/**
 * The raw shape `GET /events?host=` actually returns (a Mongoose `Event`
 * document, unmapped) — a few fields `EventRecord`'s open index signature
 * doesn't name explicitly, needed here for real. Kept local rather than
 * widening the shared `EventRecord` type: this is the one place in the app
 * reading a *hosted* event list straight off the API with no fixture in
 * between, and `events/types` documents that type as "unverified,
 * loose by design" on purpose.
 */
interface HostedEvent extends EventRecord {
  uid: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  startTime: string;
  endTime?: string;
  /** `draft` reaches only the organization's own view of its profile. */
  status?: string;
  /** The event's own timezone, if it has one (PG-11). */
  timezone?: string;
}

/**
 * The organization profile's "Events hosted" section - a plain, compact
 * list built straight off the real `Event` API shape, not `EventCard`
 * (which needs fixture-only fields like `spotsLeft`/`organizer` the real
 * API doesn't return - see `events/SPEC.md`). Groups and labels come from
 * `utils/groupHostedEvents.ts`: drafts (only the owner is sent them) sit in
 * their own labelled group with no time state, and the rest split into
 * upcoming and past by whether the event has ended, so one that is running
 * stays under "Upcoming" and reads "Happening now". An organization with only
 * past events still gets a "Past events" heading rather than an empty
 * "Upcoming" one.
 */
const OrganizationEventsList = ({ events }: { events: HostedEvent[] }) => {
  const { drafts, upcoming, past } = groupHostedEvents(events);

  return (
    <div className="flex flex-col gap-8">
      {drafts.length > 0 && <EventGroup title="Drafts" events={drafts} />}
      {upcoming.length > 0 && <EventGroup title="Upcoming" events={upcoming} />}
      {past.length > 0 && <EventGroup title="Past events" events={past} />}
    </div>
  );
};

/** How each of `hostedEventState`'s labels looks. */
const STATE_STYLES = {
  Draft: { icon: FiEdit3, className: "text-brand-hover" },
  Cancelled: { icon: FiXCircle, className: "text-error" },
  "Happening now": { icon: FiRadio, className: "text-brand-hover" },
} as const;

const EventState = ({ event }: { event: HostedEvent }) => {
  const state = hostedEventState(event);
  if (!state) return null;
  const { icon: Icon, className } = STATE_STYLES[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {state}
    </span>
  );
};

const EventGroup = ({
  title,
  events,
}: {
  title: string;
  events: HostedEvent[];
}) => (
  <div>
    <h3 className="mb-3 font-outfit text-caption font-semibold tracking-[0.12em] text-ink/65 uppercase">
      {title}
    </h3>
    <ul className="flex list-none flex-col gap-3 p-0">
      {events.map((event) => (
        <li key={event.uid}>
          <Link
            to={`/events/${event.uid}`}
            className="group flex items-center gap-4 rounded-2xl border border-brand-secondary/8 bg-white p-3 no-underline transition-[border-color,box-shadow] duration-200 hover:border-brand/30 hover:shadow-[0_10px_26px_-20px_var(--color-brand)] sm:p-4"
          >
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-brand-secondary/10 sm:size-16">
              {event.coverImage ? (
                <img
                  src={event.coverImage}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-full items-center justify-center"
                >
                  <FiCalendar className="size-5 text-brand" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-outfit text-body-lg font-semibold tracking-tight text-brand-secondary transition-colors duration-200 group-hover:text-brand">
                {event.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-poppins text-caption text-ink/65">
                <EventState event={event} />
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                  {formatEventBadge(event.startTime, event.timezone)} ·{" "}
                  {formatEventTime(event.startTime, event.timezone)}
                </span>
                {event.mode === "Online" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiVideo aria-hidden="true" className="size-3.5 shrink-0" />
                    Online
                  </span>
                ) : (
                  event.city && (
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <FiMapPin
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      {event.city}
                    </span>
                  )
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default OrganizationEventsList;
export type { HostedEvent };
