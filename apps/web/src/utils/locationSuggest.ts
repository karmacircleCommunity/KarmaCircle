import { INDIA_STATES } from "@statics/IndiaStates";

/**
 * Typeahead over India's cities and states, plus "where am I" resolved
 * against the same list.
 *
 * The whole point of this module is that it answers both questions without
 * a network call. The city list ships with the app (`@statics/IndiaCities`,
 * dynamically imported), so suggestions are instant and work offline, there
 * is no key to rotate and no per-keystroke quota to blow through, and the
 * browser's coordinates are matched locally rather than posted to a
 * geocoder - a location the user shares to fill in a form field should not
 * also become a request to somebody else's server.
 */

/** One city, decoded from a row of `INDIA_CITIES_PACKED`. */
export interface CitySuggestion {
  city: string;
  state: string;
  lat: number;
  lon: number;
  /**
   * Thousands of people, `0` where the place is too small to appear in the
   * population source. Used to order equally-good matches and never shown -
   * see the note in `@statics/IndiaCities` on why the list needs it at all.
   */
  population: number;
  /** `city` normalized once at load, so ranking never re-normalizes it. */
  key: string;
}

/**
 * Casefolds and strips accents and punctuation, so "Puducherry" is found by
 * "pondi"-style typing habits at least as far as case and hyphens go, and
 * "Thiruvananthapuram" isn't missed over a stray space.
 *
 * NFD + combining-mark strip is what handles the accented spellings that
 * appear in the source data; the second replace drops everything that isn't
 * a letter, a digit or a single separating space.
 */
export const normalizeLocation = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

let cities: CitySuggestion[] | null = null;
let loading: Promise<CitySuggestion[]> | null = null;

/**
 * Loads and decodes the packed city list, once per session.
 *
 * The in-flight promise is cached alongside the result so that the two
 * things that race to call this - the field being focused and the "use my
 * location" button being pressed - share one chunk fetch instead of each
 * starting their own.
 */
export const loadIndiaCities = (): Promise<CitySuggestion[]> => {
  if (cities) return Promise.resolve(cities);
  if (loading) return loading;

  loading = import("@statics/IndiaCities")
    .then(({ INDIA_CITIES_PACKED }) => {
      cities = INDIA_CITIES_PACKED.split("\n").map((row) => {
        const [city, stateIndex, lat, lon, population] = row.split("|");
        return {
          city,
          state: INDIA_STATES[Number(stateIndex)],
          lat: Number(lat),
          lon: Number(lon),
          population: Number(population) || 0,
          key: normalizeLocation(city),
        };
      });
      return cities;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
};

/**
 * How well a candidate answers what has been typed, lower being better.
 * `null` means it doesn't answer it at all and shouldn't be offered.
 *
 * Three tiers rather than a fuzzy score: someone typing "kol" wants
 * Kolkata at the top, not Gangtok-because-it-contains-o-l. A match at the
 * start of the name beats one at the start of a later word ("Nagar" finding
 * "Ahmednagar"), which beats a match buried mid-word.
 */
const rank = (key: string, query: string): number | null => {
  if (key.startsWith(query)) return 0;
  if (key.includes(` ${query}`)) return 1;
  if (key.includes(query)) return 2;
  return null;
};

/** How many suggestions a field offers at once. */
export const SUGGESTION_LIMIT = 7;

/**
 * The cities that answer `query`, best first.
 *
 * Within a tier the order is: the state already on the form, then size,
 * then the shorter name. Size is doing the real work - a prefix like "kol"
 * matches nine places and only one of them is what almost anybody typing it
 * means, and sorting by name length instead puts Kolar and Kollam above
 * Kolkata. It is a tie-break inside a tier and never across one, so a
 * village is still found the moment enough of its name is typed to reach a
 * better tier than the city.
 *
 * `preferState` is the state already filled in on the form. It only ever
 * reorders - a city outside the named state is still offered, because the
 * more likely reading of a mismatch is that the state field is the one
 * that's wrong.
 */
export const suggestCities = (
  all: CitySuggestion[],
  query: string,
  preferState?: string,
): CitySuggestion[] => {
  const needle = normalizeLocation(query);
  if (!needle) return [];

  const preferred = normalizeLocation(preferState ?? "");

  return all
    .map((entry) => ({ entry, score: rank(entry.key, needle) }))
    .filter(
      (scored): scored is { entry: CitySuggestion; score: number } =>
        scored.score !== null,
    )
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;

      if (preferred) {
        const aPreferred = normalizeLocation(a.entry.state) === preferred;
        const bPreferred = normalizeLocation(b.entry.state) === preferred;
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      }

      if (a.entry.population !== b.entry.population) {
        return b.entry.population - a.entry.population;
      }

      // Shorter first, so "Nagpur" outranks "Nagpur Rural" for "nagpur".
      if (a.entry.city.length !== b.entry.city.length) {
        return a.entry.city.length - b.entry.city.length;
      }
      return a.entry.city.localeCompare(b.entry.city);
    })
    .slice(0, SUGGESTION_LIMIT)
    .map((scored) => scored.entry);
};

/** The same ranking over the 36 state and union-territory names. */
export const suggestStates = (query: string): string[] => {
  const needle = normalizeLocation(query);
  if (!needle) return [];

  return INDIA_STATES.map((state) => ({
    state,
    score: rank(normalizeLocation(state), needle),
  }))
    .filter(
      (scored): scored is { state: string; score: number } =>
        scored.score !== null,
    )
    .sort((a, b) => a.score - b.score || a.state.localeCompare(b.state))
    .slice(0, SUGGESTION_LIMIT)
    .map((scored) => scored.state);
};

/**
 * Great-circle distance in kilometres.
 *
 * Haversine rather than a flat Pythagorean approximation because India
 * spans roughly 8°N to 37°N, where a degree of longitude is 110km at the
 * bottom and 88km at the top - close enough to matter when the answer is
 * "which of these two neighbouring towns".
 */
const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Beyond this, the nearest listed city isn't an answer to "where are you".
 * 150km is wide enough to cover somewhere genuinely rural whose nearest
 * listed town is a long way off, and narrow enough that a browser reporting
 * a coarse or plainly wrong fix (a VPN exit, a stale cell estimate) is
 * refused rather than dressed up as a confident answer.
 */
const MAX_MATCH_KM = 150;

/**
 * Roughly how far a city of this size extends from the single point the
 * list stores for it.
 *
 * Every entry is one coordinate, which is a fiction for anywhere large:
 * Kolkata is one point, and so is each of the dozen suburbs inside it.
 * Strict nearest-point wins on that data will answer "Dam Dam" to someone
 * standing in Salt Lake and "Andheri" to someone in Mumbai - each factually
 * the closest stored point, neither the answer to "where are you based".
 *
 * So distance is offset by a reach that grows with the log of population:
 * a couple of kilometres for a place too small to be measured, about 30 for
 * a metro, and the capped ceiling keeps the biggest cities from swallowing
 * genuinely separate towns on their outskirts. A named suburb still wins
 * when the fix is actually in it and the metro's centre is far away.
 */
const REACH_CAP_KM = 30;
const reachKm = (population: number) =>
  Math.min(REACH_CAP_KM, 2 + 8 * Math.log10(1 + population));

/**
 * The listed city a coordinate is most plausibly *in*, or `null` when
 * nothing is close enough for the question to have an answer.
 *
 * The `MAX_MATCH_KM` cut is measured on true distance, not on the adjusted
 * score, so the reach above can reorder candidates but can never reach out
 * and claim a coordinate that isn't near anything.
 */
export const nearestCity = (
  all: CitySuggestion[],
  lat: number,
  lon: number,
): CitySuggestion | null => {
  let best: CitySuggestion | null = null;
  let bestScore = Infinity;
  let bestKm = Infinity;

  for (const entry of all) {
    const km = distanceKm(lat, lon, entry.lat, entry.lon);
    if (km > MAX_MATCH_KM) continue;

    const score = km - reachKm(entry.population);
    if (score < bestScore) {
      bestScore = score;
      bestKm = km;
      best = entry;
    }
  }

  return bestKm <= MAX_MATCH_KM ? best : null;
};

/**
 * What went wrong, at the granularity the user can act on.
 *
 * Split this finely because the remedies are genuinely different and a
 * single "couldn't work out where you are" sends someone to look in the
 * wrong place. In particular `denied` and `unavailable` feel identical from
 * the outside and are fixed in two different settings screens: `denied` is
 * this site's permission, in the browser; `unavailable` is the browser
 * being allowed to ask and still coming back empty, which on a Mac is
 * almost always the operating system's own Location Services being off for
 * that browser. Someone who has just pressed Allow and been told "couldn't
 * work out where you are" will otherwise press Allow again.
 */
export type LocateFailure =
  | "unsupported"
  | "insecure"
  | "denied"
  | "unavailable"
  | "timeout"
  | "no-match";

/**
 * Which of the two answers below produced a match.
 *
 * Surfaced rather than hidden because the two are not the same claim.
 * `device` is where the machine says it is; `network` is where the internet
 * connection appears to come from, which is the right town on a home line
 * and the wrong country on a VPN. The screen labels them differently so a
 * coarse guess is offered as a guess and gets corrected instead of shipped.
 */
export type LocateSource = "device" | "network";

/** A successful locate: the city, and how it was arrived at. */
export interface LocateHit {
  match: CitySuggestion;
  source: LocateSource;
}

const FAST_ATTEMPT: PositionOptions = {
  // The answer is rounded to the nearest town either way, so there is
  // nothing to gain from waking the GPS radio and a wait to lose. A cached
  // fix from the last five minutes is more than good enough.
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

const PATIENT_ATTEMPT: PositionOptions = {
  // Only ever reached after the fast path failed, so the trade is reversed:
  // the cheap providers have already had their go, and a slower, more
  // insistent one is the last thing between here and telling the user no.
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 0,
};

const getPosition = (options: PositionOptions) =>
  new Promise<GeolocationPosition | GeolocationPositionError>((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, resolve, options);
  });

const isError = (
  result: GeolocationPosition | GeolocationPositionError,
): result is GeolocationPositionError => "code" in result;

/**
 * Where the connection appears to come from, when the device won't say.
 *
 * The device path fails more often than it looks like it should. A desktop
 * browser can hold a granted permission and still answer "position
 * unavailable" indefinitely - the operating system's location service is
 * off for that browser, or the browser ships without the network-location
 * backend that Chrome has, and no amount of pressing Allow changes either.
 * That case is the whole reason this exists: without it the button is a
 * dead end for anyone whose browser is in that state, and the screen's only
 * remaining move is to explain a settings path and hope.
 *
 * Two providers, both keyless and both HTTPS, because a free endpoint that
 * is rate-limited or down should cost a second of latency rather than the
 * answer. Nothing about the user is sent: the request carries no body and
 * no identifier, and the address it is answered from is the same one every
 * other request from this browser already reveals. The coordinates that
 * come back are still matched against the bundled list here, so no city
 * choice is ever posted anywhere.
 */
/**
 * What is read back out. Both providers happen to name these fields the
 * same way and both are typed as unknown regardless: this is a third
 * party's JSON, so it is a claim about the response rather than a fact
 * about it, and `Number()` plus the finite check below is what actually
 * decides whether it can be trusted.
 */
type IpLocation = { latitude?: unknown; longitude?: unknown };

const IP_PROVIDERS = [
  "https://ipwho.is/",
  "https://get.geojs.io/v1/ip/geo.json",
];

/** Long enough for a slow line, short enough to stay under a press. */
const IP_TIMEOUT_MS = 6_000;

const locateByIp = async (): Promise<[number, number] | null> => {
  for (const url of IP_PROVIDERS) {
    try {
      const response = await fetch(url, {
        // The endpoints are public and the answer is per-IP, so a cookie
        // would only ever be an unnecessary thing to leak.
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(IP_TIMEOUT_MS),
      });
      if (!response.ok) continue;

      const data = (await response.json()) as IpLocation;
      const lat = Number(data?.latitude);
      const lon = Number(data?.longitude);
      // A provider that can't place an address answers with nulls rather
      // than an error, which arrive here as NaN.
      if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
    } catch {
      // Timed out, blocked, offline, or malformed - all of them mean "ask
      // the next one", and the last one failing means the caller reports
      // the device failure it already had.
    }
  }

  return null;
};

/**
 * Asks the browser where it is and turns that into a city and state.
 *
 * Three attempts in a deliberate order. First a cheap, cached-fix request;
 * then a slower insistent one, because a desktop browser that has just been
 * granted permission often answers the first with "position unavailable"
 * while its location provider is still cold and succeeds on a second. Then,
 * if the device still has nothing, the connection is asked instead - see
 * `locateByIp`, and note that the result is labelled as a guess rather than
 * passed off as the device's own answer.
 *
 * A permission refusal ends it. It is neither retried nor routed around:
 * asking twice for something just declined is what gets a site's prompts
 * blocked outright, and answering a refusal with an IP lookup is worse - it
 * takes "no" as an invitation to find another way.
 */
export const locateCity = async (): Promise<LocateHit | LocateFailure> => {
  const toHit = async (
    lat: number,
    lon: number,
    source: LocateSource,
  ): Promise<LocateHit | LocateFailure> => {
    const all = await loadIndiaCities();
    const match = nearestCity(all, lat, lon);
    return match ? { match, source } : "no-match";
  };

  const viaNetwork = async (
    // What to report if the connection can't answer either. The device's
    // own failure is the more actionable of the two, so it survives.
    deviceFailure: LocateFailure,
  ): Promise<LocateHit | LocateFailure> => {
    const coords = await locateByIp();
    if (!coords) return deviceFailure;

    try {
      return await toHit(coords[0], coords[1], "network");
    } catch {
      return deviceFailure;
    }
  };

  // Both of these are dead ends for the device path but say nothing about
  // the connection, so they go straight to it rather than giving up.
  if (!navigator.geolocation) return viaNetwork("unsupported");

  // Every browser refuses geolocation outside a secure context, and reports
  // it as an ordinary permission failure - which would have this send the
  // user to a browser setting that isn't the problem. localhost counts as
  // secure, so this only ever fires on a real host served over http.
  if (!window.isSecureContext) return viaNetwork("insecure");

  let result = await getPosition(FAST_ATTEMPT);

  if (isError(result) && result.code !== result.PERMISSION_DENIED) {
    result = await getPosition(PATIENT_ATTEMPT);
  }

  if (isError(result)) {
    // The browser's own message names the real cause and is the only way to
    // tell, from a bug report, which of these two it was.
    console.warn(
      `[locateCity] geolocation failed (code ${result.code}): ${result.message}`,
    );

    if (result.code === result.PERMISSION_DENIED) return "denied";
    return viaNetwork(result.code === result.TIMEOUT ? "timeout" : "unavailable");
  }

  try {
    return await toHit(
      result.coords.latitude,
      result.coords.longitude,
      "device",
    );
  } catch {
    // The fix arrived but the list it would be matched against did not.
    return "unavailable";
  }
};
