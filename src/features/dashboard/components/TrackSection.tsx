import { TbExternalLink } from "react-icons/tb";
import { Link } from "react-router-dom";

/**
 * Purely presentational analytics widget — no props, no data fetching.
 * Intentional visual placeholder (see `SPEC.md`), not wired to
 * `fetchDashboard()` despite that function existing.
 */
const TrackSection = () => {
  return (
    <div className="flex h-50 flex-col gap-[1.2rem] rounded-xl p-4 shadow-[0px_0px_10px_1px_rgba(0,0,0,0.1)] blur-[3px]">
      <div className="flex items-center justify-between">
        <p className="m-0 font-outfit text-lg leading-none font-medium">
          Analytics
        </p>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <p className="cursor-pointer rounded-5px border border-brand bg-[#4a11030e] px-2">
            7D
          </p>
          <p className="cursor-pointer rounded-5px border border-brand px-2">
            14D
          </p>
          <p className="cursor-pointer rounded-5px border border-brand px-2">
            28D
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex w-1/2 flex-col gap-2.5 rounded border border-border-muted p-1.5 font-outfit">
          <p className="m-0 flex items-center justify-between text-sm leading-none">
            Impressions
          </p>

          <div className="flex items-end justify-between gap-4">
            <p className="m-0 text-2xl leading-none font-semibold">6,025</p>
          </div>
        </div>

        <div className="flex w-1/2 flex-col gap-2.5 rounded border border-border-muted p-1.5 font-outfit">
          <p className="m-0 flex items-center justify-between text-sm leading-none">
            Click Rate
          </p>

          <div className="flex items-end justify-between gap-4">
            <p className="m-0 text-2xl leading-none font-semibold">43% </p>
          </div>
        </div>
      </div>

      <Link
        to={"/"}
        className="flex items-center gap-1.25 pt-2.5 font-outfit text-sm font-normal text-black no-underline"
      >
        See detailed analytics <TbExternalLink />
      </Link>
    </div>
  );
};

export default TrackSection;
