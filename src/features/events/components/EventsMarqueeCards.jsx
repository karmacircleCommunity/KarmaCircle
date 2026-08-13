import { CiCalendar, CiLocationOn } from "react-icons/ci";
import getFormattedDate from "@features/events/utils/getFormattedDate.js";
import "./EventsMarqueeCards.scss";

const EventsMarqueeCards = ({ event }) => {
  const eventStartTime = new Date(event?.startTime);
  const formattedStartTime = eventStartTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formattedStartDate = getFormattedDate(event?.startDate);

  return (
    <>
      <div className="eventmarque_parent">
        <img src={event?.coverImage} alt="" />

        <div className="eventmarque_details">
          <h1 className="eventmarque_name">{event?.name}</h1>
          <div className="eventmarque_datetime">
            {event?.mode === "Offline" ? (
              <span>
                <CiLocationOn /> {event?.address}
              </span>
            ) : (
              <span>
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
                  style={{
                    position: "relative",
                    top: "1px",
                  }}
                />
                {event.platform}
              </span>
            )}

            <span>
              <CiCalendar />{" "}
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
