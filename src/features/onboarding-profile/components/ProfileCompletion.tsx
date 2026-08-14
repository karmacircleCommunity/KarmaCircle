import useProfileCompletion from "@features/onboarding-profile/hooks/useProfileCompletion";
import { completeProfileApiCall } from "@services/MilanApi.js";
import { showSuccessToast } from "@utils/Toasts.js";
import clsx from "clsx";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Button } from "@components";
import type { ProfileCompletionProps } from "../types";
import "./ProfileCompletion.scss";

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
    <div className="profilecompletion_overlay">
      <div className="profilecompletion_modal">
        <div className="profilecompletion_header">
          <div className="profilecompletion_header_top">
            <div>
              <h1> We&apos;re almost done </h1>
              <p>
                To make your Organization visible to others, please complete
                your profile.
              </p>
            </div>

            <Button
              type="submit"
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
          onSubmit={(e) => {
            e.preventDefault();
            validateForm(credentials);
          }}
        >
          <div className="profilecompletion_element">
            <div className="dropzone_container">
              <p className="dropzone_coverlabel">Cover Image</p>

              <label htmlFor="dropzone_file" className="dropzone_label">
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Uploaded Preview"
                    className="uploaded-image"
                  />
                ) : (
                  <div className="dropzone_content">
                    <svg
                      className="dropzone_icon"
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

                    <p className="dropzone_text">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="dropzone_subtext">
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
            className={clsx("profilecompletion_element", "edit_section")}
            key={"description"}
          >
            <label>
              <div>
                Organization Description <span>*</span>
              </div>

              <span className="counter">
                {credentials["description"]?.length || 0}/500
              </span>
            </label>
            <textarea
              value={credentials["description"]}
              onChange={handleChange("description")}
              className="auth_input"
              placeholder={`Enter a meaningful description about your organization`}
            />
            {errors["description"] && (
              <span className="profilecompletion_error">
                {errors["description"]}
              </span>
            )}
          </div>

          <div className="profilecompletion_flexbox">
            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  Address Line 1 <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className="auth_input"
                placeholder={`Address Line 1`}
              />
            </div>

            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  Address Line 2 <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className="auth_input"
                placeholder={`Address Line 2`}
              />
            </div>
          </div>

          <div className="profilecompletion_flexbox">
            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  City <span>*</span>
                </div>
              </label>
              <input
                name="city"
                value={credentials?.address?.city}
                onChange={handleChange("city")}
                className="auth_input"
                placeholder={`City Name`}
              />
            </div>

            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  State/Province <span>*</span>
                </div>
              </label>
              <input
                name="stat e"
                value={credentials?.address?.state}
                onChange={handleChange("state")}
                className="auth_input"
                placeholder={`State Name`}
              />
            </div>
          </div>

          <div className="profilecompletion_flexbox">
            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  Country of establishment <span>*</span>
                </div>
              </label>
              <input
                name="country"
                value={credentials?.address?.country}
                onChange={handleChange("country")}
                className="auth_input"
                placeholder={`Country Name`}
              />
            </div>

            <div className="profilecompletion_element" key={"description"}>
              <label>
                <div>
                  Pincode / Zipcode <span>*</span>
                </div>
              </label>
              <input
                name="pincode"
                type="number"
                value={credentials?.address?.pincode}
                onChange={handleChange("pincode")}
                className="auth_input"
                placeholder={`Pincode`}
              />
            </div>
          </div>

          <div className="profilecompletion_btndiv">
            <Button
              type="submit"
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
