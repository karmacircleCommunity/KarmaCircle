import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiDownload,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import useSWRInfinite from "swr/infinite";
import { useSelector } from "react-redux";
import { Footer, Navbar } from "@components";
import { selectUser } from "@app/store/slices/userSlice";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { eventEndpoints } from "@services/ApiEndpoints";
import {
  FetchAttendeesCsv,
  SetAttendeeCheckIn,
} from "@services/KarmaCircleApi";
import fetcher from "@utils/Fetcher";
import { showErrorToast } from "@utils/Toasts";
import { formatEventDate } from "@features/events/utils/formatEventFacts";
import type { ApiAttendeeList, EventAttendee } from "@features/events/types";

const PAGE_SIZE = 50;

/**
 * The organizer's attendee list for one event, routed at
 * `/organization/events/:eventId/attendees` behind `RequireSignIn` (PG-6).
 *
 * Shows who registered (name, email, when), the overall totals, and a check-in
 * toggle per person so the organizer can tick people off at the door. The list
 * pages 50 at a time with a search on name or email, and the whole list can be
 * downloaded as CSV. Only the hosting organization can read it: the API answers
 * `403` to anyone else and this page says so. A cancelled event keeps its list
 * but has check-in turned off.
 */
const EventAttendees = () => {
  const { eventId } = useParams();
  const user = useSelector(selectUser);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Wait for the person to stop typing before asking the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const getKey = (pageIndex: number, previousPage: ApiAttendeeList | null) => {
    if (
      !eventId ||
      !user.email ||
      (previousPage && pageIndex >= previousPage.pagination.totalPages)
    ) {
      return null;
    }
    return [
      eventEndpoints.attendees(eventId, {
        page: pageIndex + 1,
        limit: PAGE_SIZE,
        search,
      }),
      user.email,
    ] as const;
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite<ApiAttendeeList>(
      getKey,
      ([url]) => fetcher<ApiAttendeeList>(url),
      { revalidateFirstPage: true, revalidateOnFocus: false },
    );

  const attendees = useMemo(
    () => (data ?? []).flatMap((page) => page.data),
    [data],
  );
  const first = data?.[0];
  const hasMore = size < (first?.pagination.totalPages ?? 0);
  const cancelled = first?.event.status === "cancelled";
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;

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
    <OrganizationSetupGate
      title="Attendees open up once your profile is live"
      description="Finish your organization profile, then you can see who is coming to your events."
    >
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <Link
          to="/organization/events"
          className="inline-flex items-center gap-2 font-outfit text-body font-medium text-ink/65 no-underline transition hover:text-brand"
        >
          <FiArrowLeft aria-hidden="true" />
          Your events
        </Link>

        {isLoading ? (
          <p className="mt-10 font-poppins text-body text-ink/55">
            Loading attendees…
          </p>
        ) : error || !first ? (
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-secondary/15 bg-white px-5 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <FiDownload aria-hidden="true" />
                {exporting ? "Preparing…" : "Download CSV"}
              </button>
            </div>

            {attendees.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-14 text-center">
                <p className="m-0 font-outfit text-body-lg font-medium text-brand-secondary">
                  {search
                    ? "Nobody matches that search"
                    : "Nobody has joined yet"}
                </p>
                <p className="mx-auto mt-2 mb-0 max-w-sm font-poppins text-body text-ink/60">
                  {search
                    ? "Try part of a name or an email address."
                    : "People who join this event show up here the moment they do."}
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
                        Registered {formatEventDate(attendee.joinedAt)}
                        {attendee.checkedInAt &&
                          ` · Checked in ${formatEventDate(attendee.checkedInAt)}`}
                      </p>
                    </div>
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
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => void setSize(size + 1)}
                  disabled={isValidating}
                  className="min-h-12 cursor-pointer rounded-full border border-brand-secondary/15 bg-white px-6 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/45 disabled:cursor-wait disabled:opacity-60"
                >
                  {isValidating ? "Loading…" : "Load more attendees"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </OrganizationSetupGate>
  );
};

export default EventAttendees;
