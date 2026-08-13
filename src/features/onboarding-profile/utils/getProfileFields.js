import {
  addressFields,
  brandingFields,
  mandatoryFields,
} from "@statics/Constants.js";

function getMissingElements(info) {
  const missing = [];

  if (info?.userType === "club") {
    brandingFields.forEach((field) => {
      if (info[field] === undefined) {
        missing.push(field);
      }
    });
  }

  return missing;
}

function getEditableFields(info) {
  return info?.userType === "club"
    ? [...mandatoryFields, ...brandingFields, ...addressFields]
    : [...mandatoryFields, ...addressFields];
}

export default function getProfileFields(info) {
  return info?.userType === "club" && (info?.tagLine === "" || !info?.tagLine)
    ? getMissingElements(info)
    : getEditableFields(info);
}
