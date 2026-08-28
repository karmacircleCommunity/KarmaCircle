import ComingSoonLogo from "@assets/pictures/comingsoon.svg";
import Button from "@components/buttons/Button";

interface ComingSoonProps {
  launchitem?: string;
}

const ComingSoon = ({ launchitem }: ComingSoonProps) => {
  return (
    <div className="flex h-screen flex-col items-center justify-center font-outfit motion-safe:animate-rise-in">
      <img src={ComingSoonLogo} alt="" className="w-75" />
      <h1 className="mt-8 text-center text-6xl leading-20 font-black text-heading">
        Launching Soon !
      </h1>
      <p className="mt-0 mb-12.5 text-center text-lg tracking-[1px] text-black">
        We will let you know as soon as we launch our{" "}
        {launchitem ? launchitem : "page"}
      </p>
      <Button to="/auth/signup">Sign up to get notified</Button>{" "}
    </div>
  );
};

export default ComingSoon;
