import { useEffect, useMemo, useState } from "react";
import Combobox from "@components/inputs/Combobox";
import type { ComboboxOption } from "@components/inputs/Combobox";
import SetupFieldLabel from "@components/setup/SetupFieldLabel";
import type { LocateCity } from "@hooks/useLocateCity";
import {
  loadIndiaCities,
  suggestCities,
  suggestStates,
} from "@utils/locationSuggest";
import type { CitySuggestion, LocateFailure } from "@utils/locationSuggest";
import { FIELD_CY, FIELD_SPECS } from "../../constants/profileSetup";
import type { ProfileSetupForm } from "../../types";

/**
 * "Where are you based?" — the profile-setup fork of organizations'
 * `SetupLocationFields.tsx`. Same behavior (suggestions from the bundled
 * India city/state list, picking a city fills the state, "use my
 * location"), forked rather than shared because the two components are
 * typed against each flow's own form/field-spec shape — see SPEC.md and
 * `docs/specs/organizations.md`'s "Where are you based?" section for the
 * full behavior this mirrors.
 */
type ProfileSetupLocationFieldsProps = {
  form: ProfileSetupForm;
  setField: (key: "city" | "state", value: string) => void;
  registerFirstInput: (element: HTMLInputElement | null) => void;
  inputClassName: string;
  locate: LocateCity;
};

const onMac = () =>
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

const failureCopy = (failure: LocateFailure): string => {
  switch (failure) {
    case "unsupported":
      return "This browser can't share a location. Type your city instead.";
    case "insecure":
      return "Sharing a location needs a secure connection. Type your city instead.";
    case "denied":
      return "Location is blocked for this site. Allow it from the icon in the address bar, then try again.";
    case "unavailable":
      return onMac()
        ? "Your browser was allowed, but neither the Mac nor your connection would give a location. Turn this browser on under System Settings › Privacy & Security › Location Services, then try again - or just type your city."
        : "Your browser was allowed, but neither it nor your connection would give a location. Check that location services are switched on for it in your system settings, then try again - or just type your city.";
    case "timeout":
      return "That took too long to answer. Try again, or type your city.";
    case "no-match":
      return "Nowhere in the list is close enough to you. Type your city instead.";
  }
};

const ProfileSetupLocationFields = ({
  form,
  setField,
  registerFirstInput,
  inputClassName,
  locate,
}: ProfileSetupLocationFieldsProps) => {
  const [cities, setCities] = useState<CitySuggestion[] | null>(null);
  const { failure, filled } = locate;

  useEffect(() => {
    let live = true;
    loadIndiaCities()
      .then((loaded) => {
        if (live) setCities(loaded);
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, []);

  const cityOptions = useMemo<ComboboxOption[]>(
    () =>
      cities
        ? suggestCities(cities, form.city, form.state).map((entry) => ({
            value: entry.city,
            label: entry.city,
            hint: entry.state,
          }))
        : [],
    [cities, form.city, form.state],
  );

  const stateOptions = useMemo<ComboboxOption[]>(
    () =>
      suggestStates(form.state).map((name) => ({ value: name, label: name })),
    [form.state],
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <SetupFieldLabel htmlFor="profile-city-input">
            {FIELD_SPECS.city.label}
          </SetupFieldLabel>
          <Combobox
            id="profile-city-input"
            value={form.city}
            onChange={(value) => setField("city", value)}
            onPick={(option) => {
              if (option.hint) setField("state", option.hint);
              locate.clear();
            }}
            options={cityOptions}
            maxLength={FIELD_SPECS.city.maxLength}
            placeholder="Start typing…"
            dataCy={FIELD_CY.city}
            inputRef={registerFirstInput}
            className={`${inputClassName} text-body-lg`}
            noun="cities"
          />
        </div>

        <div className="flex flex-col gap-1">
          <SetupFieldLabel htmlFor="profile-state-input">
            {FIELD_SPECS.state.label}
          </SetupFieldLabel>
          <Combobox
            id="profile-state-input"
            value={form.state}
            onChange={(value) => setField("state", value)}
            options={stateOptions}
            maxLength={FIELD_SPECS.state.maxLength}
            dataCy={FIELD_CY.state}
            className={`${inputClassName} text-body-lg`}
            noun="states"
          />
        </div>
      </div>

      {(failure || filled) && (
        <p
          role="status"
          data-cy={failure ? "profile-locate-error" : "profile-locate-filled"}
          className={`mt-4 mb-0 max-w-prose font-outfit text-caption leading-relaxed ${
            failure ? "text-ink/55" : "text-ink/45"
          }`}
        >
          {failure
            ? failureCopy(failure)
            : filled?.source === "network"
              ? `Your device wouldn't say, so this is from your connection. Change it if that's not right.`
              : "Filled in from your location."}
        </p>
      )}
    </div>
  );
};

export default ProfileSetupLocationFields;
