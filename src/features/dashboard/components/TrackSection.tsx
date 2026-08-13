import { TbExternalLink } from "react-icons/tb";
import { Link } from "react-router-dom";
import "./TrackSection.scss";

/**
 * Purely presentational analytics widget — no props, no data fetching.
 * Intentional visual placeholder (see `SPEC.md`), not wired to
 * `fetchDashboard()` despite that function existing.
 */
const TrackSection = () => {
  return (
    <div className="trackSection_parent">
      <div className="trackSection_header">
        <p className="trackSection_title">Analytics</p>

        <div className="tracker_calendar">
          <p className="active_calendar">7D</p>
          <p>14D</p>
          <p>28D</p>
        </div>
      </div>

      <div className="tracker_container">
        <div className="tracker_box">
          <p className="tracker_header">Impressions</p>

          <div className="tracker_footer">
            <p className="tracker_number">6,025</p>
          </div>
        </div>

        <div className="tracker_box">
          <p className="tracker_header">Click Rate</p>

          <div className="tracker_footer">
            <p className="tracker_number">43% </p>
            {/* <GrFormNext className="tracker_icon" /> */}
          </div>
        </div>
      </div>

      <Link to={"/"} className="">
        See detailed analytics <TbExternalLink />
      </Link>
    </div>
  );
};

export default TrackSection;
