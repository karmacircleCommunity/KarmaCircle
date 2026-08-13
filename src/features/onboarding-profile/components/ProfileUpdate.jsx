import { STATUSCODE } from "@statics/Constants.js";
import { updateUserProfile } from "@services/MilanApi.js";
import { showSuccessToast } from "@utils/Toasts.js";
import clsx from "clsx";
import { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { Button } from "@components";
import "./ProfileUpdate.scss";

const ProfileUpdate = ({ setOpenModal, refreshProfileData, profileData }) => {
  const [credentials, setCredentials] = useState({
    description: profileData?.description || "",
    name: profileData?.name || "",
    coverImage: "",
    address: {
      line1: profileData?.address?.line1 || "",
      line2: profileData?.address?.line2 || "",
      city: profileData?.address?.city || "",
      state: profileData?.address?.state || "",
      country: profileData?.address?.country || "",
      pincode: profileData?.address?.pincode || "",
    },
  });
  const [errors, setErrors] = useState({});
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedProfilePicture, setUploadedProfilePicture] = useState(null);

  const handleChange = (field) => (event) => {
    const updatedCredentials = { ...credentials };

    if (field === "description" || field === "name") {
      updatedCredentials[field] = event.target.value;
    } else {
      // For address fields, update the address object inside the credentials
      updatedCredentials.address[field] = event.target.value;
    }

    setCredentials(updatedCredentials);
  };

  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      if (type === "cover") {
        setUploadedImage(imageURL);
      } else {
        setUploadedProfilePicture(imageURL);
      }
    }
  };

  const handleResetFields = () => {
    setCredentials({
      description: "",
      coverImage: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      },
    });
  };

  const validateForm = async () => {
    const newErrors = {};

    // Check required fields for top-level fields
    const requiredFields = ["description", "name"];
    requiredFields.forEach((field) => {
      if (!credentials[field] || credentials[field].trim() === "") {
        newErrors[field] = `${field} is required.`;
      }
    });

    // Check required fields for address fields
    const addressFields = [
      "line1",
      "line2",
      "city",
      "state",
      "country",
      "pincode",
    ];
    addressFields.forEach((field) => {
      if (
        !credentials.address[field] ||
        credentials.address[field].trim() === ""
      ) {
        newErrors[`address.${field}`] = `${field} is required.`;
      }
    });

    // Description length validation
    if (credentials.description && credentials.description.length > 500) {
      newErrors.description = "Description cannot be more than 500 characters.";
    }

    if (credentials.description && credentials.description.length < 100) {
      newErrors.description = "Description cannot be less than 100 characters.";
    }

    // Pincode validation
    if (credentials.address.pincode && isNaN(credentials.address.pincode)) {
      newErrors["address.pincode"] = "Pincode must be a valid number.";
    }

    setErrors(newErrors);

    const data = await updateUserProfile({
      credentials,
    });

    if (data.status === STATUSCODE.OK) {
      showSuccessToast(data?.data?.message);
      refreshProfileData();
      setOpenModal(false);
      return;
    }

    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="profileupdate_overlay">
      <div className="profileupdate_modal">
        <div className="profileupdate_header">
          <div className="profileupdate_header_edit">
            <RxCross2
              onClick={() => {
                setOpenModal(false);
                handleResetFields();
              }}
            />
            <h1> Edit profile </h1>
            <Button
              type="submit"
              onClickfunction={(e) => {
                e.preventDefault();
                validateForm();
              }}
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
              Save
            </Button>
          </div>
        </div>

        <form>
          <div className="profileupdate_element">
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

              <label
                htmlFor="dropzone_pfp"
                className="dropzone_label profile_picture_label"
              >
                {uploadedProfilePicture ? (
                  <img
                    src={uploadedProfilePicture}
                    alt="Uploaded Preview"
                    className="uploaded-image profile_picture"
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
                  </div>
                )}
              </label>

              <input
                id="dropzone_pfp"
                type="file"
                className="hidden"
                onChange={(e) => handleFileChange(e, "pfp")}
              />
            </div>
          </div>

          <div className="profileupdate_element edit_section">
            <label>
              <div>
                Organization Name <span>*</span>
              </div>
            </label>
            <input
              value={credentials?.name}
              onChange={handleChange("name")}
              className="auth_input"
              placeholder={`The name of your organization`}
            />
          </div>
          <div className={clsx("profileupdate_element", "")}>
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
              name="description"
              onChange={handleChange("description")}
              className="auth_input"
              placeholder={`Enter a meaningful description about your organization`}
            />
            {errors["description"] && (
              <span className="profileupdate_error">
                {errors["description"]}
              </span>
            )}
          </div>

          <div className="profileupdate_flexbox">
            <div className="profileupdate_element">
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

            <div className="profileupdate_element">
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

          <div className="profileupdate_flexbox">
            <div className="profileupdate_element">
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

            <div className="profileupdate_element">
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

          <div className="profileupdate_flexbox">
            <div className="profileupdate_element">
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

            <div className="profileupdate_element">
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
        </form>
      </div>
    </div>
  );
};

export default ProfileUpdate;
