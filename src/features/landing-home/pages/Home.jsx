import Cookies from "js-cookie";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch } from "react-redux";
import Landing from "@features/landing-home/components/Landing.jsx";
import { Footer } from "@components";
import { toggleUserLogin, updateUserData } from "@app/store/slices/userSlice.js";
import { successCallback } from "@services/MilanApi.js";
import { showErrorToast, showSuccessToast } from "@utils/Toasts.js";

const Home = () => {
  const dispatch = useDispatch();
  const handleToken = async () => {
    const authData = await successCallback();

    if (authData?.status === 200) {
      showSuccessToast(authData?.data?.message);
      dispatch(updateUserData(authData.data.user));
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
        <title>NgoWorld</title>
        <meta
          name="description"
          content="Welcome to the homepage of NgoWorld, a hub for Users to collaborate with NGOs, Charities and more."
        />
        <link rel="canonical" href="/" />
      </Helmet>

      <Landing />

      <Footer />
    </>
  );
};

export default Home;
