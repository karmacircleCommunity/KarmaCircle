import { useEffect, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import useSWR, { useSWRConfig } from "swr";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";
import ComponentHelmet from "@components/ComponentHelmet";
import { useSectionReveal } from "@hooks";
import { eventEndpoints } from "@services/ApiEndpoints";
import { selectUser } from "@app/store/slices/userSlice";
import fetcher from "@utils/Fetcher";
import { JoinEvent, LeaveEvent } from "@services/KarmaCircleApi";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@utils/Toasts";
import RichText from "@features/events/components/RichText";
import ConfirmDialog from "@features/events/components/ConfirmDialog";
import EventAgenda from "@features/events/components/detail/EventAgenda";
import EventCalendarLinks from "@features/events/components/detail/EventCalendarLinks";
import EventFacts from "@features/events/components/detail/EventFacts";
import EventFundraiserPanel from "@features/events/components/detail/EventFundraiserPanel";
import EventHero from "@features/events/components/detail/EventHero";
import EventJoinPanel from "@features/events/components/detail/EventJoinPanel";
import EventLocationPanel from "@features/events/components/detail/EventLocationPanel";
import EventMobileActionBar from "@features/events/components/detail/EventMobileActionBar";
import EventOrganizerPanel from "@features/events/components/detail/EventOrganizerPanel";
import EventSection from "@features/events/components/detail/EventSection";
import { joinView } from "@features/events/utils/joinView";
import { toDisplayEventDetail } from "@features/events/utils/toDisplayEventDetail";
import type {
  ApiEvent,
  ApiRegistration,
  DetailedEventRecord,
  JoinView,
} from "@features/events/types";

/**
 * The event detail page, routed at `/events/:eventId` - the page an
 * `EventCard` in the directory grid opens.
 *
 * **Live data, September 2026.** Fetches `GET /events?uid={eventId}`
 * (`eventEndpoints.byUid`), the same three-way loading/not-found/view
 * branch `OrganizationProfile.tsx` already uses for its own live fetch.
 * This replaces the two fixture lookups (`findEvent`/`findEventDetail`
 * against `constants/eventDirectory.ts`/`eventDetails.ts`) this page used
 * until August 2026 - both fixture files are gone; every card in the grid
 * now links to a real event's `uid`, and this page finally resolves it.
 *
 * Everything below is unchanged from the fixture-driven version - mapping
 * happens once, in `utils/toDisplayEventDetail.ts`, not inline in JSX.
 *
 * **`EventOrganizerPanel` (September 2026).** A dedicated "Hosted by" card
 * in the sidebar, right below `EventJoinPanel` - every event is now
 * guaranteed a real organization behind it (`event.service.ts#createEvent`
 * rejects a non-organization host), so this is always a real, working link
 * to `/organization/:handle`, not just `EventHero`'s smaller inline
 * "Hosted by [name]" text under the title.
 */
/**
 * The wording of the leave confirmation for each standing a person can give up:
 * a place they hold, a request still waiting, or a waitlist spot (PG-3, PG-14).
 */
const LEAVE_COPY: Partial<
  Record<
    JoinView["kind"],
    {
      title: string;
      keep: string;
      confirm: string;
      body: string;
      toast: string;
    }
  >
> & {
  going: {
    title: string;
    keep: string;
    confirm: string;
    body: string;
    toast: string;
  };
} = {
  going: {
    title: "Leave this event?",
    keep: "Stay registered",
    confirm: "Leave event",
    body: "will no longer show in My Events, and your place is given to someone else. You can join again later if there is still room.",
    toast: "You left this event",
  },
  pending: {
    title: "Withdraw your request?",
    keep: "Keep my request",
    confirm: "Withdraw request",
    body: "will no longer show in My Events. You can ask again later.",
    toast: "Your request was withdrawn",
  },
  waitlisted: {
    title: "Leave the waitlist?",
    keep: "Stay on the waitlist",
    confirm: "Leave the waitlist",
    body: "will no longer show in My Events. You can join the waitlist again later while the event is still full.",
    toast: "You left the waitlist",
  },
};

const DetailedEvent = () => {
  const { eventId } = useParams();
  const { data, error, isLoading } = useSWR<ApiEvent>(
    eventId ? eventEndpoints.byUid(eventId) : null,
    fetcher,
  );

  if (isLoading) return <DetailedEventLoading />;
  if (error || !data) return <EventNotFound eventId={eventId} />;

  return <DetailedEventView {...toDisplayEventDetail(data)} />;
};

const DetailedEventLoading = () => (
  <>
    <Navbar />
    <div className="mx-auto max-w-6xl px-9 py-24 sm:px-10 lg:px-12">
      <p className="font-poppins text-body text-ink/55">Loading event…</p>
    </div>
    <Footer />
  </>
);

const EventNotFound = ({ eventId }: { eventId?: string }) => (
  <>
    <Navbar />
    <div className="mx-auto flex max-w-2xl flex-col items-start px-9 py-24 sm:px-10 lg:px-12">
      <span className="rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase">
        Not found
      </span>
      <h1 className="mt-6 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
        No event at <span className="text-brand">/{eventId ?? "unknown"}</span>
      </h1>
      <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
        This one either finished and came down, or was never here. The directory
        has everything currently open.
      </p>
      <Button
        to="/events"
        className="mt-8 inline-flex w-auto items-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium no-underline"
      >
        <FiArrowLeft aria-hidden="true" /> Back to events
      </Button>
    </div>
    <Footer />
  </>
);

const DetailedEventView = ({ event, detail }: DetailedEventRecord) => {
  const user = useSelector(selectUser);
  const [joining, setJoining] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { mutate: mutateGlobal } = useSWRConfig();
  const registrationKey =
    user.isLoggedIn && user.email
      ? ([eventEndpoints.registration(event.id), user.email] as const)
      : null;
  const {
    data: registration,
    error: registrationError,
    isLoading: registrationLoading,
    mutate: mutateRegistration,
  } = useSWR<ApiRegistration>(registrationKey, ([url]) => fetcher(url));
  const join = joinView(event, registration);
  const checkingRegistration = user.isLoggedIn && registrationLoading;
  const registrationCheckFailed = user.isLoggedIn && Boolean(registrationError);
  const pageRef = useRef<HTMLDivElement>(null);

  useSectionReveal(pageRef);

  // EventMobileActionBar only needs to exist when the real join control -
  // EventJoinPanel's own button - isn't on screen. Showing both at once was
  // the exact duplication a phone screenshot caught: EventJoinPanel is the
  // first thing on a phone (see the `order-1` comment below), so right after
  // the hero the fixed bar and the in-flow "Join this event" button were
  // both visible together, one directly under the other. `joinPanelVisible`
  // starts `true` so nothing flashes in before the observer's first
  // callback fires. The bar also steps aside once the sentinel just above
  // <Footer /> is reachable, so it never covers the footer's own newsletter
  // form and links for the rest of the scroll - `hidden` below is the OR of
  // both reasons to stay out of the way.
  const joinPanelRef = useRef<HTMLDivElement>(null);
  const [joinPanelVisible, setJoinPanelVisible] = useState(true);
  const footerSentinelRef = useRef<HTMLDivElement>(null);
  const [nearFooter, setNearFooter] = useState(false);

  const joinEvent = async () => {
    if (joining) return;
    if (registrationCheckFailed) {
      void mutateRegistration();
      return;
    }
    if (join.kind !== "join") return;
    setJoining(true);
    const response = await JoinEvent(event.id);
    setJoining(false);

    if (response.ok) {
      // What the person now is: going, or waiting on the organizer (PG-14).
      const status: ApiRegistration["status"] =
        response.data?.status ?? "going";
      void mutateRegistration(
        { joined: status === "going", status, invited: false },
        false,
      );
      // Going / spots left come from the event record.
      void mutateGlobal(eventEndpoints.byUid(event.id));
      if (status !== "going") {
        showSuccessToast(
          response.data?.message ?? "Your request was sent to the organizer.",
        );
      } else if (response.data?.emailSent) {
        showSuccessToast("You joined this event. Confirmation email sent.");
      } else {
        showWarningToast(
          "You joined this event, but confirmation email could not be sent.",
        );
      }
      return;
    }
    showErrorToast(response.message || "Could not join this event.");
    // A refused join (the event just filled up) means the counts shown are stale.
    void mutateGlobal(eventEndpoints.byUid(event.id));
  };

  const leaveEvent = async () => {
    if (leaving) return;
    setLeaving(true);
    const result = await LeaveEvent(event.id);
    setLeaving(false);
    setConfirmingLeave(false);

    if (result.ok) {
      // Revalidates too: a person with an unused invitation reads as invited
      // again.
      void mutateRegistration(
        { joined: false, status: "none", invited: false },
        { revalidate: true },
      );
      void mutateGlobal(eventEndpoints.byUid(event.id));
      showSuccessToast(LEAVE_COPY[join.kind]?.toast ?? "You left this event");
      return;
    }
    showErrorToast(result.message || "Could not leave this event.");
    void mutateRegistration();
  };

  useEffect(() => {
    const panel = joinPanelRef.current;
    if (!panel) return;

    const observer = new IntersectionObserver(([entry]) =>
      setJoinPanelVisible(entry.isIntersecting),
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // Not an IntersectionObserver, on purpose - unlike `joinPanelVisible`
  // above (a symmetric "is it on screen right now" check, which is exactly
  // what that API is for), "has the footer been reached" is a one-way
  // threshold: still true for every scroll position *below* the sentinel,
  // not just the single frame it crosses. An IntersectionObserver only
  // invokes its callback when `isIntersecting` itself flips - verified
  // live: scrolling from deep in the footer back up skipped straight from
  // "sentinel above the viewport" to "sentinel below it" without ever
  // reporting `true` in between, so `isIntersecting` stayed `false` the
  // whole way and no callback fired at all, leaving `nearFooter` stuck
  // `true` and the bar permanently hidden. Reading `getBoundingClientRect()`
  // directly off the native `scroll` event - same idea as `BackToTop.tsx`'s
  // own "scrolled past 250px" check - has no such gap: every scroll (however
  // large the jump) is measured against the sentinel's actual current
  // position, not against a threshold-crossing notification that can be
  // skipped. rAF-throttled rather than `BackToTop.tsx`'s 300ms debounce -
  // this bar showing up over the footer for up to 300ms after a scroll
  // would be exactly the glitch this is fixing.
  useEffect(() => {
    const sentinel = footerSentinelRef.current;
    if (!sentinel) return;

    let queued = false;
    const checkNearFooter = () => {
      queued = false;
      setNearFooter(sentinel.getBoundingClientRect().top <= window.innerHeight);
    };
    const onScrollOrResize = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(checkNearFooter);
    };

    checkNearFooter();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <>
      <ComponentHelmet type="Events" />
      <Navbar />

      {event.draft && (
        <p
          role="status"
          className="m-0 border-b border-brand/20 bg-brand/8 px-9 py-3 text-center font-poppins text-body text-brand-secondary sm:px-10"
        >
          This is a draft. Only you can see this page.{" "}
          <Link
            to="/organization/events"
            className="font-medium text-brand underline underline-offset-4"
          >
            Back to your events
          </Link>
        </p>
      )}

      <div ref={pageRef}>
        <EventHero event={event} detail={detail} />

        {/* `pb-36` (not `py-12`'s plain 3rem) leaves clearance below `lg`
            for EventMobileActionBar, which is `fixed` and would otherwise
            sit on top of the last section's content. Sized for the bar's
            own ~76px plus its own floating gap off the bottom edge (at
            least 1rem, more on a notched iPhone's `safe-area-inset-bottom`)
            with room to spare, not just the bar's own height. `lg:py-16`
            resets both top and bottom together once the bar is
            `lg:hidden`. */}
        <div className="mx-auto max-w-6xl px-9 pt-12 pb-36 sm:px-10 lg:px-12 lg:py-16">
          {/* The join panel is the first thing on a phone and the sidebar on
              a desktop: on a narrow screen it is the answer to "can I go,
              and what does it cost" and belongs above the reading, while at
              lg it should ride alongside it. `order` rather than rendering
              it twice, so there is one control and one piece of state. */}
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <main className="order-2 min-w-0 lg:order-1">
              {/* Every section below is conditional on real content — a
                  freshly-created event may have no about paragraphs, no
                  agenda and nothing to bring, and inventing placeholder
                  copy for them would be the same lie the old fixture used
                  to tell (see toDisplayEventDetail.ts). */}
              {detail.about.length > 0 && (
                <EventSection title="About this event" id="about">
                  <RichText
                    paragraphs={detail.about}
                    className="font-poppins text-body leading-7 text-ink/75 sm:text-body-lg sm:leading-8"
                  />
                </EventSection>
              )}

              <EventSection title="The details" id="details">
                <EventFacts event={event} detail={detail} />
                <EventCalendarLinks event={event} detail={detail} />
              </EventSection>

              {detail.agenda.length > 0 && (
                <EventSection title="How the day runs" id="schedule">
                  <EventAgenda agenda={detail.agenda} />
                </EventSection>
              )}

              <EventSection
                title={
                  event.mode === "Online"
                    ? "How to join"
                    : event.mode === "Hybrid"
                      ? "Where it is and how to join"
                      : "Where it is"
                }
                id="location"
              >
                <EventLocationPanel event={event} detail={detail} />
              </EventSection>

              {detail.bringAlong.length > 0 && (
                <EventSection title="What to bring" id="bring">
                  <ul
                    data-reveal
                    className="m-0 flex list-none flex-col gap-3 p-0"
                  >
                    {detail.bringAlong.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 font-poppins text-body leading-7 text-ink/75"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </EventSection>
              )}
            </main>

            <aside className="order-1 flex flex-col gap-5 lg:sticky lg:top-24 lg:order-2">
              <div ref={joinPanelRef}>
                <EventJoinPanel
                  event={event}
                  detail={detail}
                  join={join}
                  joining={joining}
                  checkingRegistration={checkingRegistration}
                  registrationCheckFailed={registrationCheckFailed}
                  onToggleJoin={joinEvent}
                  onRequestLeave={() => setConfirmingLeave(true)}
                />
              </div>

              <EventOrganizerPanel event={event} />

              {/* Most events raise nothing, and the page simply has no
                  fundraiser section when they don't. */}
              {detail.fundraiser && (
                <EventFundraiserPanel
                  fundraiser={detail.fundraiser}
                  organizer={event.organizer}
                  organizerUserName={event.organizerUserName}
                />
              )}
            </aside>
          </div>
        </div>

        <div ref={footerSentinelRef} aria-hidden="true" className="h-px" />
      </div>

      <EventMobileActionBar
        event={event}
        detail={detail}
        join={join}
        joining={joining}
        checkingRegistration={checkingRegistration}
        registrationCheckFailed={registrationCheckFailed}
        onToggleJoin={joinEvent}
        hidden={joinPanelVisible || nearFooter}
      />

      {confirmingLeave && (
        <ConfirmDialog
          title={(LEAVE_COPY[join.kind] ?? LEAVE_COPY.going).title}
          cancelLabel={(LEAVE_COPY[join.kind] ?? LEAVE_COPY.going).keep}
          confirmLabel={(LEAVE_COPY[join.kind] ?? LEAVE_COPY.going).confirm}
          busyLabel="Leaving…"
          busy={leaving}
          destructive
          onConfirm={leaveEvent}
          onClose={() => !leaving && setConfirmingLeave(false)}
        >
          <p className="mt-3 mb-0 font-poppins text-body leading-6 text-ink/70">
            <span className="font-medium text-brand-secondary">
              {event.title}
            </span>{" "}
            {(LEAVE_COPY[join.kind] ?? LEAVE_COPY.going).body}
          </p>
        </ConfirmDialog>
      )}

      <Footer />
    </>
  );
};

export default DetailedEvent;
