import Cookies from "js-cookie";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch } from "react-redux";
import Landing from "@features/landing-home/components/Landing";
import HowItWorks from "@features/landing-home/components/HowItWorks";
import DrivesRail from "@features/landing-home/components/DrivesRail";
import OpenSource from "@features/landing-home/components/OpenSource";
import { Footer } from "@components";
import { toggleUserLogin, updateUserData } from "@app/store/slices/userSlice";
import { successCallback } from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { OAuthSuccessResponse } from "../types";

/**
 * The `/` page. Doubles as the landing pad for the Google OAuth
 * handshake started in the `authentication` feature — see SPEC.md and
 * authentication/SPEC.md#google-oauth-flow for the full round trip.
 */
const Home = () => {
  const dispatch = useDispatch();
  const handleToken = async () => {
    const authData = (await successCallback()) as OAuthSuccessResponse;

    if (authData?.status === 200) {
      showSuccessToast(authData?.data?.message);
      dispatch(updateUserData(authData.data?.user));
      dispatch(toggleUserLogin());
    } else {
      showErrorToast(authData?.message);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (Cookies.get("OAuthLoginInitiated")) {
      handleToken();
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>KarmaCircle</title>
        <meta
          name="description"
          content="Welcome to the homepage of KarmaCircle, a hub for Users to collaborate with NGOs, Charities and more."
        />
        <link rel="canonical" href="/" />
      </Helmet>

      <Landing />

      <HowItWorks />

      <DrivesRail />

      <OpenSource />

      <Footer />
    </>
  );
};

export default Home;
