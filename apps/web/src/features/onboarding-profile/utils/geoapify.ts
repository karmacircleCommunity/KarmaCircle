import type { GeoapifyAddressResult } from "../types";

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY as
  | string
  | undefined;

const AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

/** Whether the address question should offer autocomplete at all. Checked
 *  before rendering the Combobox, so a dev/CI environment with no key just
 *  gets the plain text field this replaced — no error, no broken UI. */
export function isAddressAutocompleteConfigured(): boolean {
  return Boolean(GEOAPIFY_API_KEY);
}

/**
 * One request, one array of results — no script to load, no session to
 * manage, unlike the Google Places version this replaced. Scoped to
 * India (`filter=countrycode:in`) to match the rest of this app's
 * location data (`@statics/IndiaCities`/`IndiaStates`) and to keep
 * irrelevant global matches from burning the free tier's daily credits.
 */
export async function fetchAddressSuggestions(
  text: string,
): Promise<GeoapifyAddressResult[]> {
  if (!GEOAPIFY_API_KEY || !text.trim()) return [];

  const url = new URL(AUTOCOMPLETE_URL);
  url.searchParams.set("text", text);
  url.searchParams.set("filter", "countrycode:in");
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", GEOAPIFY_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Geoapify autocomplete failed: ${response.status}`);
  }

  const data = (await response.json()) as { results?: GeoapifyAddressResult[] };
  return data.results ?? [];
}

/**
 * Maps one suggestion onto this flow's address fields. `housenumber` +
 * `street` become `line1` (`"14 MG Road"`, matching the placeholder the
 * plain-text version of this field already used) — Geoapify has no
 * separate apartment/unit field the way Google's `subpremise` was, so
 * `line2` is left for the person to fill in by hand, same as before this
 * feature existed. `city` falls back to `county` — some addresses in
 * Geoapify's OpenStreetMap-sourced data carry one but not the other.
 */
export function addressResultToFields(result: GeoapifyAddressResult): {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
} {
  return {
    line1: [result.housenumber, result.street].filter(Boolean).join(" "),
    line2: "",
    city: result.city || result.county || "",
    state: result.state ?? "",
    country: result.country ?? "",
    pincode: result.postcode ?? "",
  };
}
