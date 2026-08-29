import adoptionSundayCover from "@assets/pictures/events/adoption-sunday.jpg";
import borewellWebinarCover from "@assets/pictures/events/borewell-maintenance-webinar.jpg";
import freeVetClinicCover from "@assets/pictures/events/free-vet-clinic-mushin.jpg";
import homeworkClubCover from "@assets/pictures/events/homework-club-new-term.jpg";
import libraryShelvingCover from "@assets/pictures/events/library-shelving-weekend.jpg";
import mangrovePlantingCover from "@assets/pictures/events/mangrove-planting-day.jpg";
import monsoonHealthCampCover from "@assets/pictures/events/monsoon-health-camp-ward-four.jpg";
import morningMovementCover from "@assets/pictures/events/morning-movement-class.jpg";
import nightKitchenCover from "@assets/pictures/events/night-kitchen-shift.jpg";
import nightShiftInductionCover from "@assets/pictures/events/night-shift-induction.jpg";
import solarLampInstallCover from "@assets/pictures/events/solar-lamp-install.jpg";
import weldingIntakeCover from "@assets/pictures/events/welding-intake-day.jpg";
import type { DirectoryEvent } from "../types";

/**
 * Sample content for the events directory.
 *
 * **None of this is fetched.** `services/Events.ts`'s `getEvents()` exists
 * and is still never called (see `docs/specs/events.md`). This file replaces
 * the twenty identical `"God Father Org"` objects that used to live inline
 * in `Events.tsx` - which were not even event-shaped, they were copies of
 * the organizations page's user records, and `EventCard` ignored them
 * anyway because it read no props at all.
 *
 * Every event here belongs to one of the twelve organizations in
 * `features/organizations/constants/organizationDirectory.ts`, and
 * `organizerUserName` is that organization's `userName`, so a card can link
 * to a profile that actually exists. Keep that true when adding entries.
 *
 * The record shape is deliberately the shape a real event record would
 * have, so wiring this up later is a `useSWR` swap plus a mapping function.
 * `startsAt` is a real ISO timestamp rather than a pre-formatted string:
 * the card formats it, so it can also sort and label by it (see
 * `isPast`/`formatEventDate` below).
 */
export const eventDirectory: DirectoryEvent[] = [
  {
    id: "night-kitchen-shift",
    title: "Night kitchen: winter shift",
    organizer: "Sunrise Youth Club",
    organizerUserName: "sunriseyouthclub",
    cause: "Relief",
    summary:
      "Cook, plate and serve the 9pm round along the Sealdah corridor. No experience needed.",
    cover: nightKitchenCover,
    coverAlt: "A community canteen seen from above at service time",
    mode: "Offline",
    city: "Kolkata",
    country: "India",
    startsAt: "2026-09-12T21:00:00+05:30",
    going: 64,
    spotsLeft: 16,
  },
  {
    id: "library-shelving-weekend",
    title: "Library rebuild: shelving weekend",
    organizer: "Ubuntu Learning Trust",
    organizerUserName: "ubuntulearning",
    cause: "Education",
    summary:
      "Two days of carpentry, sanding and sorting 1,200 donated books onto the new shelves.",
    cover: libraryShelvingCover,
    coverAlt: "Stacks of books piled on a table",
    mode: "Offline",
    city: "Kajiado",
    country: "Kenya",
    startsAt: "2026-09-19T08:00:00+03:00",
    going: 38,
    spotsLeft: 12,
  },
  {
    id: "monsoon-health-camp-ward-four",
    title: "Monsoon health camp, ward 4",
    organizer: "Aarogya Volunteers",
    organizerUserName: "aarogyavolunteers",
    cause: "Healthcare",
    summary:
      "Free check-ups, oral rehydration kits and mosquito nets. Clinicians and translators both needed.",
    cover: monsoonHealthCampCover,
    coverAlt: "Three health workers talking in a clinic doorway",
    mode: "Offline",
    city: "Dhaka",
    country: "Bangladesh",
    startsAt: "2026-09-05T09:00:00+06:00",
    going: 121,
    spotsLeft: 4,
  },
  {
    id: "adoption-sunday",
    title: "Adoption Sunday",
    organizer: "Pawsitive Pune",
    organizerUserName: "pawsitivepune",
    cause: "Animal welfare",
    summary:
      "Nineteen cats and eleven dogs, all vaccinated, meeting people who might take them home.",
    cover: adoptionSundayCover,
    coverAlt: "A kitten looking towards the camera",
    mode: "Offline",
    city: "Pune",
    country: "India",
    startsAt: "2026-09-27T10:30:00+05:30",
    going: 210,
    spotsLeft: 40,
  },
  {
    id: "solar-lamp-install",
    title: "Solar lamp install: Bhotsipa",
    organizer: "Himal Light Collective",
    organizerUserName: "himallight",
    cause: "Environment",
    summary:
      "Fitting and handing over 90 rechargeable lamps, house by house, over a single weekend.",
    cover: solarLampInstallCover,
    coverAlt: "A solar panel array at golden hour",
    mode: "Offline",
    city: "Sindhupalchok",
    country: "Nepal",
    startsAt: "2026-10-03T07:30:00+05:45",
    going: 27,
    spotsLeft: 8,
  },
  {
    id: "welding-intake-day",
    title: "Welding cohort: intake day",
    organizer: "Tanaka Skills Lab",
    organizerUserName: "tanakaskillslab",
    cause: "Livelihood",
    summary:
      "Interviews and a bench test for the next six-month cohort. Twenty-four places, no fees.",
    cover: weldingIntakeCover,
    coverAlt: "Hand tools hung in rows on a workshop wall",
    mode: "Offline",
    city: "Harare",
    country: "Zimbabwe",
    startsAt: "2026-09-08T08:00:00+02:00",
    going: 88,
    spotsLeft: 0,
  },
  {
    id: "borewell-maintenance-webinar",
    title: "Borewell maintenance, start to finish",
    organizer: "Clearwell Foundation",
    organizerUserName: "clearwell",
    cause: "Water & sanitation",
    summary:
      "The session we wish every village committee got: pumps, filters and who pays for the repairs.",
    cover: borewellWebinarCover,
    coverAlt: "People working through a laptop session around a table",
    mode: "Online",
    platform: "Zoom",
    startsAt: "2026-09-16T16:00:00+00:00",
    going: 342,
    spotsLeft: 158,
  },
  {
    id: "morning-movement-class",
    title: "Morning movement class",
    organizer: "Sandhya Elder Care",
    organizerUserName: "sandhyacare",
    cause: "Elder care",
    summary:
      "An hour of gentle exercise and company at the Jayanagar day centre. Every Tuesday.",
    cover: morningMovementCover,
    coverAlt: "An older man out walking with headphones on",
    mode: "Offline",
    city: "Bengaluru",
    country: "India",
    startsAt: "2026-09-01T07:00:00+05:30",
    going: 46,
    spotsLeft: 14,
  },
  {
    id: "mangrove-planting-day",
    title: "Mangrove planting day",
    organizer: "Green Corridor Collective",
    organizerUserName: "greencorridor",
    cause: "Environment",
    summary:
      "5,000 saplings along the typhoon-exposed stretch north of the city. Boots provided.",
    cover: mangrovePlantingCover,
    coverAlt: "A single seedling breaking through dark soil",
    mode: "Offline",
    city: "Tacloban",
    country: "Philippines",
    startsAt: "2026-10-11T06:00:00+08:00",
    going: 156,
    spotsLeft: 94,
  },
  {
    id: "night-shift-induction",
    title: "Winter night shift: volunteer induction",
    organizer: "North Star Shelter",
    organizerUserName: "northstarshelter",
    cause: "Relief",
    summary:
      "Safeguarding, de-escalation and what the door actually asks of you, before the cold sets in.",
    cover: nightShiftInductionCover,
    coverAlt: "A small group working together around a table",
    mode: "Online",
    platform: "Google Meet",
    startsAt: "2026-09-24T18:30:00+01:00",
    going: 73,
    spotsLeft: 27,
  },
  {
    id: "homework-club-new-term",
    title: "Homework club: new term",
    organizer: "Casa Abierta",
    organizerUserName: "casaabierta",
    cause: "Education",
    summary:
      "Study hall reopens for 140 kids. Tutors wanted for maths, reading and the ones who hate both.",
    cover: homeworkClubCover,
    coverAlt: "A child's hands writing in a spiral notebook",
    mode: "Offline",
    city: "Mexico City",
    country: "Mexico",
    startsAt: "2026-09-02T16:00:00-06:00",
    going: 52,
    spotsLeft: 18,
  },
  {
    id: "free-vet-clinic-mushin",
    title: "Free vet clinic: Mushin",
    organizer: "Mercy Paws Lagos",
    organizerUserName: "mercypawslagos",
    cause: "Animal welfare",
    summary:
      "Deworming, wound care and vaccinations for working animals, plus their owners' questions.",
    cover: freeVetClinicCover,
    coverAlt: "A dog waiting on a city pavement",
    mode: "Offline",
    city: "Lagos",
    country: "Nigeria",
    startsAt: "2026-09-14T08:30:00+01:00",
    going: 64,
    spotsLeft: 22,
  },
];

/**
 * "Sat 12 Sep · 9:00 pm" in the visitor's own locale.
 *
 * The long form, for surfaces that show the date once - the detail page
 * hero. `EventCard` uses `formatEventBadge` + `formatEventTime` instead,
 * because it shows both and the two would otherwise print the same day
 * number twice.
 *
 * Deliberately not `getFormattedDate.ts` (this feature's other date
 * helper): that one takes the API's `{ date, time }` string pair, while
 * these fixtures carry a real ISO timestamp. When the API arrives, whichever
 * shape it returns should collapse the two into one.
 */
export const formatEventDate = (startsAt: string) =>
  new Date(startsAt)
    .toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(", ", " · ");

/** Short form for the badge on the cover: "12 SEP". */
export const formatEventBadge = (startsAt: string) =>
  new Date(startsAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

/**
 * "Sat · 9:00 pm" - weekday and start time, no day number.
 *
 * The companion to `formatEventBadge` on a card that shows both: the badge
 * carries the date, this carries the part the badge can't fit.
 */
export const formatEventTime = (startsAt: string) => {
  const date = new Date(startsAt);

  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

/** The directory entry for `id`, or `undefined` for an unknown route param. */
export const findEvent = (id?: string) =>
  eventDirectory.find((event) => event.id === id);
