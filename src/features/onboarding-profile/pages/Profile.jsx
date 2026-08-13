import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { FiEdit3 } from "react-icons/fi";
import { MdLogout } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";
import useSWR from "swr";
import { Button, Navbar } from "@components";
import { clubEndpoints } from "@services/ApiEndpoints.js";
import { resetUserData } from "@app/store/slices/userSlice.js";
import { Logout } from "@services/MilanApi.js";
import fetcher from "@utils/Fetcher.js";
import { showErrorToast, showSuccessToast } from "@utils/Toasts.js";
import { checkMissingFields } from "@features/onboarding-profile/utils/checkMissingFields.js";
import "./Profile.scss";

const Profile = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, seteditProfile] = useState(false);

  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const trueUser = user?.userName === params.userName;
  const { data: details } = useSWR(
    clubEndpoints.details(params.userName),
    fetcher,
  );

  useEffect(() => {
    if (
      !Cookies.get("skipProfileCompletion") &&
      checkMissingFields(user) &&
      trueUser
    ) {
      setShowProfileModal(true);
    }
  }, []);

  async function handleLogout() {
    const data = await Logout();

    if (data?.status === 200) {
      showSuccessToast(data?.data?.message);
      setTimeout(() => {
        navigate("/");
        dispatch(resetUserData());
        Cookies.remove("skipProfileCompletion");
      }, 1500);
    } else {
      showErrorToast(data?.message);
    }
  }

  const toggleProfileModal = () => {
    setShowProfileModal(!showProfileModal);
    seteditProfile(true);
  };

  return (
    <>
      <Navbar />

      <div className="profile_container">
        <div className="profile_parent">
          <div className="profile_header">
            <img
              src="https://api.freelogodesign.org/assets/thumb/logo/bdd55f703a074abb8bf50c0d3891c0a9_400.png?t=638314396148720000"
              alt=""
            />

            <div className="profile_header_details">
              {details?.userType === "club" ? (
                <div>
                  <h1 className="profile_header_name">{details?.name} </h1>
                  <h2 className="profile_header_tagline">{details?.tagLine}</h2>
                </div>
              ) : (
                <div>
                  <h1 className="profile_header_name">
                    {details?.firstName} {details?.lastName}{" "}
                  </h1>
                </div>
              )}

              <div className="profile_header_ctadiv">
                {trueUser ? (
                  <Button
                    variant="solid"
                    className="profile_header_cta"
                    onClickfunction={toggleProfileModal}
                  >
                    <FiEdit3 />
                    Edit profile
                  </Button>
                ) : (
                  <Button variant="solid" className="profile_header_cta">
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="1"
                      viewBox="0 0 24 24"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g id="Bell_On">
                        <path d="M18.79,15.34a2.087,2.087,0,0,0-1.26-.61V10.19a5.5,5.5,0,0,0-1.62-3.91,5.826,5.826,0,0,0-2.15-1.33V4.89a1.8,1.8,0,0,0-1.61-1.81,1.749,1.749,0,0,0-1.91,1.75v.12a5.547,5.547,0,0,0-3.77,5.24v4.54a2.122,2.122,0,0,0-1.88,2.11v.53a2.121,2.121,0,0,0,2.12,2.12H10.3a1.725,1.725,0,0,0,3.4,0h3.59a2.121,2.121,0,0,0,2.12-2.12v-.53A2.1,2.1,0,0,0,18.79,15.34Zm-.38,2.03a1.118,1.118,0,0,1-1.12,1.12H6.71a1.118,1.118,0,0,1-1.12-1.12v-.53a1.118,1.118,0,0,1,1.12-1.12.762.762,0,0,0,.76-.77V10.19a4.555,4.555,0,0,1,3.24-4.34.729.729,0,0,0,.53-.71V4.83a.735.735,0,0,1,.25-.56.744.744,0,0,1,.51-.2h.07a.807.807,0,0,1,.69.82v.25a.729.729,0,0,0,.53.71A4.668,4.668,0,0,1,15.2,6.99a4.468,4.468,0,0,1,1.33,3.2v4.76a.8.8,0,0,0,.22.55.773.773,0,0,0,.54.22,1.127,1.127,0,0,1,1.12,1.12Z"></path>
                      </g>
                    </svg>
                    Subscribe
                  </Button>
                )}

                {trueUser ? (
                  <Button
                    variant="outline"
                    className="profile_header_cta"
                    onClickfunction={handleLogout}
                  >
                    <MdLogout
                      style={{
                        color: "black",
                      }}
                    />
                    Logout
                  </Button>
                ) : (
                  <Button variant="solid" className="profile_header_cta">
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="1"
                      viewBox="0 0 24 24"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g id="Heart">
                        <path d="M12,20.043a.977.977,0,0,1-.7-.288L4.63,13.08A5.343,5.343,0,0,1,6.053,4.513,5.266,5.266,0,0,1,12,5.371a5.272,5.272,0,0,1,5.947-.858A5.343,5.343,0,0,1,19.37,13.08l-6.676,6.675A.977.977,0,0,1,12,20.043ZM8.355,4.963A4.015,4.015,0,0,0,6.511,5.4,4.4,4.4,0,0,0,4.122,8.643a4.345,4.345,0,0,0,1.215,3.73l6.675,6.675,6.651-6.675a4.345,4.345,0,0,0,1.215-3.73A4.4,4.4,0,0,0,17.489,5.4a4.338,4.338,0,0,0-4.968.852h0a.744.744,0,0,1-1.042,0A4.474,4.474,0,0,0,8.355,4.963Z"></path>
                      </g>
                    </svg>{" "}
                    Sponsor
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="profile_header_ctadiv">
            {trueUser ? (
              <Button
                variant="solid"
                className="profile_header_cta"
                onClickfunction={toggleProfileModal}
              >
                <FiEdit3 />
                Edit profile
              </Button>
            ) : (
              <Button variant="solid" className="profile_header_cta">
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="1"
                  viewBox="0 0 24 24"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="Bell_On">
                    <path d="M18.79,15.34a2.087,2.087,0,0,0-1.26-.61V10.19a5.5,5.5,0,0,0-1.62-3.91,5.826,5.826,0,0,0-2.15-1.33V4.89a1.8,1.8,0,0,0-1.61-1.81,1.749,1.749,0,0,0-1.91,1.75v.12a5.547,5.547,0,0,0-3.77,5.24v4.54a2.122,2.122,0,0,0-1.88,2.11v.53a2.121,2.121,0,0,0,2.12,2.12H10.3a1.725,1.725,0,0,0,3.4,0h3.59a2.121,2.121,0,0,0,2.12-2.12v-.53A2.1,2.1,0,0,0,18.79,15.34Zm-.38,2.03a1.118,1.118,0,0,1-1.12,1.12H6.71a1.118,1.118,0,0,1-1.12-1.12v-.53a1.118,1.118,0,0,1,1.12-1.12.762.762,0,0,0,.76-.77V10.19a4.555,4.555,0,0,1,3.24-4.34.729.729,0,0,0,.53-.71V4.83a.735.735,0,0,1,.25-.56.744.744,0,0,1,.51-.2h.07a.807.807,0,0,1,.69.82v.25a.729.729,0,0,0,.53.71A4.668,4.668,0,0,1,15.2,6.99a4.468,4.468,0,0,1,1.33,3.2v4.76a.8.8,0,0,0,.22.55.773.773,0,0,0,.54.22,1.127,1.127,0,0,1,1.12,1.12Z"></path>
                  </g>
                </svg>
                Subscribe
              </Button>
            )}

            {trueUser ? (
              <Button
                variant="outline"
                className="profile_header_cta"
                onClickfunction={handleLogout}
              >
                <MdLogout
                  style={{
                    color: "black",
                  }}
                />
                Logout
              </Button>
            ) : (
              <Button variant="solid" className="profile_header_cta">
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="1"
                  viewBox="0 0 24 24"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="Heart">
                    <path d="M12,20.043a.977.977,0,0,1-.7-.288L4.63,13.08A5.343,5.343,0,0,1,6.053,4.513,5.266,5.266,0,0,1,12,5.371a5.272,5.272,0,0,1,5.947-.858A5.343,5.343,0,0,1,19.37,13.08l-6.676,6.675A.977.977,0,0,1,12,20.043ZM8.355,4.963A4.015,4.015,0,0,0,6.511,5.4,4.4,4.4,0,0,0,4.122,8.643a4.345,4.345,0,0,0,1.215,3.73l6.675,6.675,6.651-6.675a4.345,4.345,0,0,0,1.215-3.73A4.4,4.4,0,0,0,17.489,5.4a4.338,4.338,0,0,0-4.968.852h0a.744.744,0,0,1-1.042,0A4.474,4.474,0,0,0,8.355,4.963Z"></path>
                  </g>
                </svg>{" "}
                Sponsor
              </Button>
            )}
          </div>

          {/* <div className="profile_events">
            <h1 className="profile_events_title">Recent Events</h1>

            <Marquee
              autoFill={true}
              pauseOnHover={true}
              speed={20}
              direction="right"
            >
              <EventsCard />
            </Marquee>
          </div>

          */}

          {/* {user?.description && (

          )} */}

          {details?.description && (
            <div className="profile_about">
              <h1 className="profile_about_title">About Us</h1>

              <p>{details?.description}</p>
            </div>
          )}

          {details?.userType === "club" && (
            <div className="profile_map">
              <h1 className="profile_about_title">Find us here</h1>
              <iframe
                src={
                  user?.iframe ||
                  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14741.482534684159!2d88.35842639207846!3d22.527784753774615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a0276d0a2583ccf%3A0xf1efff5c088752e2!2s6%20Ballygunge%20Place!5e0!3m2!1sen!2sin!4v1695572606793!5m2!1sen!2sin"
                }
                allowfullscreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Profile;
