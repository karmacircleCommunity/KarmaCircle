import { FiGlobe, FiTag, FiUserCheck, FiUsers } from "react-icons/fi";
import { formatSpotsLeft } from "@features/events/utils/formatEventFacts";
import { formatMoney } from "@utils/formatMoney";
import type { EventFactsProps } from "@features/events/types";

/**
 * The four-cell fact strip: cost, attendance, languages, and who can come.
 *
 * **Cost leads on purpose.** Almost everything on the circle is free -
 * these are nonprofit drives - and "is this going to cost me something?"
 * is the question a visitor asks before any other. `detail.cost` being
 * absent *is* the free case, so a free event says so in words rather than
 * showing a zero, and a priced one shows the amount with the organizer's
 * own note beneath it.
 *
 * **Attendance** shows spots left and how many are going for an event with a
 * capacity (PG-5), and "No limit" for one without: only a capped event has a
 * trustworthy count, so no "going" number is shown for the rest.
 *
 * **Who can come** doubles as the invite-only signal: an invite-only event
 * says so here instead of (or alongside) any age restriction, since it's
 * the bigger gate on whether a reader can actually show up.
 */
const EventFacts = ({ event, detail }: EventFactsProps) => {
  const hasCapacity =
    event.going !== undefined && event.spotsLeft !== undefined;
  const full = event.spotsLeft === 0;

  const facts = [
    {
      icon: FiTag,
      label: "Cost",
      value: detail.cost
        ? formatMoney(detail.cost.amount, detail.cost.currency)
        : "Free",
      note: detail.cost?.note ?? "No ticket, no fee. Just turn up.",
    },
    {
      icon: FiUsers,
      label: "Attendance",
      value: hasCapacity
        ? full
          ? "Full"
          : formatSpotsLeft(event.spotsLeft!)
        : "No limit",
      note: hasCapacity
        ? `${event.going} ${event.going === 1 ? "person" : "people"} going`
        : "The organizer has not capped the number of places",
    },
    {
      icon: FiGlobe,
      label: "Run in",
      value: detail.languages[0] ?? "Not specified",
      note:
        detail.languages.length > 1
          ? `Also ${detail.languages.slice(1).join(", ")}`
          : "One language throughout",
    },
    {
      icon: FiUserCheck,
      label: "Who can come",
      value: event.inviteOnly
        ? "Invite only"
        : detail.minimumAge
          ? `${detail.minimumAge}+`
          : "Everyone",
      note: event.inviteOnly
        ? "Ask the organizer for an invite"
        : detail.minimumAge
          ? "There is a real reason for this one - ask if it blocks you"
          : "No age limit on this event",
    },
  ];

  return (
    <dl
      data-reveal
      className="m-0 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-2"
    >
      {facts.map(({ icon: Icon, label, value, note }) => (
        <div key={label} className="bg-white px-5 py-4">
          <dt className="inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
            <Icon aria-hidden="true" className="size-3.5 text-brand" />
            {label}
          </dt>
          <dd className="m-0 mt-1.5 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
            {value}
          </dd>
          <p className="mt-1 font-poppins text-caption leading-5 text-ink/55">
            {note}
          </p>
        </div>
      ))}
    </dl>
  );
};

export default EventFacts;
