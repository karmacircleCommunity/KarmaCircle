import { userEndpoints } from "@services/ApiEndpoints.js";
import TrackSection from "@features/dashboard/components/TrackSection";
import ProfileUpdate from "@features/onboarding-profile/components/ProfileUpdate";
import useProfileCompletion from "@features/onboarding-profile/hooks/useProfileCompletion";
import { updateUserData } from "@app/store/slices/userSlice";
import fetcher from "@utils/Fetcher.js";
import { showErrorToast } from "@utils/Toasts.js";
import { useState } from "react";
import { useDispatch } from "react-redux";
import useSWR from "swr";
import { Navbar } from "@components";
import ProfileCompletion from "@features/onboarding-profile/components/ProfileCompletion";
import type { DashboardProfileResponse } from "../types";
import "./Dashboard.scss";

const Dashboard = () => {
  const [openModal, setOpenModal] = useState(false);
  const dispatch = useDispatch();

  const { data: profileData, mutate: refreshProfileData } =
    useSWR<DashboardProfileResponse>(userEndpoints.profile, fetcher, {
      onSuccess: (data) => {
        dispatch(updateUserData(data?.user));
      },
      onError: (error) => {
        showErrorToast(error?.response?.data?.message);
      },
    });

  const { handleSetDefaultValues } = useProfileCompletion();

  return (
    <>
      <Navbar />
      <div className="dashboard_parent">
        <div className="profile_header">
          <div className="profileSection_container">
            <img
              src="https://images.pexels.com/photos/7130555/pexels-photo-7130555.jpeg?cs=srgb&dl=pexels-codioful-7130555.jpg&fm=jpg"
              alt=""
              srcSet=""
              className="profile_Coverpicture"
            />

            <img
              src="https://t3.ftcdn.net/jpg/04/56/00/16/360_F_456001627_vYt7ZFjxEQ1sshme67JAXorKRPo8gsfN.jpg"
              alt=""
              className="profile_picture"
            />

            <div className="profile_numbers">
              <p className="counts followersCount">
                <span>1.25k</span> Followers
              </p>

              <p className="counts EventsCount">
                <span>231</span> Hosted Events
              </p>
            </div>

            <button
              onClick={() => {
                setOpenModal(true);
                handleSetDefaultValues(profileData?.user);
                console.log(profileData?.user);
              }}
            >
              Edit Profile
            </button>

            <div className="profile_details">
              <h2>{profileData?.user?.name}</h2>
              <p>{profileData?.user?.description}</p>
            </div>
          </div>

          <div className="dashboard_track">
            <p className="dashboard_track_p">
              <span> Real time Analytics</span> <br />
              <span>Coming Soon</span>
            </p>
            <TrackSection />
          </div>
        </div>
      </div>

      {profileData?.user?.config?.hasCompletedProfile === false && (
        // Pre-existing prop-name mismatch, not introduced by this
        // conversion: ProfileCompletion.tsx's props are
        // `{ setShowEditModal, refreshProfileData }`, not `edit`/`setOpenModal`.
        // See docs/specs/dashboard.md and dashboard/SPEC.md's "Critical
        // prop-name mismatch" section — fixing it is a behavior change
        // out of scope for a types-only pass.
        <ProfileCompletion
          // @ts-expect-error — see comment above.
          edit={openModal}
          setOpenModal={setOpenModal}
          refreshProfileData={refreshProfileData}
        />
      )}

      {openModal === true && (
        <ProfileUpdate
          setOpenModal={setOpenModal}
          refreshProfileData={refreshProfileData}
          profileData={profileData?.user}
        />
      )}
    </>
  );
};

export default Dashboard;
