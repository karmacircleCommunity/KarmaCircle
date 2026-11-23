import { FiCalendar, FiDownload } from "react-icons/fi";
import {
  buildIcs,
  googleCalendarUrl,
  hasCalendarTimes,
  icsFileName,
} from "@features/events/utils/calendarLinks";
import type { EventCalendarLinksProps } from "@features/events/types";

const pill =
  "inline-flex items-center gap-2 rounded-full border border-brand-secondary/15 bg-transparent px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand";

/**
 * "Add to calendar" (PG-19): a Google Calendar link and an `.ics` download.
 * Shown only for an event that has not ended and is neither cancelled nor a
 * draft, since a calendar entry for any of those would only mislead.
 */
const EventCalendarLinks = ({ event }: EventCalendarLinksProps) => {
  if (
    event.cancelled ||
    event.draft ||
    !hasCalendarTimes(event) ||
    new Date(event.endsAt).getTime() < Date.now()
  ) {
    return null;
  }

  const pageUrl = `${window.location.origin}/events/${event.id}`;

  const downloadIcs = () => {
    const file = new Blob([buildIcs(event, pageUrl)], {
      type: "text/calendar;charset=utf-8",
    });
    const href = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = href;
    link.download = icsFileName(event);
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <a
        href={googleCalendarUrl(event, pageUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
      >
        <FiCalendar aria-hidden="true" />
        Add to Google Calendar
      </a>
      <button
        type="button"
        onClick={downloadIcs}
        className={`${pill} cursor-pointer`}
      >
        <FiDownload aria-hidden="true" />
        Download for other calendars
      </button>
    </div>
  );
};

export default EventCalendarLinks;
