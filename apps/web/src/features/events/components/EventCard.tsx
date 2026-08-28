import { FiLink } from "react-icons/fi";
import { IoMdArrowUp } from "react-icons/io";
import { RiTwitterXLine } from "react-icons/ri";
import participantAvatar from "@assets/avatars/gh-72851613.jpg";

/**
 * Declares no parameters at all — `Events.tsx`'s `event={event}` prop
 * is not destructured, let alone used. Every visible field is
 * hardcoded, byte-for-byte identical across every rendered card. Kept
 * exactly as-is (see SPEC.md); the call site suppresses the resulting
 * excess-prop type error rather than this component being given a fake
 * `event` prop it doesn't actually read.
 */
const EventCard = () => {
  return (
    <div
      data-reveal
      className="relative inline-flex flex-col justify-between gap-3 rounded-10px bg-white p-5 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out hover:cursor-default hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] motion-safe:hover:-translate-y-1">
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
              src={participantAvatar}
              alt=""
              className="size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
            <img
              src={participantAvatar}
              alt=""
              className="-ml-3.25 size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
            <img
              src={participantAvatar}
              alt=""
              className="-ml-3.25 size-8.5 max-h-8.5 max-w-8.5 overflow-hidden rounded-full border-2 border-white bg-none outline-none"
            />
          </div>
          <p className="m-0 font-outfit text-body font-medium">
            +300 Participated
          </p>
        </div>

        <button className="flex size-12.5 cursor-pointer items-center justify-center rounded-lg border-none bg-brand p-2.5 font-outfit transition-all duration-300 ease-out hover:bg-brand-hover motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-95">
          <IoMdArrowUp className="size-[80%] rotate-45 text-white/95" />
        </button>
      </div>
    </div>
  );
};

export default EventCard;
