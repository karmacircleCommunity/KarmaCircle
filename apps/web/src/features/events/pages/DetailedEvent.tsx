import { useRef, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useParams } from "react-router-dom";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";
import ComponentHelmet from "@components/ComponentHelmet";
import { useSectionReveal } from "@hooks";
import EventAgenda from "../components/detail/EventAgenda";
import EventFacts from "../components/detail/EventFacts";
import EventFundraiserPanel from "../components/detail/EventFundraiserPanel";
import EventHero from "../components/detail/EventHero";
import EventJoinPanel from "../components/detail/EventJoinPanel";
import EventLocationPanel from "../components/detail/EventLocationPanel";
import EventSection from "../components/detail/EventSection";
import { findEvent } from "../constants/eventDirectory";
import { findEventDetail } from "../constants/eventDetails";
import type { DetailedEventRecord } from "../types";

/**
 * The event detail page, routed at `/events/:eventId` - the page an
 * `EventCard` in the directory grid opens.
 *
 * It replaced a one-line stub (`<div>DetailedEvent</div>`) that was never
 * registered in `routesConfig.tsx`, which is why the cards in the grid had
 * nowhere to link and did nothing when clicked.
 *
 * **The content is sample data**, exactly like the directory it is reached
 * from: `constants/eventDirectory.ts` for the card-level record and
 * `constants/eventDetails.ts` for everything this page adds. There is no
 * single-event endpoint, and no attend/RSVP or payment endpoint either -
 * so the join control is honest about being local to the device and the
 * contribute button says contributions open later, rather than either of
 * them looking live and silently doing nothing.
 *
 * Everything is laid out in the shape a real record would arrive in:
 * swapping the two lookups for a `useSWR` call should not move any markup.
 */
const DetailedEvent = () => {
  const { eventId } = useParams();
  const event = findEvent(eventId);
  const detail = findEventDetail(eventId);

  if (!event || !detail) return <EventNotFound eventId={eventId} />;

  return <DetailedEventView event={event} detail={detail} />;
};

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
  // Local-only: there is no attend endpoint yet, and the panel says so
  // rather than implying the organizer has been told. See EventJoinPanel.
  const [joined, setJoined] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useSectionReveal(pageRef);

  return (
    <>
      <ComponentHelmet type="Events" />
      <Navbar />

      <div ref={pageRef}>
        <EventHero event={event} detail={detail} />

        <div className="mx-auto max-w-6xl px-9 py-12 sm:px-10 lg:px-12 lg:py-16">
          {/* The join panel is the first thing on a phone and the sidebar on
              a desktop: on a narrow screen it is the answer to "can I go,
              and what does it cost" and belongs above the reading, while at
              lg it should ride alongside it. `order` rather than rendering
              it twice, so there is one control and one piece of state. */}
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            <main className="order-2 min-w-0 lg:order-1">
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

              <EventSection title="The details" id="details">
                <EventFacts event={event} detail={detail} />
              </EventSection>

              <EventSection title="How the day runs" id="schedule">
                <EventAgenda agenda={detail.agenda} />
              </EventSection>

              <EventSection
                title={event.mode === "Online" ? "How to join" : "Where it is"}
                id="location"
              >
                <EventLocationPanel event={event} detail={detail} />
              </EventSection>

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
            </main>

            <aside className="order-1 flex flex-col gap-5 lg:sticky lg:top-24 lg:order-2">
              <EventJoinPanel
                event={event}
                detail={detail}
                joined={joined}
                onToggleJoin={() => setJoined((previous) => !previous)}
              />

              {/* Most events raise nothing, and the page simply has no
                  fundraiser section when they don't. */}
              {detail.fundraiser && (
                <EventFundraiserPanel fundraiser={detail.fundraiser} />
              )}
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default DetailedEvent;
