import { userEndpoints } from "@services/ApiEndpoints";
import TrackSection from "@features/dashboard/components/TrackSection";
import ProfileUpdate from "@features/onboarding-profile/components/ProfileUpdate";
import useProfileCompletion from "@features/onboarding-profile/hooks/useProfileCompletion";
import { updateUserData } from "@app/store/slices/userSlice";
import fetcher from "@utils/Fetcher";
import { showErrorToast } from "@utils/Toasts";
import { useState } from "react";
import { useDispatch } from "react-redux";
import useSWR from "swr";
import { Navbar } from "@components";
import ProfileCompletion from "@features/onboarding-profile/components/ProfileCompletion";
import type { DashboardProfileResponse } from "../types";

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
      <div className="mx-12 px-28 py-8">
        <div className="flex h-full items-start gap-[1.2rem]">
          <div className="relative w-[70%] grow rounded-xl">
            <img
              src="https://images.pexels.com/photos/7130555/pexels-photo-7130555.jpeg?cs=srgb&dl=pexels-codioful-7130555.jpg&fm=jpg"
              alt=""
              srcSet=""
              className="h-[200px] w-full rounded-xl object-cover"
            />

            <img
              src="https://t3.ftcdn.net/jpg/04/56/00/16/360_F_456001627_vYt7ZFjxEQ1sshme67JAXorKRPo8gsfN.jpg"
              alt=""
              className="absolute top-[197px] left-16 h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white object-cover"
            />

            <div className="absolute top-[225px] left-[269px] flex -translate-x-1/2 -translate-y-1/2 items-center gap-8 font-outfit">
              <p className="m-0 text-[15px] leading-none">
                <span className="font-semibold">1.25k</span> Followers
              </p>

              <p className="m-0 text-[15px] leading-none">
                <span className="font-semibold">231</span> Hosted Events
              </p>
            </div>

            <button
              className="absolute top-[225px] -right-[63px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-[5px] border-[1.2px] border-brand bg-transparent px-6 py-[0.3rem] font-outfit text-base transition-all duration-200 ease-in-out"
              onClick={() => {
                setOpenModal(true);
                handleSetDefaultValues(profileData?.user);
                console.log(profileData?.user);
              }}
            >
              Edit Profile
            </button>

            <div className="relative mt-16 left-[18px] flex flex-col items-start">
              <h2 className="m-0 font-outfit text-2xl font-semibold">
                {profileData?.user?.name}
              </h2>
              <p className="m-0 mt-2 font-outfit text-base">
                {profileData?.user?.description}
              </p>
            </div>
          </div>

          <div className="relative h-full w-[30%] rounded-xl border border-black/60">
            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-outfit text-xl font-bold whitespace-nowrap">
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
