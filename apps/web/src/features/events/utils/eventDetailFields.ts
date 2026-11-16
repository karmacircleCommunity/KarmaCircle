import type {
  ApiEvent,
  EventAgendaItem,
  EventDetailFormFields,
  EventFormState,
  EventMode,
} from "@features/events/types";

/**
 * The optional detail fields of an event (PG-7) as the form holds them, and
 * the conversions to and from the API's shapes. Everything here is a pure
 * function so it can be unit tested; the form only wires inputs to it.
 *
 * The form keeps plain text (paragraphs, lines, a comma list, number inputs as
 * strings) and `normalizeDetails` turns it into exactly what the API stores, so
 * the same normalization can be applied to a stored event to tell what the
 * organizer actually changed.
 */

/** The limits mirror `event.constants.ts` in the API. */
export const DETAIL_LIMITS = {
  aboutParagraphs: 20,
  aboutParagraphLength: 2000,
  bringAlongItems: 20,
  bringAlongItemLength: 100,
  languagesItems: 10,
  languageLength: 40,
  agendaItems: 30,
  agendaTimeLength: 30,
  agendaTitleLength: 100,
  agendaDetailLength: 200,
  gettingThereLength: 500,
  joinNoteLength: 300,
  contactEmailLength: 254,
  costMaxAmount: 10_000_000,
  costNoteLength: 200,
  minimumAgeMax: 120,
} as const;

/** Currencies offered in the form. A stored event can carry any 3-letter code. */
export const COST_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "SGD",
  "AED",
] as const;

export const DETAIL_FORM_KEYS = [
  "about",
  "contactEmail",
  "costAmount",
  "costCurrency",
  "costNote",
  "bringAlong",
  "languages",
  "minimumAge",
  "agenda",
  "gettingThere",
  "linkDelivery",
  "joinRequirements",
] as const satisfies readonly (keyof EventDetailFormFields)[];

export const emptyDetailFields = (): EventDetailFormFields => ({
  about: "",
  contactEmail: "",
  costAmount: "",
  costCurrency: "INR",
  costNote: "",
  bringAlong: "",
  languages: "",
  minimumAge: "",
  agenda: [],
  gettingThere: "",
  linkDelivery: "",
  joinRequirements: "",
});

/** A stored event's details as form values. */
export function detailFieldsFromEvent(event: ApiEvent): EventDetailFormFields {
  return {
    about: (event.about ?? []).join("\n\n"),
    contactEmail: event.contactEmail ?? "",
    costAmount: event.cost ? String(event.cost.amount) : "",
    costCurrency: event.cost?.currency ?? "INR",
    costNote: event.cost?.note ?? "",
    bringAlong: (event.bringAlong ?? []).join("\n"),
    languages: (event.languages ?? []).join(", "),
    minimumAge: event.minimumAge === undefined ? "" : String(event.minimumAge),
    agenda: (event.agenda ?? []).map((row) => ({
      time: row.time,
      title: row.title,
      detail: row.detail ?? "",
    })),
    gettingThere: event.gettingThere ?? "",
    linkDelivery: event.linkDelivery ?? "",
    joinRequirements: event.joinRequirements ?? "",
  };
}

/** What the API stores for the details: `null` and `[]` mean "nothing". */
export interface NormalizedDetails {
  about: string[];
  contactEmail: string | null;
  cost: { amount: number; currency: string; note?: string } | null;
  bringAlong: string[];
  languages: string[];
  minimumAge: number | null;
  agenda: EventAgendaItem[];
  gettingThere: string | null;
  linkDelivery: string | null;
  joinRequirements: string | null;
}

const trimmed = (value: string) => value.trim();
const orNull = (value: string) =>
  trimmed(value) === "" ? null : trimmed(value);
const lines = (value: string) =>
  value.split(/\r?\n/).map(trimmed).filter(Boolean);
const paragraphs = (value: string) =>
  value
    .split(/\r?\n\s*\r?\n/)
    .map(trimmed)
    .filter(Boolean);
const commaList = (value: string) =>
  value.split(/[,\n]/).map(trimmed).filter(Boolean);

const agendaRowIsEmpty = (row: EventAgendaItem) =>
  !trimmed(row.time) && !trimmed(row.title) && !trimmed(row.detail ?? "");

/**
 * The form's details in the API's shape. Fields that belong to the other mode
 * (directions for an online event, link notes for an in-person one) come out
 * as `null`: the API drops them too, and they must not read as "changed".
 */
export function normalizeDetails(
  form: EventDetailFormFields,
  mode: EventMode,
): NormalizedDetails {
  const amount = trimmed(form.costAmount);
  const note = trimmed(form.costNote);
  return {
    about: paragraphs(form.about),
    contactEmail: orNull(form.contactEmail),
    cost:
      amount === ""
        ? null
        : {
            amount: Number(amount),
            currency: trimmed(form.costCurrency).toUpperCase(),
            ...(note ? { note } : {}),
          },
    bringAlong: lines(form.bringAlong),
    languages: commaList(form.languages),
    minimumAge:
      trimmed(form.minimumAge) === "" ? null : Number(form.minimumAge),
    agenda: form.agenda
      .filter((row) => !agendaRowIsEmpty(row))
      .map((row) => ({
        time: trimmed(row.time),
        title: trimmed(row.title),
        ...(trimmed(row.detail ?? "")
          ? { detail: trimmed(row.detail ?? "") }
          : {}),
      })),
    gettingThere: mode === "Offline" ? orNull(form.gettingThere) : null,
    linkDelivery: mode === "Online" ? orNull(form.linkDelivery) : null,
    joinRequirements: mode === "Online" ? orNull(form.joinRequirements) : null,
  };
}

/** The same shape, read from a stored event (no form in between). */
export function normalizedDetailsFromEvent(event: ApiEvent): NormalizedDetails {
  return normalizeDetails(detailFieldsFromEvent(event), event.mode);
}

const isEmpty = (value: unknown) =>
  value === null || (Array.isArray(value) && value.length === 0);

/** For create: only the details the organizer actually filled in. */
export function detailPayloadForCreate(form: EventFormState) {
  const details = normalizeDetails(form, form.mode);
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => !isEmpty(value)),
  );
}

/**
 * For edit: only the details that differ from the stored event. A cleared
 * scalar or object goes as `null` and a cleared list as `[]`, because leaving
 * a key out means "unchanged".
 */
export function detailChanges(form: EventFormState, original: ApiEvent) {
  const next = normalizeDetails(form, form.mode);
  const before = normalizedDetailsFromEvent(original);
  const changes: Record<string, unknown> = {};

  for (const key of Object.keys(next) as (keyof NormalizedDetails)[]) {
    if (JSON.stringify(next[key]) !== JSON.stringify(before[key])) {
      changes[key] = next[key];
    }
  }
  return changes;
}

export type DetailErrors = Partial<Record<keyof EventDetailFormFields, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side mirror of the API's rules for the detail fields. */
export function validateDetails(
  form: EventDetailFormFields,
  mode: EventMode,
): DetailErrors {
  const errors: DetailErrors = {};
  const L = DETAIL_LIMITS;

  const about = paragraphs(form.about);
  if (about.length > L.aboutParagraphs) {
    errors.about = `Use at most ${L.aboutParagraphs} paragraphs`;
  } else if (about.some((p) => p.length > L.aboutParagraphLength)) {
    errors.about = `Keep each paragraph under ${L.aboutParagraphLength} characters`;
  }

  const email = trimmed(form.contactEmail);
  if (
    email &&
    (!EMAIL_PATTERN.test(email) || email.length > L.contactEmailLength)
  ) {
    errors.contactEmail = "Enter a valid contact email";
  }

  const amount = trimmed(form.costAmount);
  if (amount !== "") {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > L.costMaxAmount) {
      errors.costAmount =
        "Enter a fee above zero, or clear it if the event is free";
    } else if (!/^[A-Za-z]{3}$/.test(trimmed(form.costCurrency))) {
      errors.costCurrency = "Choose a currency";
    }
  }
  if (trimmed(form.costNote).length > L.costNoteLength) {
    errors.costNote = `Keep this under ${L.costNoteLength} characters`;
  }

  const bring = lines(form.bringAlong);
  if (bring.length > L.bringAlongItems) {
    errors.bringAlong = `List at most ${L.bringAlongItems} things`;
  } else if (bring.some((item) => item.length > L.bringAlongItemLength)) {
    errors.bringAlong = `Keep each item under ${L.bringAlongItemLength} characters`;
  }

  const languages = commaList(form.languages);
  if (languages.length > L.languagesItems) {
    errors.languages = `List at most ${L.languagesItems} languages`;
  } else if (languages.some((item) => item.length > L.languageLength)) {
    errors.languages = `Keep each language under ${L.languageLength} characters`;
  }

  const age = trimmed(form.minimumAge);
  if (age !== "") {
    const value = Number(age);
    if (!Number.isInteger(value) || value < 1 || value > L.minimumAgeMax) {
      errors.minimumAge = `Enter a whole number from 1 to ${L.minimumAgeMax}, or clear it`;
    }
  }

  const rows = form.agenda.filter(
    (row) =>
      !agendaRowIsEmpty({
        time: row.time,
        title: row.title,
        detail: row.detail,
      }),
  );
  if (rows.length > L.agendaItems) {
    errors.agenda = `Use at most ${L.agendaItems} rows`;
  } else if (rows.some((row) => !trimmed(row.time) || !trimmed(row.title))) {
    errors.agenda = "Give every row a time and a title, or remove it";
  } else if (
    rows.some(
      (row) =>
        trimmed(row.time).length > L.agendaTimeLength ||
        trimmed(row.title).length > L.agendaTitleLength ||
        trimmed(row.detail).length > L.agendaDetailLength,
    )
  ) {
    errors.agenda = "One of the rows is too long";
  }

  if (
    mode === "Offline" &&
    trimmed(form.gettingThere).length > L.gettingThereLength
  ) {
    errors.gettingThere = `Keep this under ${L.gettingThereLength} characters`;
  }
  if (mode === "Online") {
    if (trimmed(form.linkDelivery).length > L.joinNoteLength) {
      errors.linkDelivery = `Keep this under ${L.joinNoteLength} characters`;
    }
    if (trimmed(form.joinRequirements).length > L.joinNoteLength) {
      errors.joinRequirements = `Keep this under ${L.joinNoteLength} characters`;
    }
  }

  return errors;
}

/** The form state without the detail fields, for the create request. */
export function omitDetailFields(form: EventFormState) {
  const base: Record<string, unknown> = { ...form };
  for (const key of DETAIL_FORM_KEYS) delete base[key];
  return base;
}
