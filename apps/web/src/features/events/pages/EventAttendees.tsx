import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiDownload,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Footer,
  InfiniteScroll,
  Navbar,
  Skeleton,
  SkeletonRegion,
  SkeletonRows,
} from "@components";
import { usePagedList } from "@hooks";
import { selectUser } from "@app/store/slices/userSlice";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { eventEndpoints } from "@services/ApiEndpoints";
import {
  ApproveAttendee,
  DeclineAttendee,
  FetchAttendeesCsv,
  SetAttendeeCheckIn,
} from "@services/KarmaCircleApi";
import { showErrorToast } from "@utils/Toasts";
import EventInvitePanel from "@features/events/components/EventInvitePanel";
import { formatEventDate } from "@features/events/utils/formatEventFacts";
import { hostingPath } from "@features/events/utils/myEvents";
import type {
  ApiAttendeeList,
  EventAttendee,
  RegistrationStatus,
} from "@features/events/types";

/** The lists the organizer can switch between, and what each is called. */
const TABS: { status: RegistrationStatus; label: string }[] = [
  { status: "going", label: "Going" },
  { status: "pending", label: "Requests" },
  { status: "waitlisted", label: "Waitlist" },
  { status: "declined", label: "Declined" },
];

const EMPTY_COPY: Record<RegistrationStatus, [string, string]> = {
  going: [
    "Nobody has joined yet",
    "People who join this event show up here the moment they do.",
  ],
  pending: [
    "No requests waiting",
    "When someone asks to join, they show up here for you to approve or decline.",
  ],
  waitlisted: [
    "Nobody is on the waitlist",
    "When the event is full, new people join the waitlist and you move them up here.",
  ],
  declined: [
    "Nobody was declined",
    "People you decline stay here, and you can approve them again later.",
  ],
};

const PAGE_SIZE = 50;

/**
 * The organizer's attendee list for one event, routed at
 * `/organization/events/:eventId/attendees` behind `RequireSignIn` (PG-6).
 *
 * Shows who registered (name, email, when), the overall totals, and a check-in
 * toggle per person so the organizer can tick people off at the door. The list
 * loads 50 at a time as the reader scrolls, with a search on name or email, and
 * the whole list can be downloaded as CSV. Only the hosting organization can read it: the API answers
 * `403` to anyone else and this page says so. A cancelled event keeps its list
 * but has check-in, approvals and invitations turned off.
 *
 * **Requests and the waitlist (PG-4, PG-14).** An event that asks for approval,
 * or that has people waiting, also shows Requests, Waitlist and Declined tabs
 * with their counts. A request or a waitlisted person can be approved (moved
 * up, which may go past the capacity) or declined, and a declined person can be
 * approved again. An approval or invite-only event also shows the invitation
 * box.
 */
const EventAttendees = () => {
  const { eventId } = useParams();
  const user = useSelector(selectUser);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<RegistrationStatus>("going");

  // Wait for the person to stop typing before asking the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const list = usePagedList<EventAttendee, ApiAttendeeList>({
    getKey: (page) =>
      eventId && user.email
        ? ([
            eventEndpoints.attendees(eventId, {
              page,
              limit: PAGE_SIZE,
              search,
              status: tab,
            }),
            user.email,
          ] as const)
        : null,
    itemKey: (attendee) => attendee.id,
    // The heading, totals and search box stay while another search or list
    // loads; only the rows give way to placeholders.
    config: { keepPreviousData: true, revalidateOnFocus: false },
  });
  const { items: attendees, error, isLoading, mutate } = list;
  // Never another event's page, kept while this one loads.
  const first = list.first?.event.uid === eventId ? list.first : undefined;
  const cancelled = first?.event.status === "cancelled";
  const waiting =
    (first?.summary.pending ?? 0) +
    (first?.summary.waitlisted ?? 0) +
    (first?.summary.declined ?? 0);
  const showTabs = first
    ? first.event.access !== "open" || waiting > 0 || tab !== "going"
    : false;
  const showInvites = first ? first.event.access !== "open" : false;
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;

  const decide = async (
    attendee: EventAttendee,
    action: typeof ApproveAttendee,
    failure: string,
  ) => {
    if (!eventId || busyId) return;
    setBusyId(attendee.id);
    const result = await action(eventId, attendee.id);
    setBusyId(null);
    if (result.ok) {
      void mutate();
    } else {
      showErrorToast(result.message ?? failure);
    }
  };

  const toggleCheckIn = async (attendee: EventAttendee) => {
    if (!eventId || busyId) return;
    setBusyId(attendee.id);
    const result = await SetAttendeeCheckIn(
      eventId,
      attendee.id,
      !attendee.checkedIn,
    );
    setBusyId(null);
    if (result.ok) {
      void mutate();
    } else {
      showErrorToast(result.message ?? "Could not update check-in. Try again.");
    }
  };

  const exportCsv = async () => {
    if (!eventId || exporting) return;
    setExporting(true);
    const result = await FetchAttendeesCsv(eventId);
    setExporting(false);
    if (!result.ok) {
      showErrorToast(
        result.message ?? "Could not download the list. Try again.",
      );
      return;
    }

    const url = URL.createObjectURL(
      new Blob([result.csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventId}-attendees.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <OrganizationSetupGate requireLive={false}>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <Link
          to={hostingPath()}
          className="inline-flex items-center gap-2 font-outfit text-body font-medium text-ink/65 no-underline transition hover:text-brand"
        >
          <FiArrowLeft aria-hidden="true" />
          My events
        </Link>

        {!first && isLoading ? (
          <SkeletonRegion label="Loading attendees…" className="mt-7">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-10 w-4/5 sm:w-3/5" />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <Skeleton shape="box" className="h-22" />
              <Skeleton shape="box" className="h-22" />
            </div>
            <Skeleton shape="box" className="mt-6 h-12" />
            <SkeletonRows trailing="button" className="mt-6" />
          </SkeletonRegion>
        ) : !first ? (
          <div className="mt-10">
            <h1 className="m-0 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              {status === 403
                ? "You can only see your own events’ attendees"
                : status === 404
                  ? "We couldn’t find that event"
                  : "We couldn’t load the attendees"}
            </h1>
            <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
              {status === 403
                ? "This event is hosted by another organization."
                : status === 404
                  ? `There is no event at /${eventId ?? "unknown"}.`
                  : "Check your connection and try again."}
            </p>
            {status !== 403 && status !== 404 && (
              <button
                type="button"
                onClick={() => void mutate()}
                className="mt-6 min-h-12 cursor-pointer rounded-lg border border-brand-secondary/15 bg-white px-5 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          <>
            <header className="mt-7">
              <p className="m-0 font-outfit text-caption font-semibold tracking-[0.16em] text-brand uppercase">
                Who is coming
              </p>
              <h1 className="mt-2 mb-0 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
                {first.event.name}
              </h1>
              <p className="mt-3 mb-0 max-w-xl font-poppins text-body leading-6 text-ink/65">
                Only you can see this list. Emails are shown so you can contact
                people about the event.
              </p>
            </header>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl border border-brand-secondary/10 bg-white p-4">
                <dt className="inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
                  <FiUsers aria-hidden="true" className="size-3.5 text-brand" />
                  Registered
                </dt>
                <dd className="m-0 mt-1 font-outfit text-2xl font-semibold text-brand-secondary">
                  {first.summary.registered}
                  {first.event.capacity !== undefined && (
                    <span className="text-body font-medium text-ink/50">
                      {" "}
                      of {first.event.capacity}
                    </span>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl border border-brand-secondary/10 bg-white p-4">
                <dt className="inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
                  <FiCheck aria-hidden="true" className="size-3.5 text-brand" />
                  Checked in
                </dt>
                <dd className="m-0 mt-1 font-outfit text-2xl font-semibold text-brand-secondary">
                  {first.summary.checkedIn}
                </dd>
              </div>
            </dl>

            {cancelled && (
              <p
                role="status"
                className="mt-6 mb-0 rounded-xl border border-error/25 bg-error/8 px-4 py-3 font-poppins text-body leading-6 text-error"
              >
                This event was cancelled, so check-in is turned off. The list is
                kept so you can still contact people.
              </p>
            )}

            {showInvites && (
              <EventInvitePanel
                uid={first.event.uid}
                disabled={cancelled}
                onChanged={() => void mutate()}
              />
            )}

            {showTabs && (
              <div
                role="tablist"
                aria-label="Registrations"
                className="mt-8 flex flex-wrap gap-2"
              >
                {TABS.map(({ status: tabStatus, label }) => {
                  const count =
                    tabStatus === "going"
                      ? first.summary.registered
                      : first.summary[tabStatus];
                  return (
                    <button
                      key={tabStatus}
                      type="button"
                      role="tab"
                      aria-selected={tab === tabStatus}
                      onClick={() => setTab(tabStatus)}
                      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 font-outfit text-body font-medium transition ${
                        tab === tabStatus
                          ? "border-brand/35 bg-brand/8 text-brand"
                          : "border-brand-secondary/15 bg-white text-brand-secondary hover:border-brand/45"
                      }`}
                    >
                      {label}
                      <span className="text-caption text-ink/55">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <FiSearch
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink/45"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name or email"
                  aria-label="Search attendees"
                  maxLength={100}
                  className="min-h-12 w-full rounded-lg border border-brand-secondary/15 bg-white py-3 pr-4 pl-11 font-outfit text-body text-ink transition outline-none focus:border-brand/55 focus:ring-2 focus:ring-brand/15"
                />
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={exporting || first.summary.registered === 0}
                title="Downloads the people who are going"
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-secondary/15 bg-white px-5 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <FiDownload aria-hidden="true" />
                {exporting ? "Preparing…" : "Download CSV"}
              </button>
            </div>

            {isLoading ? (
              <SkeletonRegion label="Loading attendees…" className="mt-6">
                <SkeletonRows trailing="button" testId="attendee-skeleton" />
              </SkeletonRegion>
            ) : attendees.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-14 text-center">
                <p className="m-0 font-outfit text-body-lg font-medium text-brand-secondary">
                  {search ? "Nobody matches that search" : EMPTY_COPY[tab][0]}
                </p>
                <p className="mx-auto mt-2 mb-0 max-w-sm font-poppins text-body text-ink/60">
                  {search
                    ? "Try part of a name or an email address."
                    : EMPTY_COPY[tab][1]}
                </p>
              </div>
            ) : (
              <ul className="mt-6 flex list-none flex-col gap-3 p-0">
                {attendees.map((attendee) => (
                  <li
                    key={attendee.id}
                    className="flex flex-col gap-3 rounded-2xl border border-brand-secondary/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate font-outfit text-body-lg font-medium text-brand-secondary">
                        {attendee.name || "Unnamed attendee"}
                      </p>
                      <p className="mt-0.5 mb-0 truncate font-poppins text-body text-ink/65">
                        {attendee.email}
                      </p>
                      <p className="mt-1 mb-0 font-poppins text-caption text-ink/50">
                        {attendee.status === "going" ? "Registered" : "Asked"}{" "}
                        {formatEventDate(attendee.joinedAt)}
                        {attendee.checkedInAt &&
                          ` · Checked in ${formatEventDate(attendee.checkedInAt)}`}
                      </p>
                      {attendee.note && (
                        <p className="mt-2 mb-0 rounded-lg bg-surface-warm px-3 py-2 font-poppins text-body leading-6 break-words whitespace-pre-line text-ink/70">
                          {attendee.note}
                        </p>
                      )}
                    </div>
                    {attendee.status !== "going" ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void decide(
                              attendee,
                              ApproveAttendee,
                              "Could not approve this person. Try again.",
                            )
                          }
                          disabled={cancelled || busyId !== null}
                          aria-label={`${attendee.status === "waitlisted" ? "Move up" : "Approve"} ${attendee.name || attendee.email}`}
                          className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-none bg-brand px-5 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {attendee.status === "waitlisted"
                            ? "Move up"
                            : "Approve"}
                        </button>
                        {attendee.status !== "declined" && (
                          <button
                            type="button"
                            onClick={() =>
                              void decide(
                                attendee,
                                DeclineAttendee,
                                "Could not decline this person. Try again.",
                              )
                            }
                            disabled={cancelled || busyId !== null}
                            aria-label={`Decline ${attendee.name || attendee.email}`}
                            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-brand-secondary/15 bg-white px-5 font-outfit text-body font-medium text-brand-secondary transition hover:border-error/45 hover:text-error disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void toggleCheckIn(attendee)}
                        disabled={cancelled || busyId !== null}
                        aria-pressed={attendee.checkedIn}
                        aria-label={`${attendee.checkedIn ? "Undo check-in for" : "Check in"} ${attendee.name || attendee.email}`}
                        className={`inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 font-outfit text-body font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                          attendee.checkedIn
                            ? "border border-brand/35 bg-brand/8 text-brand"
                            : "border-none bg-brand text-white hover:bg-brand-hover"
                        }`}
                      >
                        {attendee.checkedIn ? (
                          <>
                            <FiCheck aria-hidden="true" /> Checked in
                          </>
                        ) : (
                          "Check in"
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {list.isLoadingMore && (
              <SkeletonRows
                count={Math.min(list.remaining, 3)}
                trailing="button"
                testId="attendee-skeleton"
                className="mt-3"
              />
            )}
            {!isLoading && (attendees.length > 0 || error) && (
              <InfiniteScroll
                {...list.scroll}
                itemsName="attendees"
                endMessage={
                  list.loadedPages > 1
                    ? `That's all ${list.total} people.`
                    : undefined
                }
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </OrganizationSetupGate>
  );
};

export default EventAttendees;
