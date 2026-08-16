import { FiLink } from "react-icons/fi";
import { RiTwitterXLine } from "react-icons/ri";

/**
 * Fully static — no props, hardcoded content, same "Register Now"
 * button with no onClick. See SPEC.md.
 */
const FeaturedEventCard = () => {
  return (
    <div className="relative inline-flex flex-col justify-between gap-3 rounded-10px border border-black/[0.133] bg-white p-5 transition-all duration-300 ease-in-out">
      <div className="flex justify-between gap-2.5 max-500px:flex-row max-500px:gap-3.75">
        <div>
          <h1 className="m-0 font-outfit text-xl leading-none font-semibold">
            Food Marathon, 2025
          </h1>
          <span className="font-outfit text-sm font-normal text-black/70">
            GodLike Club
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <RiTwitterXLine className="size-10 cursor-pointer rounded-10px bg-surface-muted p-2.5" />
          <FiLink className="size-10 cursor-pointer rounded-10px bg-surface-muted p-2.5" />
        </div>
      </div>

      <p className="mt-4 line-clamp-3 font-outfit text-body">
        The Food Marathon 2025 is a dynamic NGO event uniting communities to
        fight hunger and promote food security. Participants will engage in
        exciting activities while contributing to sustainable food distribution
        efforts. Together, we can bridge the gap between surplus and need,
        creating a hunger-free future.
      </p>

      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex items-center gap-1.75">
          <div className="flex">
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="-ml-3.25 size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="-ml-3.25 size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
          </div>
          <p className="m-0 font-outfit text-body font-medium">
            +300 Participated
          </p>
        </div>

        <button className="rounded-lg border-none bg-brand px-5 py-2.5 font-outfit text-body text-white">
          Register Now
        </button>
      </div>
    </div>
  );
};

export default FeaturedEventCard;
