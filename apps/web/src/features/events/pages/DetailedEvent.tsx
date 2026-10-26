import { useEffect, useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";
import ComponentHelmet from "@components/ComponentHelmet";
import { useSectionReveal } from "@hooks";
import { eventEndpoints } from "@services/ApiEndpoints";
import { selectUser } from "@app/store/slices/userSlice";
import fetcher from "@utils/Fetcher";
import { JoinEvent } from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast, showWarningToast } from "@utils/Toasts";
import EventAgenda from "../components/detail/EventAgenda";
import EventFacts from "../components/detail/EventFacts";
import EventFundraiserPanel from "../components/detail/EventFundraiserPanel";
import EventHero from "../components/detail/EventHero";
import EventJoinPanel from "../components/detail/EventJoinPanel";
import EventLocationPanel from "../components/detail/EventLocationPanel";
import EventMobileActionBar from "../components/detail/EventMobileActionBar";
import EventOrganizerPanel from "../components/detail/EventOrganizerPanel";
import EventSection from "../components/detail/EventSection";
import { toDisplayEventDetail } from "../utils/toDisplayEventDetail";
import type { ApiEvent, DetailedEventRecord } from "../types";

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
  const registrationKey =
    user.isLoggedIn && user.email
      ? [eventEndpoints.registration(event.id), user.email] as const
      : null;
  const {
    data: registration,
    error: registrationError,
    isLoading: registrationLoading,
    mutate: mutateRegistration,
  } = useSWR<{ joined: boolean }>(registrationKey, ([url]) => fetcher(url));
  const joined = registration?.joined ?? false;
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
    if (joining || joined) return;
    if (registrationCheckFailed) {
      void mutateRegistration();
      return;
    }
    setJoining(true);
    const response = await JoinEvent(event.id);
    setJoining(false);

    if (response.ok) {
      void mutateRegistration({ joined: true }, false);
      if (response.data?.emailSent) {
        showSuccessToast("You joined this event. Confirmation email sent.");
      } else {
        showWarningToast("You joined this event, but confirmation email could not be sent.");
      }
      return;
    }
    showErrorToast(response.message || "Could not join this event.");
  };

  useEffect(() => {
    const panel = joinPanelRef.current;
    if (!panel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setJoinPanelVisible(entry.isIntersecting),
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
                  {detail.about.map((paragraph, index) => (
                    <p
                      key={index}
                      data-reveal
                      className="mt-4 font-poppins text-body leading-7 text-ink/75 first:mt-0 sm:text-body-lg sm:leading-8"
                    >
                      {paragraph}
                    </p>
                  ))}
                </EventSection>
              )}

              <EventSection title="The details" id="details">
                <EventFacts event={event} detail={detail} />
              </EventSection>

              {detail.agenda.length > 0 && (
                <EventSection title="How the day runs" id="schedule">
                  <EventAgenda agenda={detail.agenda} />
                </EventSection>
              )}

              <EventSection
                title={event.mode === "Online" ? "How to join" : "Where it is"}
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
                  joined={joined}
                  joining={joining}
                  checkingRegistration={checkingRegistration}
                  registrationCheckFailed={registrationCheckFailed}
                  onToggleJoin={joinEvent}
                />
              </div>

              <EventOrganizerPanel event={event} />

              {/* Most events raise nothing, and the page simply has no
                  fundraiser section when they don't. */}
              {detail.fundraiser && (
                <EventFundraiserPanel fundraiser={detail.fundraiser} />
              )}
            </aside>
          </div>
        </div>

        <div ref={footerSentinelRef} aria-hidden="true" className="h-px" />
      </div>

      <EventMobileActionBar
        event={event}
        detail={detail}
        joined={joined}
        joining={joining}
        checkingRegistration={checkingRegistration}
        registrationCheckFailed={registrationCheckFailed}
        onToggleJoin={joinEvent}
        hidden={joinPanelVisible || nearFooter}
      />

      <Footer />
    </>
  );
};

export default DetailedEvent;
