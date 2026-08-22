import profileImage from "@assets/pictures/Navbar/profilePlaceholderImage.png";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCaretDown, RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import navbarbrand from "@assets/pictures/Navbar/MilanNavBrand.svg";
import { resetUserData, selectUser } from "@app/store/slices/userSlice";
import type { RootState } from "@app/store/store";
import { Logout } from "@services/MilanApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import Button from "@components/buttons/Button";

const Links = [
  {
    name: "Home",
    link: "/",
  },
  {
    name: "Clubs",
    link: "/clubs",
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

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  const user = useSelector(selectUser);
  console.log("🚀 ~ Navbar ~ user:", user);

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
        <Link to={"/"}>
          <img
            src={navbarbrand}
            alt="Milan-logo"
            className="z-9999999999999999999999 w-37.5 cursor-pointer max-430px:z-10 max-430px:w-32.5"
          />
        </Link>

        {windowWidth > 900 && (
          <div className="flex items-center gap-6.25">
            <div className="z-1 flex items-center gap-6.25">
              {Links.map((item, index) => {
                return (
                  <div key={index}>
                    <Link
                      key={index}
                      className="font-outfit text-body-lg leading-none font-medium text-[#8c321b] no-underline"
                      to={item.link}
                    >
                      {item.name}
                    </Link>
                    <div
                      className={
                        location.pathname === item?.link
                          ? "mx-auto w-1/2 border-b-2 border-heading"
                          : ""
                      }
                    ></div>
                  </div>
                );
              })}
            </div>
            {Cookies.get("Token") && isLoggedIn ? (
              <p
                onClick={() => {
                  document
                    .querySelector(".nav_dropdown")
                    ?.classList.toggle("nav_dropdown_visible");
                }}
                className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-[#8c321b] no-underline"
              >
                Profile <RxCaretDown className="size-6.25" />
              </p>
            ) : (
              <Button
                to="/auth/signup"
                className="z-3 flex w-auto items-center justify-around gap-2.5 rounded-5px border-none px-5 py-2 font-outfit text-base font-normal not-italic hover:bg-brand hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)] hover:transition-all hover:duration-300 hover:ease-in-out"
              >
                <span>Sign Up</span>
              </Button>
            )}
          </div>
        )}

        {!isNavbarOpen &&
          (Cookies.get("Token") ? (
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

              {Links.map((item, index) => {
                return (
                  <div key={index}>
                    <Link
                      key={index}
                      className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-black no-underline"
                      to={item.link}
                    >
                      {item.name}
                    </Link>
                    <div
                      className={
                        location.pathname === item?.link
                          ? "mx-auto w-1/2 border-b-2 border-heading"
                          : ""
                      }
                    ></div>
                  </div>
                );
              })}

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

        <div className="nav_dropdown absolute top-10 right-17.75 z-10 hidden w-50 flex-col justify-center rounded-md bg-white shadow-[0px_0px_1.17px_0px_#ff5b3120,0px_0px_8.191px_0px_#ff5b3120,0px_0px_28.084px_0px_#ff5b3120] transition-all duration-1000 ease-in-out">
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
            {user?.userType === "club" ? (
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
