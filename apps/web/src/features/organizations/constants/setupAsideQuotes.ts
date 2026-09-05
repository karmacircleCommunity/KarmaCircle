export type SetupAsideQuote = {
  quote: string;
  author: string;
  /** A short descriptor of who the author was — one line under the name. */
  role: string;
  /** Two-letter monogram shown in place of a portrait. */
  initials: string;
};

/**
 * Real, publicly-attributed lines on giving and collective action, shown one
 * at a time on the setup flow's left panel and re-picked at random on every
 * page load (`pickSetupAsideQuote`).
 *
 * These are deliberately NOT customer testimonials, and there are no
 * portraits. This codebase has a standing rule against manufacturing social
 * proof it does not have (see `AuthLayout.tsx` and
 * `docs/specs/authentication.md`), and a name-and-face next to a quote on a
 * product screen reads as an endorsement nobody here gave. A monogram stands
 * in for the face, and the framing is "a thought to sit with while you fill
 * the form", not "people who use KarmaCircle". Keep both properties if this
 * list is edited: famous words, real attribution, no implied endorsement.
 */
export const SETUP_ASIDE_QUOTES: SetupAsideQuote[] = [
  {
    quote:
      "The best way to find yourself is to lose yourself in the service of others.",
    author: "Mahatma Gandhi",
    role: "Independence leader",
    initials: "MG",
  },
  {
    quote: "No one has ever become poor by giving.",
    author: "Anne Frank",
    role: "Diarist",
    initials: "AF",
  },
  {
    quote:
      "We make a living by what we get, but we make a life by what we give.",
    author: "Winston Churchill",
    role: "Statesman",
    initials: "WC",
  },
  {
    quote:
      "Never doubt that a small group of thoughtful, committed citizens can change the world.",
    author: "Margaret Mead",
    role: "Anthropologist",
    initials: "MM",
  },
  {
    quote: "Alone we can do so little; together we can do so much.",
    author: "Helen Keller",
    role: "Author and activist",
    initials: "HK",
  },
  {
    quote: "Everybody can be great, because anybody can serve.",
    author: "Martin Luther King Jr.",
    role: "Civil rights leader",
    initials: "MK",
  },
  {
    quote: "It is not how much we do, but how much love we put in the doing.",
    author: "Mother Teresa",
    role: "Missionary",
    initials: "MT",
  },
  {
    quote:
      "What do we live for, if it is not to make life less difficult for each other?",
    author: "George Eliot",
    role: "Novelist",
    initials: "GE",
  },
];

/** A random quote. Call once per mount so it is stable across re-renders. */
export const pickSetupAsideQuote = (): SetupAsideQuote =>
  SETUP_ASIDE_QUOTES[Math.floor(Math.random() * SETUP_ASIDE_QUOTES.length)];
