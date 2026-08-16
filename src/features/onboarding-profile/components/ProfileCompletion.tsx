import useProfileCompletion from "@features/onboarding-profile/hooks/useProfileCompletion";
import { completeProfileApiCall } from "@services/MilanApi";
import { showSuccessToast } from "@utils/Toasts";
import clsx from "clsx";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Button } from "@components";
import type { ProfileCompletionProps } from "../types";

const inputClasses =
  "font-outfit block w-full appearance-none rounded-[0.375rem] border border-input-border bg-white bg-clip-padding px-3 py-[0.375rem] text-[15px] leading-normal font-normal text-ink transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-[15px]! focus:border-black/[51%] focus:shadow-none focus:outline-none";

/**
 * Modal: first-time profile completion (also, confusingly, reused for
 * edits triggered from `Dashboard.tsx` — see SPEC.md's "two Save
 * buttons, two different behaviors" breakdown, the most important thing
 * to know about this component).
 */
const ProfileCompletion = ({
  setShowEditModal,
  refreshProfileData,
}: ProfileCompletionProps) => {
  const { errors, validateForm, handleChange, credentials, handleResetFields } =
    useProfileCompletion();
  // Destructured but never called in this component, same as the original
  // (the file-level `eslint-disable no-unused-vars` it used to carry
  // covered this — see SPEC.md).
  void handleResetFields;

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  // Only a cover-image dropzone is rendered below (contrast with
  // ProfileUpdate.tsx, which has both) — this state is set but never
  // read, kept for parity with the original.
  const [uploadedProfilePicture, setUploadedProfilePicture] = useState<
    string | null
  >(null);
  void uploadedProfilePicture;

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      if (type === "cover") {
        setUploadedImage(imageURL);
      } else {
        setUploadedProfilePicture(imageURL);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[101] flex h-full w-full items-center justify-center bg-black/80 backdrop-blur-[6px]">
      <div className="relative flex max-h-[80vh] min-h-[400px] w-[40vw] min-w-[800px] flex-col justify-between overflow-y-auto rounded-[15px] bg-white text-black max-[525px]:w-[89vw] max-[525px]:min-w-[220px]">
        <div className="sticky top-0 z-10 bg-white px-4 py-[10px]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-0 font-outfit text-2xl font-bold text-brand-secondary">
                {" "}
                We&apos;re almost done{" "}
              </h1>
              <p className="mb-8 font-outfit text-[15px] font-normal text-black">
                To make your Organization visible to others, please complete
                your profile.
              </p>
            </div>

            <Button
              type="submit"
              className="w-[15%] font-outfit"
              disabled={
                !credentials?.description ||
                !credentials?.address?.line1 ||
                !credentials?.address?.line2 ||
                !credentials?.address?.city ||
                !credentials?.address?.state ||
                !credentials?.address?.country ||
                !credentials?.address?.pincode
              }
              onClickfunction={async () => {
                const data = await completeProfileApiCall({
                  credentials,
                });

                if (data?.status === 200) {
                  showSuccessToast(data?.data?.message);
                  setShowEditModal(false);
                  refreshProfileData();
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <form
          className="flex w-full flex-col gap-[1.2rem] p-4 font-outfit"
          onSubmit={(e) => {
            e.preventDefault();
            validateForm(credentials);
          }}
        >
          <div className="relative flex w-full flex-col font-outfit">
            <div className="flex w-full flex-col items-start justify-center">
              <p className="mb-[3px] text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                Cover Image
              </p>

              <label
                htmlFor="dropzone_file"
                className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors duration-300 hover:bg-surface-hover"
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Uploaded Preview"
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="mb-4 h-8 w-8 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>

                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG up to 10MB (800 X 200)
                    </p>
                  </div>
                )}
              </label>

              <input
                id="dropzone_file"
                type="file"
                className="hidden"
                onChange={(e) => handleFileChange(e, "cover")}
              />
            </div>
          </div>
          <div
            className={clsx("relative mt-10 flex w-full flex-col font-outfit")}
            key={"description"}
          >
            <label>
              <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                Organization Description{" "}
                <span className="text-sm text-red-600">*</span>
              </div>

              <span className="text-[13px] text-brand-secondary/[74%]">
                {credentials["description"]?.length || 0}/500
              </span>
            </label>
            <textarea
              value={credentials["description"]}
              onChange={handleChange("description")}
              className={`${inputClasses} h-[100px] max-[500px]:text-[10px]!`}
              placeholder={`Enter a meaningful description about your organization`}
            />
            {errors["description"] && (
              <span className="mt-[5px] text-[15px] text-red-600">
                {errors["description"]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  Address Line 1 <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className={inputClasses}
                placeholder={`Address Line 1`}
              />
            </div>

            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  Address Line 2 <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className={inputClasses}
                placeholder={`Address Line 2`}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  City <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                name="city"
                value={credentials?.address?.city}
                onChange={handleChange("city")}
                className={inputClasses}
                placeholder={`City Name`}
              />
            </div>

            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  State/Province <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                name="stat e"
                value={credentials?.address?.state}
                onChange={handleChange("state")}
                className={inputClasses}
                placeholder={`State Name`}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  Country of establishment{" "}
                  <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                name="country"
                value={credentials?.address?.country}
                onChange={handleChange("country")}
                className={inputClasses}
                placeholder={`Country Name`}
              />
            </div>

            <div
              className="relative flex w-full flex-col font-outfit"
              key={"description"}
            >
              <label>
                <div className="mb-[3px] flex items-center justify-between text-[17px] font-normal text-brand-secondary max-[500px]:text-[15px]">
                  Pincode / Zipcode{" "}
                  <span className="text-sm text-red-600">*</span>
                </div>
              </label>
              <input
                name="pincode"
                type="number"
                value={credentials?.address?.pincode}
                onChange={handleChange("pincode")}
                className={inputClasses}
                placeholder={`Pincode`}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-4">
            <Button
              type="submit"
              className="rounded-[5px] px-4 py-2 text-base font-medium font-outfit transition-all duration-300 ease-in-out"
              disabled={
                !credentials?.description ||
                !credentials?.address?.line1 ||
                !credentials?.address?.line2 ||
                !credentials?.address?.city ||
                !credentials?.address?.state ||
                !credentials?.address?.country ||
                !credentials?.address?.pincode
              }
            >
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletion;
