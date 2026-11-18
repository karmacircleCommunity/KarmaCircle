import { FiCalendar } from "react-icons/fi";
import {
  googleCalendarUrl,
  icsUrl,
  outlookCalendarUrl,
  toCalendarEntry,
} from "@features/events/utils/calendarLinks";
import type { DisplayEvent } from "@features/events/types";

const linkClasses =
  "inline-flex items-center justify-center rounded-full border border-brand-secondary/15 px-4 py-2 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * Three ways to put an upcoming event in a calendar (PG-19): Google Calendar
 * and Outlook on the web open their "new event" page with everything filled
 * in, and the `.ics` link downloads a calendar file from the API that Apple
 * Calendar, desktop Outlook and nearly everything else open directly.
 *
 * Plain links, no menu and no script: nothing to open, nothing to dismiss,
 * and they work with the keyboard and a screen reader as they are. The Google
 * and Outlook links leave the site, so they open in a new tab and say so.
 *
 * Shown for an upcoming event that is not a draft, whether or not the person
 * has joined, because putting something in a calendar is how people decide to
 * come. Renders nothing if the event's start time cannot be read.
 */
const AddToCalendar = ({ event }: { event: DisplayEvent }) => {
  const entry = toCalendarEntry(
    event,
    `${window.location.origin}/events/${encodeURIComponent(event.id)}`,
  );
  if (!entry) return null;

  return (
    <div
      role="group"
      aria-labelledby="add-to-calendar-label"
      className="mt-5 border-t border-border-subtle pt-5"
    >
      <p
        id="add-to-calendar-label"
        className="m-0 flex items-center gap-1.5 font-poppins text-caption tracking-wide text-ink/50 uppercase"
      >
        <FiCalendar aria-hidden="true" className="size-3.5" />
        Add to calendar
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={googleCalendarUrl(entry)}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          Google
          <span className="sr-only"> Calendar, opens in a new tab</span>
        </a>
        <a
          href={outlookCalendarUrl(entry)}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          Outlook
          <span className="sr-only">, opens in a new tab</span>
        </a>
        <a href={icsUrl(event.id)} download className={linkClasses}>
          Apple or other
          <span className="sr-only"> calendar, downloads a file</span>
        </a>
      </div>
    </div>
  );
};

export default AddToCalendar;
