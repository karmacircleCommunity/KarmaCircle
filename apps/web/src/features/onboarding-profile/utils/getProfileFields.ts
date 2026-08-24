import {
  addressFields,
  brandingFields,
  mandatoryFields,
} from "@statics/Constants";
import type { ProfileFieldsInfo } from "../types";

/** Not exported — see SPEC.md's correction to the centralized docs,
 * which describe this as independently importable. It isn't. */
function getMissingElements(info?: ProfileFieldsInfo): string[] {
  const missing: string[] = [];

  if (info?.userType === "organization") {
    brandingFields.forEach((field) => {
      if (info[field] === undefined) {
        missing.push(field);
      }
    });
  }

  return missing;
}

function getEditableFields(info?: ProfileFieldsInfo): string[] {
  return info?.userType === "organization"
    ? [...mandatoryFields, ...brandingFields, ...addressFields]
    : [...mandatoryFields, ...addressFields];
}

/**
 * Not imported by any component today — scaffolding for a hypothetical
 * generic/dynamic profile-form component (see SPEC.md).
 */
export default function getProfileFields(info?: ProfileFieldsInfo): string[] {
  return info?.userType === "organization" && (info?.tagLine === "" || !info?.tagLine)
    ? getMissingElements(info)
    : getEditableFields(info);
}
