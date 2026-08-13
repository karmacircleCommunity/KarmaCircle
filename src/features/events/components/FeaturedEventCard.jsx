import { FiLink } from "react-icons/fi";
import { RiTwitterXLine } from "react-icons/ri";
import "./FeaturedEventCard.scss";

const FeaturedEventCard = () => {
  return (
    <div className="featured_eventcard_parent">
      <div className="featured_eventcard_top">
        <div className="featured_eventcard_name">
          <h1>Food Marathon, 2025</h1>
          <span>GodLike Club</span>
        </div>

        <div className="featured_eventcard_links">
          <RiTwitterXLine />
          <FiLink />
        </div>
      </div>

      <p>
        The Food Marathon 2025 is a dynamic NGO event uniting communities to
        fight hunger and promote food security. Participants will engage in
        exciting activities while contributing to sustainable food distribution
        efforts. Together, we can bridge the gap between surplus and need,
        creating a hunger-free future.
      </p>

      <div className="featured_eventcard_ctadiv">
        <div className="cta_membersdiv">
          <div className="cta_members">
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
            />
            <img
              src="https://avatars.githubusercontent.com/u/72851613?v=4"
              alt=""
            />
          </div>
          <p>+300 Participated</p>
        </div>

        <button className="featured_eventcard_cta">Register Now</button>
      </div>
    </div>
  );
};

export default FeaturedEventCard;
