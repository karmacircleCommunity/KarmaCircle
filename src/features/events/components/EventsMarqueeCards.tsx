import { CiCalendar, CiLocationOn } from "react-icons/ci";
import getFormattedDate from "@features/events/utils/getFormattedDate";
import type { EventRecord } from "../types";

interface EventsMarqueeCardsProps {
  event?: EventRecord;
}

/**
 * Not rendered anywhere today — see SPEC.md. The one component in this
 * feature that actually reads and correctly uses an `event` prop.
 */
const EventsMarqueeCards = ({ event }: EventsMarqueeCardsProps) => {
  const eventStartTime = new Date(event?.startTime ?? "");
  const formattedStartTime = eventStartTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formattedStartDate = getFormattedDate(event?.startDate);

  return (
    <>
      <div className="flex w-[380px] flex-row cursor-pointer! gap-4 rounded-2xl border border-border-subtle bg-white p-[14px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out max-[500px]:w-[90vw] hover:cursor-default hover:border-brand/55 hover:shadow-[0px_0px_20px_7px_rgba(226,105,89,0.32)] hover:transition-all hover:duration-300 hover:ease-in-out">
        <img
          src={event?.coverImage}
          alt=""
          className="h-20 w-20 self-stretch rounded-lg object-cover"
        />

        <div>
          <h1 className="self-start font-poppins text-[17px] leading-normal font-semibold tracking-[0.4px] text-brand-secondary">
            {event?.name}
          </h1>
          <div className="flex flex-col font-outfit text-[15px]">
            {event?.mode === "Offline" ? (
              <span className="flex items-center gap-2">
                <CiLocationOn className="h-5 w-5" /> {event?.address}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <img
                  src={
                    event?.platform === "Zoom Meeting"
                      ? "https://image.similarpng.com/very-thumbnail/2021/10/Zoom-icon-design-on-transparent-background-PNG.png"
                      : event?.platform === "Google Meet"
                        ? "https://img.icons8.com/color/48/000000/google-meet.png"
                        : event?.platform === "Microsoft Teams"
                          ? "https://img.icons8.com/color/48/000000/microsoft-teams.png"
                          : "https://img.icons8.com/color/48/000000/other.png"
                  }
                  alt=""
                  className="h-5 w-5"
                  style={{
                    position: "relative",
                    top: "1px",
                  }}
                />
                {event?.platform}
              </span>
            )}

            <span className="flex items-center gap-2">
              <CiCalendar className="h-5 w-5" />{" "}
              {window?.innerWidth > 500
                ? formattedStartDate + " from " + formattedStartTime
                : formattedStartDate.split(" ")[0] +
                  " " +
                  formattedStartDate.split(" ")[1].substring(0, 3) +
                  "," +
                  " " +
                  formattedStartTime}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventsMarqueeCards;
