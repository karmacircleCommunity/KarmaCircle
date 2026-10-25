import type { MyProfile, ProfileSetupForm } from "../types";

export const EMPTY_PROFILE_SETUP_FORM: ProfileSetupForm = {
  description: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

export function toProfileSetupForm(user?: MyProfile): ProfileSetupForm {
  return {
    description: user?.description ?? "",
    line1: user?.address?.line1 ?? "",
    line2: user?.address?.line2 ?? "",
    city: user?.address?.city ?? "",
    state: user?.address?.state ?? "",
    country: user?.address?.country ?? "",
    pincode: user?.address?.pincode ?? "",
  };
}

/**
 * The whole PATCH body, sent on every save.
 *
 * Unlike organizations' `toStepPayload` — which sends only one step's
 * fields, and treats a blank optional field as "untouched" rather than
 * "clear this", because several separate steps share one record — this
 * flow has a single form that is always fully seeded from the record
 * before anything is edited (`toProfileSetupForm`, called once the record
 * arrives). So every save sends the complete, current state of every
 * field, blank or not: a field left blank here really does mean "leave
 * this empty," never "I haven't gotten to this yet."
 *
 * This matters because the backend's `address` is one `$set` on the whole
 * subdocument (`user.service.ts`'s `updateProfile`), not a per-key merge —
 * omitting a field here would silently wipe whatever that field held
 * before, so every address field is always included.
 */
export function toProfileSetupPayload(form: ProfileSetupForm) {
  return {
    description: form.description.trim(),
    address: {
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      pincode: form.pincode.trim(),
    },
  };
}
