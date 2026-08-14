import ComingSoonLogo from "@assets/pictures/comingsoon.svg";
import Button from "@components/buttons/globalbutton/Button";
import "./ComingSoon.scss";

interface ComingSoonProps {
  launchitem?: string;
}

const ComingSoon = ({ launchitem }: ComingSoonProps) => {
  return (
    <div className="comingsoon_parent">
      <img src={ComingSoonLogo} alt="" />
      <h1>Launching Soon !</h1>
      <p>
        We will let you know as soon as we launch our{" "}
        {launchitem ? launchitem : "page"}
      </p>
      <Button to="/auth/signup">Sign up to get notified</Button>{" "}
    </div>
  );
};

export default ComingSoon;
