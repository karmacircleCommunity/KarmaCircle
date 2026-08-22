import { STATUSCODE } from "@statics/Constants";
import { updateUserProfile } from "@services/MilanApi";
import { showSuccessToast } from "@utils/Toasts";
import clsx from "clsx";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { Button } from "@components";
import type {
  Address,
  ProfileCompletionErrors,
  ProfileUpdateProps,
} from "../types";

const inputClasses = clsx(
  "block w-full appearance-none rounded-md border border-input-border bg-white bg-clip-padding px-3 py-1.5 font-outfit text-body leading-normal font-normal text-ink transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-body! focus:border-black/[51%] focus:shadow-none focus:outline-none",
);

interface ProfileUpdateCredentials {
  description: string;
  name: string;
  coverImage: string;
  address: Address;
}

/**
 * Modal: profile editing, triggered from `Dashboard.tsx`. Fully
 * separate, parallel implementation of the same shape as
 * `useProfileCompletion.ts` — not a reuse of it. See SPEC.md.
 */
const ProfileUpdate = ({
  setOpenModal,
  refreshProfileData,
  profileData,
}: ProfileUpdateProps) => {
  const [credentials, setCredentials] = useState<ProfileUpdateCredentials>({
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
  const [errors, setErrors] = useState<ProfileCompletionErrors>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedProfilePicture, setUploadedProfilePicture] = useState<
    string | null
  >(null);

  const handleChange =
    (field: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const updatedCredentials = { ...credentials };

      if (field === "description" || field === "name") {
        (updatedCredentials as unknown as Record<string, string>)[field] =
          event.target.value;
      } else {
        // For address fields, update the address object inside the credentials
        (updatedCredentials.address as unknown as Record<string, string>)[
          field
        ] = event.target.value;
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
    // Pre-existing bug, not introduced here: `name` is missing from this
    // reset object (copy-pasted from useProfileCompletion.ts's
    // handleResetFields, whose credentials shape never had a `name`
    // field to begin with) — closing and reopening this modal after a
    // reset would show a blank Organization Name. Kept as-is; see
    // SPEC.md.
    // @ts-expect-error — see comment above.
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
    const newErrors: ProfileCompletionErrors = {};

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
    if (
      credentials.address.pincode &&
      isNaN(Number(credentials.address.pincode))
    ) {
      newErrors["address.pincode"] = "Pincode must be a valid number.";
    }

    setErrors(newErrors);

    const data = await updateUserProfile({
      credentials,
    });

    // @ts-expect-error — pre-existing bug (see SPEC.md/known-issues.md):
    // `data` is `undefined` on a pure network failure (no HTTP response
    // at all), and this throws an uncaught TypeError rather than being
    // guarded with `?.`. Preserved as-is, out of scope for a types-only
    // pass.
    if (data.status === STATUSCODE.OK) {
      showSuccessToast(data?.data?.message);
      refreshProfileData();
      setOpenModal(false);
      return;
    }

    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="fixed inset-0 z-101 flex size-full items-center justify-center bg-black/80 backdrop-blur-[6px]">
      <div className="relative flex max-h-[80vh] min-h-100 w-[40vw] min-w-200 flex-col justify-between overflow-y-auto rounded-15px bg-white text-black max-[525px]:w-[89vw] max-[525px]:min-w-55">
        <div className="sticky top-0 z-10 bg-white px-4 py-2.5">
          <div className="flex items-center gap-4">
            <RxCross2
              className="mr-[1.2rem] size-5.75 cursor-pointer"
              onClick={() => {
                setOpenModal(false);
                handleResetFields();
              }}
            />
            <h1 className="mb-0 font-outfit text-2xl font-bold text-brand-secondary">
              {" "}
              Edit profile{" "}
            </h1>
            <Button
              type="submit"
              className="mt-0 ml-auto w-[15%] rounded-10px font-outfit"
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

        <form className="flex w-full flex-col gap-[1.2rem] p-4 font-outfit">
          <div className="relative flex w-full flex-col font-outfit">
            <div className="flex w-full flex-col items-start justify-center">
              <p className="mb-0.75 text-body-lg font-normal text-brand-secondary max-500px:text-body">
                Cover Image
              </p>

              <label
                htmlFor="dropzone_file"
                className="flex h-50 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors duration-300 hover:bg-surface-hover"
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Uploaded Preview"
                    className="size-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="mb-4 size-8 text-gray-500"
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

              <label
                htmlFor="dropzone_pfp"
                className="absolute top-55.75 left-16 flex size-25 -translate-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 object-cover transition-colors duration-300 hover:bg-surface-hover [&_svg]:mb-0!"
              >
                {uploadedProfilePicture ? (
                  <img
                    src={uploadedProfilePicture}
                    alt="Uploaded Preview"
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="mb-4 size-8 text-gray-500"
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

          <div className="relative mt-10 flex w-full flex-col font-outfit">
            <label>
              <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
                Organization Name{" "}
                <span className="text-sm text-red-600">*</span>
              </div>
            </label>
            <input
              value={credentials?.name}
              onChange={handleChange("name")}
              className={inputClasses}
              placeholder={`The name of your organization`}
            />
          </div>
          <div className={clsx("relative flex w-full flex-col font-outfit")}>
            <label>
              <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
                Organization Description{" "}
                <span className="text-sm text-red-600">*</span>
              </div>

              <span className="text-[13px] text-brand-secondary/[74%]">
                {credentials["description"]?.length || 0}/500
              </span>
            </label>
            <textarea
              value={credentials["description"]}
              name="description"
              onChange={handleChange("description")}
              className={`${inputClasses} h-25 max-500px:text-caption!`}
              placeholder={`Enter a meaningful description about your organization`}
            />
            {errors["description"] && (
              <span className="mt-1.25 text-body text-red-600">
                {errors["description"]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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

            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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
            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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

            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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
            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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

            <div className="relative flex w-full flex-col font-outfit">
              <label>
                <div className="mb-0.75 flex items-center justify-between text-body-lg font-normal text-brand-secondary max-500px:text-body">
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
        </form>
      </div>
    </div>
  );
};

export default ProfileUpdate;
