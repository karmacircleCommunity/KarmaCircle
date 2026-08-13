import { STATUSCODE } from "@statics/Constants.js";
import { completeProfileApiCall } from "@services/MilanApi.js";
import { showSuccessToast } from "@utils/Toasts.js";
import { useState } from "react";

const useProfileCompletion = () => {
  const [errors, setErrors] = useState({});

  const [credentials, setCredentials] = useState({
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

  const handleSetDefaultValues = (profileData) => {
    console.log("🚀 ~ handleSetDefaultValues ~ profileData:", profileData);
    setCredentials({
      description: profileData?.description || "",
      coverImage: profileData?.coverImage || "",
      address: {
        line1: profileData?.address?.line1 || "",
        line2: profileData?.address?.line2 || "",
        city: profileData?.address?.city || "",
        state: profileData?.address?.state || "",
        country: profileData?.address?.country || "",
        pincode: profileData?.address?.pincode || "",
      },
    });
  };

  const validateForm = async (updatedCredentials) => {
    const newErrors = {};

    // Check required fields for top-level fields
    const requiredFields = ["description"];
    requiredFields.forEach((field) => {
      if (
        !updatedCredentials[field] ||
        updatedCredentials[field].trim() === ""
      ) {
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
        !updatedCredentials.address[field] ||
        updatedCredentials.address[field].trim() === ""
      ) {
        newErrors[`address.${field}`] = `${field} is required.`;
      }
    });

    // Description length validation
    if (
      updatedCredentials.description &&
      updatedCredentials.description.length > 500
    ) {
      newErrors.description = "Description cannot be more than 500 characters.";
    }

    if (
      updatedCredentials.description &&
      updatedCredentials.description.length < 100
    ) {
      newErrors.description = "Description cannot be less than 100 characters.";
    }

    // Pincode validation
    if (
      updatedCredentials.address.pincode &&
      isNaN(updatedCredentials.address.pincode)
    ) {
      newErrors["address.pincode"] = "Pincode must be a valid number.";
    }

    setErrors(newErrors);

    const data = await completeProfileApiCall({
      credentials: {
        ...updatedCredentials,
        config: {
          hasCompletedProfile: true,
        },
      },
    });

    if (data.status === STATUSCODE.OK) {
      showSuccessToast(data?.data?.message);
      return;
    }

    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field) => {
    setErrors((prevErrors) => {
      const { [field]: ignored, ...rest } = prevErrors;
      return rest;
    });
  };

  const handleChange = (field) => (event) => {
    const updatedCredentials = { ...credentials };

    if (field === "description") {
      updatedCredentials.description = event.target.value;
    } else {
      // For address fields, update the address object inside the credentials
      updatedCredentials.address[field] = event.target.value;
    }

    setCredentials(updatedCredentials);
  };

  return {
    credentials,
    errors,
    handleChange,
    validateForm,
    clearError,
    handleResetFields,
    handleSetDefaultValues,
  };
};

export default useProfileCompletion;
