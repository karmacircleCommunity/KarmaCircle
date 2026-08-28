import { Button, Footer, Loading, Navbar } from "@components";
import EventCard from "@features/events/components/EventCard";
import EventSlider from "@features/events/components/EventSlider";
import CreateEvent from "@features/events/components/CreateEvent";
import ComponentHelmet from "@components/ComponentHelmet";
import { useRef, useState } from "react";
import { CiFilter } from "react-icons/ci";
import { FaPlus } from "react-icons/fa6";
import type { Organization } from "@features/organizations/types";
import { useSectionReveal } from "@hooks";
import { UserType } from "@/types/user";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";

const Events = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Scoped to the grid, so the always-visible slider above keeps its own
  // behaviour and only the scrolled-to cards animate in.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef);

  // Hardcoded and, per SPEC.md, shaped like an organization/user record
  // rather than an event — typed as `Organization` (not a real
  // `EventRecord`) to make that mismatch explicit rather than inventing
  // event-shaped fixture data that doesn't match what's actually here.
  const events: Organization[] = Array.from({ length: 20 }, () => ({
    _id: "673ac2814c6e89e58af8ca11",
    userType: UserType.Organization,
    userName: "tamalcodes",
    name: "God Father Org",
    email: "tamalcodes@gmail.com",
    password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
    cart: [],
    __v: 0,
  }));

  return (
    <>
      <ComponentHelmet type="Events" />
      <Navbar />

      <div className="mx-12 flex items-center gap-[1.2rem] px-28 py-8 font-outfit">
        <div className="flex h-15.5 w-full grow items-center gap-4 rounded-lg bg-white p-2.5 shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
          <input
            type="text"
            name=""
            id=""
            placeholder="Type to begin search, or use the filters"
            className="grow rounded-5px border border-black/25 bg-surface-muted px-4 py-2 font-outfit text-body transition-colors duration-200 outline-none placeholder:text-ink/45 focus:border-brand"
          />
          <button className="flex w-[15%] cursor-pointer items-center justify-center gap-2.5 rounded-5px border border-black/25 bg-surface-muted px-4 py-2 text-center font-outfit text-body transition-colors duration-200 outline-none hover:border-brand hover:text-brand motion-safe:active:scale-97">
            Filters <CiFilter className="min-h-5 min-w-5" />
          </button>
        </div>

        <Button
          className="flex h-13.75 w-1/5 items-center justify-center gap-2.5 rounded-lg border-2 border-brand/50 bg-[#fba18b55] text-center font-outfit text-body font-semibold whitespace-nowrap text-brand/95 outline-none"
          onClickfunction={() => {
            setShowCreateModal(true);
          }}
        >
          <FaPlus /> Create An Event
        </Button>
      </div>

      <EventSlider />

      <hr className="mx-44 my-4 h-px justify-center border-none bg-black/25" />

      <div
        ref={gridRef}
        className="mx-12 grid min-h-screen grid-cols-2 grid-rows-2 gap-8 px-28 py-8 max-[1200px]:grid-cols-2 max-[1200px]:grid-rows-3 max-[1200px]:px-12 max-[1200px]:py-8 max-[800px]:mx-0 max-[800px]:grid-cols-1 max-[800px]:grid-rows-4 max-[800px]:px-8 max-[800px]:py-12">
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
