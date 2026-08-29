import { FiGlobe, FiTag, FiUserCheck, FiUsers } from "react-icons/fi";
import { formatMoney } from "../../utils/formatEventFacts";
import type { EventFactsProps } from "../../types";

/**
 * The four-cell fact strip: cost, attendance, languages, and any age limit.
 *
 * **Cost leads on purpose.** Almost everything on the circle is free -
 * these are nonprofit drives - and "is this going to cost me something?"
 * is the question a visitor asks before any other. `detail.cost` being
 * absent *is* the free case, so a free event says so in words rather than
 * showing a zero, and a priced one shows the amount with the organizer's
 * own note beneath it.
 */
const EventFacts = ({ event, detail }: EventFactsProps) => {
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
      value: full ? "Full" : `${event.spotsLeft} spots left`,
      note: `${event.going} people going`,
    },
    {
      icon: FiGlobe,
      label: "Run in",
      value: detail.languages[0],
      note:
        detail.languages.length > 1
          ? `Also ${detail.languages.slice(1).join(", ")}`
          : "One language throughout",
    },
    {
      icon: FiUserCheck,
      label: "Who can come",
      value: detail.minimumAge ? `${detail.minimumAge}+` : "Everyone",
      note: detail.minimumAge
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
