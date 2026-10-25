import { useRef, useState } from "react";
import type { ComboboxOption } from "@components/inputs/Combobox";
import type { GeoapifyAddressResult } from "../types";
import { addressResultToFields, fetchAddressSuggestions } from "../utils/geoapify";

const DEBOUNCE_MS = 300;

export interface AddressAutocompleteFill {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

/**
 * Backs the "Address line 1" field's `Combobox` with Geoapify suggestions
 * instead of a static list.
 *
 * Debounced — Geoapify's free tier burns through its daily credits fast
 * if a request fires on every keystroke (one autocomplete request = one
 * credit), and nothing here needs sub-300ms responsiveness. Unlike the
 * Google Places version this replaced, a single autocomplete request
 * already returns full structured address fields per result — there's no
 * separate "fetch place details" round trip, so `pick()` is synchronous.
 */
export function useAddressAutocomplete(
  onFill: (fill: AddressAutocompleteFill) => void,
) {
  const [suggestions, setSuggestions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const search = (input: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const id = ++requestId.current;
      setLoading(true);

      try {
        const results = await fetchAddressSuggestions(input);

        // A later keystroke's request may resolve before this one — drop a
        // stale result rather than flashing an out-of-date list.
        if (id !== requestId.current) return;

        setSuggestions(
          results
            .filter((result) => result.formatted)
            .map((result) => ({
              value: result.formatted as string,
              label: result.formatted as string,
              data: result,
            })),
        );
      } catch {
        // A failed/unconfigured lookup just leaves the field as plain
        // text for this keystroke — same fallback as no key being set at
        // all, not a visible error.
        setSuggestions([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const pick = (option: ComboboxOption) => {
    setSuggestions([]);
    if (!option.data) return;
    onFill(addressResultToFields(option.data as GeoapifyAddressResult));
  };

  return { suggestions, loading, search, pick };
}
