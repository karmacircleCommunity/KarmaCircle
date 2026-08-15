import { FiLink } from "react-icons/fi";
import { IoMdArrowUp } from "react-icons/io";
import { RiTwitterXLine } from "react-icons/ri";

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
    <div className="relative inline-flex flex-col justify-between gap-3 rounded-[10px] bg-white p-5 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out hover:cursor-default hover:shadow-[0px_0px_20px_7px_rgba(226,105,89,0.32)] hover:transition-all hover:duration-300 hover:ease-in-out">
      <div className="flex justify-between gap-[10px] max-[500px]:flex-row max-[500px]:gap-[15px]">
        <div>
          <h1 className="m-0 font-outfit text-xl leading-none font-semibold">
            Food Marathon, 2025
          </h1>
          <span className="font-outfit text-sm font-normal text-[#000000b4]">
            GodLike Club
          </span>
        </div>

        <div className="flex items-center gap-[10px]">
          <RiTwitterXLine className="h-10 w-10 cursor-pointer rounded-[10px] bg-[#f5f7f7] p-[10px]" />
          <FiLink className="h-10 w-10 cursor-pointer rounded-[10px] bg-[#f5f7f7] p-[10px]" />
        </div>
      </div>

      <p className="line-clamp-3 mt-4 font-outfit text-[15px]">
        The Food Marathon 2025 is a dynamic NGO event uniting communities to
        fight hunger and promote food security. Participants will engage in
        exciting activities while contributing to sustainable food distribution
        efforts. Together, we can bridge the gap between surplus and need,
        creating a hunger-free future.
      </p>

      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex items-center gap-[7px]">
          <div className="flex">
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="h-[34px] w-[34px] max-w-[34px] overflow-hidden rounded-full border-2 border-white bg-none outline-none max-h-[34px]"
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="-ml-[13px] h-[34px] w-[34px] max-w-[34px] overflow-hidden rounded-full border-2 border-white bg-none outline-none max-h-[34px]"
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
              className="-ml-[13px] h-[34px] w-[34px] max-w-[34px] overflow-hidden rounded-full border-2 border-white bg-none outline-none max-h-[34px]"
            />
          </div>
          <p className="m-0 font-outfit text-[15px] font-medium">
            +300 Participated
          </p>
        </div>

        <button className="flex h-[50px] w-[50px] items-center justify-center rounded-lg border-none bg-[#ff5a31] p-[10px] font-outfit">
          <IoMdArrowUp className="h-[80%] w-[80%] rotate-45 text-white/95" />
        </button>
      </div>
    </div>
  );
};

export default EventCard;
