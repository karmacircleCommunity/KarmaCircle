import type { EventAgendaProps } from "../../types";

/**
 * The run sheet, as a rail-and-bead timeline.
 *
 * Same vocabulary as `OrganizationProfile.tsx`'s track record and
 * `HowItWorks`' playbook, so a timeline looks like a timeline everywhere in
 * the app. Times are pre-formatted strings, not timestamps: a schedule is
 * written in the event's own timezone, and converting "9:00 pm" into the
 * reader's would be actively wrong for anyone reading from elsewhere.
 */
const EventAgenda = ({ agenda }: EventAgendaProps) => (
  <ol className="relative m-0 list-none p-0">
    <span
      aria-hidden="true"
      className="absolute inset-y-2 left-[7px] w-px bg-brand-secondary/12"
    />
    {agenda.map((item) => (
      <li
        key={`${item.time}-${item.title}`}
        data-reveal
        className="relative pb-7 pl-8 last:pb-0"
      >
        <span
          aria-hidden="true"
          className="absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-surface bg-brand"
        />
        <p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">
          {item.time}
        </p>
        <h3 className="mt-1.5 font-outfit text-body-lg font-semibold tracking-tight text-brand-secondary sm:text-lg">
          {item.title}
        </h3>
        {item.detail && (
          <p className="mt-1.5 font-poppins text-body leading-6 text-ink/70">
            {item.detail}
          </p>
        )}
      </li>
    ))}
  </ol>
);

export default EventAgenda;
