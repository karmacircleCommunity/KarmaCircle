// This is the donate page where we come and select organizations to donate an amount !

import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// @ts-expect-error — pre-existing broken import, not introduced by this
// conversion: this path doesn't exist in the current tree (there is no
// components/Cards/SingleOrganizationEvent anywhere in the repo). Per SPEC.md,
// this file is not routed and would fail to build the moment it's
// actually reached; kept behavior-identical here rather than fixed,
// since fixing it is a near-full rewrite out of scope for a types-only
// pass. See docs/specs/donate-shop-trending.md.
import SingleOrganizationEvent from "../../components/Cards/SingleOrganizationEvent/SingleOrganizationEvent";
// @ts-expect-error — same as above: wrong relative depth (this resolves to
// src/features/components/Loading, not src/components/Loading.tsx, where
// the real component now lives, exported from the shared @components barrel).
import Loading from "../../components/Loading";
import { GetAllOrganizations } from "@services/MilanApi";
import "./Donate.css";

const Donate = () => {
  document.title = "Milan | Donate the needy";

  // `GetAllOrganizations()`'s real, unverified-from-this-repo response shape
  // (see SPEC.md) — left as `any[]` rather than invented as a typed
  // `Organization[]`, since this fetch path has never actually run.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [organizationData, setOrganizationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizationData = async () => {
      setLoading(true);
      const response = await GetAllOrganizations();
      // @ts-expect-error — pre-existing bug (see SPEC.md/known-issues.md):
      // stores the raw response directly instead of `response.data`, and
      // doesn't check `response.status` first, so a failed request (now
      // typed as possibly `undefined`) would be stored as `organizationData`
      // as-is. Preserved as-is, out of scope for a types-only pass.
      setOrganizationData(response);
      setLoading(false);
    };
    fetchOrganizationData();
  }, []);

  const loadScript = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    loadScript("https://checkout.razorpay.com/v1/checkout.js");
  });

  // Redirect user to login page if they are not logged in
  useEffect(() => {
    if (!Cookies.get("isLoggedIn")) {
      toast.error("Please log in before donating");
      navigate("/user/login");
    }
  }, []);

  if (!Cookies.get("isLoggedIn")) return null;

  return (
    <>
      <Helmet>
        <title>NgoWorld | Donations</title>
        <meta
          name="description"
          content="Welcome to the donations page, even a small amount can help folks struggling out there."
        />
        <link rel="canonical" href="/" />
      </Helmet>

      <div id="donate_banner" className="container">
        {/* <div id="donateCol2">
          <img src={donate_image1} alt="woman sitting in a chair with a doctor and a woman in a chair" className="donate_img" />
        </div> */}

        <div
          id="donatecol_1"
          className="mr-12 flex flex-col items-start justify-center"
        >
          <h1 className="mb-4">Yes, you help live !!</h1>
          <p>
            Donations do play an important part in our annual funds, donations
            from your end help thousands of unfortunate people live their lives.
          </p>
          <p>
            Choose any organization, donate whatever you want, even 5 rupees helps !
          </p>
        </div>
      </div>

      <hr className="container" />

      <div className="main-card-container">
        <div className="cards justify-center">
          {loading ? (
            <Loading />
          ) : (
            <>
              {organizationData.map((organization) => {
                return <SingleOrganizationEvent key={organization._id} organization={organization} />;
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Donate;
