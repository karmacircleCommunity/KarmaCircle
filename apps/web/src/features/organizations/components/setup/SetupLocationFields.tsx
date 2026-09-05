import { useEffect, useMemo, useState } from "react";
import Combobox from "@components/inputs/Combobox";
import type { ComboboxOption } from "@components/inputs/Combobox";
import {
  loadIndiaCities,
  suggestCities,
  suggestStates,
} from "@utils/locationSuggest";
import type { CitySuggestion, LocateFailure } from "@utils/locationSuggest";
import type { LocateCity } from "../../hooks/useLocateCity";
import { FIELD_CY, FIELD_SPECS } from "../../constants/organizationSetup";
import type {
  OrganizationSetupForm,
  OrganizationSetupQuestion,
} from "../../types";
import SetupFieldLabel from "./SetupFieldLabel";

/**
 * "Where are you based?" - the one grouped question that knows what its
 * answers are.
 *
 * Two thousand-odd Indian towns are a closed enough set to suggest from and
 * an open enough one that nobody should be held to it, so both fields stay
 * plain text and the list is only ever a shortcut. Picking a city fills the
 * state as well, because that pairing is a fact about the city and not
 * something the person should have to look up; typing a state first only
 * reorders the city matches, so "Rajpur" resolves to the right one of six.
 *
 * The whole thing runs off a list that ships with the app. No geocoding
 * key, no request per keystroke, nothing to fall over when the API is slow,
 * and - for the "use my location" shortcut - coordinates that are compared
 * against that same bundled list in the browser rather than sent anywhere.
 * The one request that leaves is the fallback for a device that won't give
 * a location at all, and it asks where the connection is rather than
 * telling anyone where the user is. See `@utils/locationSuggest`.
 */
type SetupLocationFieldsProps = {
  question: OrganizationSetupQuestion;
  form: OrganizationSetupForm;
  setField: (key: "city" | "state", value: string) => void;
  /** Hands the city input up so the flow can focus it as the screen lands. */
  registerFirstInput: (element: HTMLInputElement | null) => void;
  /** The underline styling shared with every other field in the flow. */
  inputClassName: string;
  /**
   * The "use my current location" state. The button that drives it lives up
   * beside the headline (`SetupLocateButton`); what it has to say lands
   * here, under the fields it fills.
   */
  locate: LocateCity;
};

/**
 * Where a Mac hides the switch that causes the `unavailable` case.
 *
 * Named for the platform because the remedy is a path through a specific
 * settings app, and a generic "check your system settings" is the kind of
 * advice that is technically true and helps nobody. Sniffed rather than
 * feature-detected because there is nothing to detect: this is about where
 * a human should click, not about what the browser can do.
 */
const onMac = () =>
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

/**
 * What each failure says.
 *
 * Every line names the thing to go and change, because the one this screen
 * exists to handle - permission granted, still no fix - is invisible from
 * inside the browser. Someone who has just pressed Allow and is told
 * "couldn't work out where you are" presses Allow again; they need to be
 * pointed at the operating system instead.
 */
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

const SetupLocationFields = ({
  question,
  form,
  setField,
  registerFirstInput,
  inputClassName,
  locate,
}: SetupLocationFieldsProps) => {
  const [cities, setCities] = useState<CitySuggestion[] | null>(null);
  const { failure, filled } = locate;

  // Fetched on arrival rather than on the first keystroke. This component
  // only mounts when someone is actually on the location question, which
  // makes "they are about to type a city" as certain as it gets - and a
  // suggestion list that appears on the first letter is the difference
  // between a field that helps and one that catches up.
  useEffect(() => {
    let live = true;
    loadIndiaCities()
      .then((loaded) => {
        if (live) setCities(loaded);
      })
      // A failed chunk load costs the suggestions, not the answer: both
      // fields keep working as ordinary text inputs.
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

  const cityRequired = question.requiredFields.includes("city");
  const cityMax = FIELD_SPECS.city?.maxLength;
  const stateMax = FIELD_SPECS.state?.maxLength;

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <SetupFieldLabel htmlFor="org-city-input" required={cityRequired}>
            {FIELD_SPECS.city?.label}
          </SetupFieldLabel>
          <Combobox
            id="org-city-input"
            value={form.city}
            onChange={(value) => setField("city", value)}
            // The state comes with the city, which is the point: it is a
            // fact about the place, not a second question.
            onPick={(option) => {
              if (option.hint) setField("state", option.hint);
              locate.clear();
            }}
            options={cityOptions}
            maxLength={cityMax}
            placeholder="Start typing…"
            dataCy={FIELD_CY.city}
            inputRef={registerFirstInput}
            className={`${inputClassName} text-body-lg`}
            noun="cities"
          />
        </div>

        <div className="flex flex-col gap-1">
          <SetupFieldLabel htmlFor="org-state-input">
            {FIELD_SPECS.state?.label}
          </SetupFieldLabel>
          <Combobox
            id="org-state-input"
            value={form.state}
            onChange={(value) => setField("state", value)}
            options={stateOptions}
            maxLength={stateMax}
            dataCy={FIELD_CY.state}
            className={`${inputClassName} text-body-lg`}
            noun="states"
          />
        </div>
      </div>

      {/* One slot for whatever the last press had to say - the button
          itself lives up beside the headline (`SetupLocateButton`), because
          a shortcut belongs before the fields and its result belongs after
          them. `max-w-prose` because the useful failures are a sentence and
          a settings path, and a line that long running the full width of
          the panel reads as an error page rather than a note under a
          field. */}
      {(failure || filled) && (
        <p
          role="status"
          data-cy={failure ? "org-locate-error" : "org-locate-filled"}
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

export default SetupLocationFields;
