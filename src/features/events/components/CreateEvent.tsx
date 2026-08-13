import { STATUSCODE } from "@statics/Constants.js";
import { updateUserProfile } from "@services/MilanApi.js";
import { showSuccessToast } from "@utils/Toasts.js";
import clsx from "clsx";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { RxCross2 } from "react-icons/rx";
import { Button } from "@components";
import type { CreateEventCredentials } from "../types";
import "./CreateEvent.scss";

interface CreateEventProps {
  setShowCreateModal: (open: boolean) => void;
}

/**
 * Reachable from `/events`, but cannot ever be submitted — see
 * SPEC.md's "eight inputs share two state slots" finding: `city`,
 * `state`, `country`, `pincode` are never written by any input, so
 * the Save button's `disabled` gate can never clear. Also hits the
 * profile-update endpoint, not an event-creation one. Kept
 * behavior-identical during this types-only conversion; if asked to
 * fix event creation, build from `CreateEvents.tsx` instead (per
 * SPEC.md).
 */
const CreateEvent = ({ setShowCreateModal }: CreateEventProps) => {
  const [credentials, setCredentials] = useState<CreateEventCredentials>({
    description: "",
    name: "",
    coverImage: "",
    eventMode: "online",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  // Set by handleFileChange's non-"cover" branch but never read anywhere —
  // this form only has a cover-image dropzone in its JSX (contrast with
  // ProfileUpdate.tsx, which has both). Kept for parity with the original.
  const [uploadedProfilePicture, setUploadedProfilePicture] = useState<
    string | null
  >(null);
  void uploadedProfilePicture;

  const handleChange =
    (field: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const updatedCredentials = { ...credentials };

      if (field === "description" || field === "name") {
        (updatedCredentials as unknown as Record<string, string>)[field] =
          event.target.value;
      } else {
        // For address fields, update the address object inside the credentials
        (
          updatedCredentials.address as unknown as Record<string, string>
        )[field] = event.target.value;
      }

      setCredentials(updatedCredentials);
    };

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

  const handleResetFields = () => {
    setCredentials({
      description: "",
      name: "",
      coverImage: "",
      eventMode: "online",
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
    const newErrors: Record<string, string> = {};

    // Check required fields for top-level fields
    const requiredFields = ["description", "name"] as const;
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
    ] as const;
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
    if (credentials.address.pincode && isNaN(Number(credentials.address.pincode))) {
      newErrors["address.pincode"] = "Pincode must be a valid number.";
    }

    setErrors(newErrors);

    const data = await updateUserProfile({
      credentials,
    });

    if (data.status === STATUSCODE.OK) {
      showSuccessToast(data?.data?.message);
      setShowCreateModal(false);
      return;
    }

    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="createevent_overlay">
      <div className="createevent_modal">
        <div className="createevent_header">
          <div className="createevent_header_edit">
            <RxCross2
              onClick={() => {
                setShowCreateModal(false);
                handleResetFields();
              }}
            />
            <h1> Create an event </h1>
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
          <div className="createevent_element">
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

          <div className="createevent_element edit_section">
            <label>
              <div>
                Event Name <span>*</span>
              </div>
            </label>
            <input
              value={credentials?.name}
              onChange={handleChange("name")}
              className="auth_input"
              placeholder={`A catchy name for your event`}
            />
          </div>
          <div className={clsx("createevent_element", "")}>
            <label>
              <div>
                Event Description <span>*</span>
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
              placeholder={`A brief description about your event`}
            />
            {errors["description"] && (
              <span className="createevent_error">{errors["description"]}</span>
            )}
          </div>

          <div className="createevent_flexbox">
            <div className="createevent_element">
              <label>
                <div>
                  Contact Number <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className="auth_input"
                placeholder={`Contact Number for your event`}
              />
            </div>

            <div className="createevent_element">
              <label>
                <div>
                  Contact Email <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className="auth_input"
                placeholder={`Email Id for your event`}
              />
            </div>
          </div>

          <div className="createevent_mode">
            <div className="plans">
              <div className="title">Event Mode</div>

              <div
                className="plan basic-plan"
                // @ts-expect-error — `htmlFor` is not a valid attribute on a
                // <div> (only <label>/<output>); harmless pre-existing
                // markup mistake, kept as-is rather than fixed here.
                htmlFor="basic"
                onClick={() => {
                  setCredentials({ ...credentials, eventMode: "online" });
                }}
              >
                <input checked type="radio" name="plan" id="basic" />
                <div className="plan-content">
                  <img
                    loading="lazy"
                    src="https://ismailvtl-images-project.vercel.app/life-saver-img.svg"
                    alt=""
                  />
                  <div className="plan-details">
                    <span>Online</span>
                    <p>
                      Recommended for smaller organizations, with limited
                      budget.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="plan complete-plan"
                // @ts-expect-error — see comment on the "basic-plan" div above.
                htmlFor="complete"
                onClick={() => {
                  setCredentials({ ...credentials, eventMode: "offline" });
                }}
              >
                <input type="radio" id="complete" name="plan" />
                <div className="plan-content">
                  <img
                    loading="lazy"
                    src="https://ismailvtl-images-project.vercel.app/potted-plant-img.svg"
                    alt=""
                  />
                  <div className="plan-details">
                    <span>Offline</span>
                    <p>
                      Recommended for larger organizations, with more budget &
                      resources.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="createevent_flexbox">
            <div className="createevent_element">
              <label>
                <div>
                  Address Line 1 <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className="auth_input"
                placeholder={`Social Link for your event`}
              />
            </div>

            <div className="createevent_element">
              <label>
                <div>
                  Address Line 2 <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className="auth_input"
                placeholder={`Email Id for your event`}
              />
            </div>
          </div>

          <div className="createevent_flexbox">
            <div className="createevent_element">
              <label>
                <div>
                  City <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className="auth_input"
                placeholder={`Social Link for your event`}
              />
            </div>

            <div className="createevent_element">
              <label>
                <div>
                  State/Province <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className="auth_input"
                placeholder={`Email Id for your event`}
              />
            </div>
          </div>

          <div className="createevent_flexbox">
            <div className="createevent_element">
              <label>
                <div>
                  Country of establishment <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line1}
                onChange={handleChange("line1")}
                className="auth_input"
                placeholder={`Social Link for your event`}
              />
            </div>

            <div className="createevent_element">
              <label>
                <div>
                  Pincode / Zipcode <span>*</span>
                </div>
              </label>
              <input
                value={credentials?.address?.line2}
                onChange={handleChange("line2")}
                className="auth_input"
                placeholder={`Email Id for your event`}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
