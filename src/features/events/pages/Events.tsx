import { Button, Footer, Loading, Navbar } from "@components";
import EventCard from "@features/events/components/EventCard";
import EventSlider from "@features/events/components/EventSlider";
import CreateEvent from "@features/events/components/CreateEvent";
import ComponentHelmet from "@components/ComponentHelmet";
import { useState } from "react";
import { CiFilter } from "react-icons/ci";
import { FaPlus } from "react-icons/fa6";
import type { Club } from "@features/clubs/types";
import { UserType } from "@/types/user";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";

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

      <div className="mx-12 flex items-center gap-[1.2rem] px-28 py-8 font-outfit">
        <div className="flex h-[62px] w-full grow items-center gap-4 rounded-lg bg-white p-[10px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
          <input
            type="text"
            name=""
            id=""
            placeholder="Type to begin search, or use the filters"
            className="grow rounded-[5px] border border-black/25 bg-surface-muted px-4 py-2 font-outfit text-[15px] outline-none"
          />
          <button className="flex w-[15%] items-center justify-center gap-[10px] rounded-[5px] border border-black/25 bg-surface-muted px-4 py-2 text-center font-outfit text-[15px] outline-none">
            Filters <CiFilter className="min-h-[20px] min-w-[20px]" />
          </button>
        </div>

        <Button
          className="flex h-[55px] w-1/5 items-center justify-center gap-[10px] rounded-lg border-2 border-brand/50 bg-[#fba18b55] text-center font-outfit text-[15px] font-semibold whitespace-nowrap text-brand/95 outline-none"
          onClickfunction={() => {
            setShowCreateModal(true);
          }}
        >
          <FaPlus /> Create An Event
        </Button>
      </div>

      <EventSlider />

      <hr className="my-4 mx-44 h-px justify-center border-none bg-black/25" />

      <div className="mx-12 grid min-h-screen grid-cols-2 grid-rows-2 gap-8 px-28 py-8 max-[1200px]:grid-cols-2 max-[1200px]:grid-rows-3 max-[1200px]:px-12 max-[1200px]:py-8 max-[800px]:mx-0 max-[800px]:grid-cols-1 max-[800px]:grid-rows-4 max-[800px]:px-8 max-[800px]:py-12">
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
