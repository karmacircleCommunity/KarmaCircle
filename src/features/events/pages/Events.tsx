import { Button, Footer, Loading, Navbar } from "@components";
import EventCard from "@features/events/components/EventCard";
import EventSlider from "@features/events/components/EventSlider";
import CreateEvent from "@features/events/components/CreateEvent";
import ComponentHelmet from "@components/seo/ComponentHelmet";
import { useState } from "react";
import { CiFilter } from "react-icons/ci";
import { FaPlus } from "react-icons/fa6";
import type { Club } from "@features/clubs/types";
import { UserType } from "@/types/user";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./Events.scss";

const Events = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Hardcoded and, per SPEC.md, shaped like a club/user record rather
  // than an event — typed as `Club` (not a real `EventRecord`) to make
  // that mismatch explicit rather than inventing event-shaped fixture
  // data that doesn't match what's actually here.
  const events: Club[] = Array.from({ length: 20 }, () => ({
    _id: "673ac2814c6e89e58af8ca11",
    userType: UserType.Club,
    userName: "tamalcodes",
    name: "God Father Org",
    email: "tamalcodes@gmail.com",
    password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
    cart: [],
    __v: 0,
  }));

  return (
    <>
      <ComponentHelmet type="Clubs" />
      <Navbar />

      <div className="events_header">
        <div className="events_search_parent">
          <input
            type="text"
            name=""
            id=""
            placeholder="Type to begin search, or use the filters"
          />
          <button>
            Filters <CiFilter />
          </button>
        </div>

        <Button
          className="createevent"
          onClickfunction={() => {
            setShowCreateModal(true);
          }}
        >
          <FaPlus /> Create An Event
        </Button>
      </div>

      <EventSlider />

      <hr className="events_separator" />

      <div className="events_parent">
        {!events || events?.length === 0 ? (
          <Loading />
        ) : (
          events?.map((event, id) => (
            // @ts-expect-error — EventCard declares no parameters at all and
            // ignores this prop entirely; see EventCard.tsx and SPEC.md.
            // Preserved as-is rather than adding a prop EventCard doesn't
            // actually read.
            <EventCard event={event} key={id} />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateEvent setShowCreateModal={setShowCreateModal} />
      )}

      <Footer />
    </>
  );
};

export default Events;
