import profileImage from "@assets/pictures/Navbar/profilePlaceholderImage.png";
import { useEffect, useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCaretDown, RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { resetUserData, selectUser } from "@app/store/slices/userSlice";
import type { RootState } from "@app/store/store";
import { Logout } from "@services/MilanApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import Button from "@components/buttons/Button";

// No "Home" entry — the logo already links there (standard marketing-site
// convention: a persistent top nav lists the *other* destinations, not the
// page the logo itself points to).
const Links = [
  {
    name: "Organizations",
    link: "/organizations",
  },
  {
    name: "Trending",
    link: "/trending",
  },
  {
    name: "Events",
    link: "/events",
  },
  {
    name: "Shops",
    link: "/shop",
  },
];

type NavbarProps = {
  // Hides the navbar's own "Sign Up" while a bigger, redundant CTA
  // elsewhere on the page is on screen (Landing.tsx passes this, driven by
  // its own ScrollTrigger — see that file). Every other page renders
  // `<Navbar />` with no props, so this defaults to `false` (always show)
  // there, which is the correct behavior on pages with no such CTA.
  hideSignUpForHeroCta?: boolean;
};

const Navbar = ({ hideSignUpForHeroCta = false }: NavbarProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  const user = useSelector(selectUser);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const toggleNavbar = () => {
    setIsNavbarOpen(!isNavbarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  async function handleLogout() {
    const data = await Logout();

    // @ts-expect-error — pre-existing loose access into `Logout()`'s
    // response shape (catch branch returns the raw caught error, not
    // `error.response` — see MilanApi.ts/SPEC.md); preserved as-is for
    // a types-only pass.
    if (data?.status === 200) {
      // @ts-expect-error — see above.
      showSuccessToast(data?.data?.message);
      navigate("/");
      dispatch(resetUserData());
      localStorage.clear();
      document
        .querySelector(".nav_dropdown")
        ?.classList.remove("nav_dropdown_visible");
    } else {
      // @ts-expect-error — see above.
      showErrorToast(data?.message);
    }
  }

  return (
    <nav>
      <div className="sticky z-99 mx-8 flex items-center justify-between px-28 py-[0.8rem] max-430px:px-6">
        <Link to={"/"} className="z-10 flex items-center gap-2 no-underline">
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full bg-brand"
          />
          <span className="font-outfit text-xl leading-none font-medium tracking-tight text-brand-secondary">
            NgoWorld
          </span>
        </Link>

        {windowWidth > 900 && (
          <div className="flex items-center gap-8">
            {/* No active-route underline: that's an app-internal-tab
                pattern, not a marketing-nav one — a visitor already knows
                which page they're on from the page itself. A plain color
                shift on hover is the whole "state" this nav needs. */}
            <div className="z-1 flex items-center gap-7">
              {Links.map((item, index) => (
                <Link
                  key={index}
                  className="font-outfit text-body-lg leading-none font-normal text-ink/65 no-underline transition-colors duration-200 hover:text-brand-secondary"
                  to={item.link}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            {isLoggedIn ? (
              <p
                onClick={() => {
                  document
                    .querySelector(".nav_dropdown")
                    ?.classList.toggle("nav_dropdown_visible");
                }}
                className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-normal text-ink/65 no-underline transition-colors duration-200 hover:text-brand-secondary"
              >
                Profile <RxCaretDown className="size-6.25" />
              </p>
            ) : (
              <Button
                to="/auth/signup"
                className={`z-3 flex w-auto items-center justify-around gap-2.5 rounded-5px border-none px-5 py-2 font-outfit text-base font-normal not-italic transition-all duration-300 ease-in-out hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)] ${hideSignUpForHeroCta ? "pointer-events-none opacity-0" : "opacity-100"}`}
              >
                <span>Sign Up</span>
              </Button>
            )}
          </div>
        )}

        {!isNavbarOpen &&
          (isLoggedIn ? (
            <img
              src={(user?.profileImage as string | undefined) || profileImage}
              alt=""
              className="hidden size-7.5 cursor-pointer rounded-full max-430px:block"
              onClick={() => {
                toggleNavbar();
              }}
            />
          ) : (
            <GiHamburgerMenu
              className="hidden size-7.5 cursor-pointer text-heading max-430px:block"
              onClick={() => {
                toggleNavbar();
              }}
            />
          ))}

        {isNavbarOpen && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/[0.867] transition-all duration-300 ease-in-out">
            <div className="absolute top-[20%] flex w-[80vw] flex-wrap items-center justify-center gap-7.5 rounded-xl bg-white p-4 pt-8 shadow-[1px_3px_80px_rgba(255,255,255,0.346)]">
              <RxCross2
                className="absolute top-2.5 right-2.5 cursor-pointer"
                onClick={() => {
                  toggleNavbar();
                }}
              />

              {Links.map((item, index) => (
                <Link
                  key={index}
                  className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-normal text-ink no-underline"
                  to={item.link}
                >
                  {item.name}
                </Link>
              ))}

              {isLoggedIn ? (
                <>
                  <div>
                    <Link
                      className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-black no-underline"
                      to={"/dashboard"}
                    >
                      {user?.userType === "individual"
                        ? "Profile"
                        : "Dashboard"}
                    </Link>
                  </div>
                  <div>
                    <p
                      className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-black no-underline"
                      onClick={() => {
                        handleLogout();
                        setIsNavbarOpen(false);
                      }}
                    >
                      Logout
                    </p>
                  </div>
                </>
              ) : (
                <Button
                  to={"/auth/signup"}
                  className="flex w-auto items-center gap-1.25 px-4 py-2 font-outfit text-body-lg no-underline"
                >
                  <span>Sign Up</span>
                  <FaChevronRight />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="nav_dropdown absolute top-10 right-17.75 z-10 hidden w-50 flex-col justify-center rounded-md bg-white shadow-[0px_0px_1.17px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent),0px_0px_8.191px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent),0px_0px_28.084px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent)] transition-all duration-1000 ease-in-out">
          <div className="flex flex-col justify-center">
            <span className="mb-1.25 p-2.5 font-outfit text-base">
              Hello @{user?.userName}
            </span>
            <div
              role="separator"
              aria-orientation="horizontal"
              className="h-px w-full bg-[#e2e5e883]"
            ></div>
            <Link
              to={
                user?.userType === "individual"
                  ? `/user/${user?.userName}`
                  : `/dashboard`
              }
              className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
            >
              {user?.userType === "individual" ? "Your Profile" : "Dashboard"}
            </Link>
            {user?.userType === "organization" ? (
              <Link
                to={"/event/create"}
                className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
              >
                Your Events
              </Link>
            ) : null}
            {/* @ts-expect-error — pre-existing: no `to` prop passed, unlike every other `<Link>` in the app; preserved as-is for a types-only pass. */}
            <Link className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]">
              Settings
            </Link>
          </div>
          <div className="flex flex-col justify-center">
            <div
              role="separator"
              aria-orientation="horizontal"
              className="h-px w-full bg-[#e2e5e883]"
            ></div>
            {/* @ts-expect-error — see above. */}
            <Link className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]">
              Support
            </Link>
            {/* @ts-expect-error — see above. */}
            <Link
              onClick={() => {
                handleLogout();
              }}
              className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
