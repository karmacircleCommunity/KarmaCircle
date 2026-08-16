import { selectIsLoggedIn } from "@app/store/slices/userSlice";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Vector from "@assets/pictures/Banner/Vector.png";
import { Button, Navbar } from "@components";

/** The marketing hero rendered by `Home.tsx`. See SPEC.md. */
const Landing = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="container flex min-h-[95dvh] flex-col items-center justify-center max-500px:min-h-[100dvh] max-500px:px-4 max-500px:pt-0">
        <img
          src={Vector}
          alt=""
          className="absolute top-0 left-0 h-screen max-h-screen w-full max-w-[100vw] object-cover"
        />

        <div className="z-1 flex flex-col items-center justify-center">
          {windowWidth > 430 ? (
            <>
              <h1 className="z-3 m-0 text-center font-outfit text-7xl leading-none font-black text-brand-secondary max-500px:text-start max-500px:text-[2.7rem]">
                We connect NGOs,
              </h1>
              <h1 className="z-3 m-0 text-center font-outfit text-7xl leading-none font-black text-brand-secondary max-500px:text-start max-500px:text-[2.7rem]">
                Charities and <span className="text-brand">you.</span>
              </h1>
            </>
          ) : (
            <h1 className="z-3 m-0 text-center font-outfit text-7xl leading-none font-black text-brand-secondary max-500px:text-start max-500px:text-[2.7rem]">
              We connect NGOs, charities and{" "}
              <span className="text-brand">you.</span>
            </h1>
          )}

          {windowWidth > 430 ? (
            <p className="leading-6.045 z-3 mx-auto mt-12 w-[55%] text-center font-poppins text-lg tracking-[1.2px] text-brand-secondary max-500px:w-full max-500px:text-start max-500px:text-body-lg">
              Welcome to <span className="font-semibold">NgoWorld</span>, a
              platform to connect and support NGOs, charities and you to build a
              better tomorrow.
            </p>
          ) : (
            <p className="leading-6.045 z-3 mx-auto mt-12 w-[55%] text-center font-poppins text-lg tracking-[1.2px] text-brand-secondary max-500px:w-full max-500px:text-start max-500px:text-body-lg">
              A platform for NGOs, charities, clubs and you to collaborate, grow
              and build a better tomorrow.
            </p>
          )}

          <div className="mt-16 flex items-center justify-center gap-[0.8rem] max-500px:w-full max-500px:flex-col-reverse max-500px:items-start max-500px:justify-start">
            {isLoggedIn ? (
              <Button
                to="/clubs"
                className="z-3 mx-auto flex w-auto items-center justify-around gap-2.5 rounded-lg border-none px-6 py-[0.7rem] font-poppins text-body-lg font-medium hover:bg-brand hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)] hover:transition-all hover:duration-300 hover:ease-in-out max-500px:mx-0 max-500px:w-auto"
              >
                <span className="text-lg">Explore our clubs</span>
              </Button>
            ) : (
              <Button
                to="/auth/signup"
                className="z-3 mx-auto flex w-auto items-center justify-around gap-2.5 rounded-lg border-none px-6 py-[0.7rem] font-poppins text-body-lg font-medium hover:bg-brand hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)] hover:transition-all hover:duration-300 hover:ease-in-out max-500px:mx-0 max-500px:w-auto"
              >
                <span className="text-lg">Sign up Today !</span>
              </Button>
            )}

            <div className="h-11.5 border-l-[3px] max-500px:hidden"></div>

            <div className="flex flex-col">
              <div className="z-3 flex items-center gap-0">
                <img
                  src="https://avatars.githubusercontent.com/u/56752104?v=4"
                  alt=""
                  className="z-4 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src="https://avatars.githubusercontent.com/u/71691473?v=4"
                  alt=""
                  className="z-3 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src="https://avatars.githubusercontent.com/u/94097778?v=4"
                  alt=""
                  className="z-2 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src="https://avatars.githubusercontent.com/u/72697074?v=4"
                  alt=""
                  className="z-1 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
              </div>
              <span className="z-3 font-poppins text-body font-medium text-brand-secondary">
                Trusted by 300+ users.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Landing;
