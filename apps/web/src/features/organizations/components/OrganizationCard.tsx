import { FiArrowUpRight, FiMapPin } from "react-icons/fi";
import { MdVerified } from "react-icons/md";
import { Link } from "react-router-dom";
import {
  ORGANIZATION_ACCENTS,
  formatCount,
} from "../constants/organizationDirectory";
import { monogram } from "../utils/monogram";
import type { OrganizationCardProps } from "../types";

/**
 * One organization in the `/organizations` directory.
 *
 * ## Shape
 *
 * The same card as `landing-home`'s `DrivesRail.tsx`, deliberately: a 16:9
 * cover photo with the cause riding on it, then a one-line name, a
 * two-line tagline, the meta row and the stat rule. Both surfaces show the
 * same kind of record, so they should not be two different card designs.
 *
 * The cover is a real per-organization photo (`cover`/`coverAlt`, files in
 * `assets/pictures/organizations/`), standing in for the image a real
 * organization would upload. It replaced a gradient-and-monogram band that
 * existed only because the app used to ship a single shared banner asset -
 * see `docs/specs/organizations.md`. The monogram went with it: over a
 * photo it read as clutter, and it survives on the profile header where a
 * profile picture belongs.
 *
 * The **whole card is one link**, not a card with an arrow button inside it
 * - a 300px target beats a 32px one, and it removes the old markup's
 * nested-interactive smell. The arrow beside the name is decorative
 * (`aria-hidden`) and animates on `group-hover`.
 *
 * Carries `data-reveal` for the grid's `useSectionReveal` scope, and the
 * app-standard card hover (lift + brand-token glow) - see
 * `docs/specs/ui-kit.md#card-components`.
 */
const OrganizationCard = ({ organization }: OrganizationCardProps) => {
  const accent =
    ORGANIZATION_ACCENTS[organization.accent % ORGANIZATION_ACCENTS.length];

  return (
    <Link
      data-reveal
      to={`/organization/${organization.userName}`}
      aria-label={`${organization.name} — ${organization.cause} in ${organization.city}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-secondary/8 bg-white text-inherit no-underline shadow-[0_2px_18px_-14px_var(--color-brand-secondary)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/35 hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-16/9 shrink-0 overflow-hidden bg-brand-secondary/10">
        {organization.cover ? (
          <img
            src={organization.cover}
            alt={organization.coverAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
          />
        ) : (
          // No cover uploaded yet. An accent band with the monogram on it,
          // rather than one shared stock banner reused across every such
          // card — which is exactly what made the old grid read as twenty
          // copies of one record (see docs/specs/organizations.md).
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            }}
          >
            <span className="font-outfit text-4xl font-semibold text-white/90">
              {monogram(organization.name)}
            </span>
          </div>
        )}
        {/* Scrim: the cause label has to stay legible over a light photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
        />
        <span className="absolute bottom-2.5 left-4 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm">
          {organization.cause}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-1.5">
          {/* One line, always. `min-w-0` is what lets the name truncate
            instead of pushing the tick and the arrow out of the card. */}
          <h2 className="min-w-0 truncate font-outfit text-body-lg leading-tight font-semibold tracking-tight text-brand-secondary sm:text-lg">
            {organization.name}
          </h2>
          {organization.verified && (
            <MdVerified
              className="size-4 shrink-0 text-brand"
              role="img"
              aria-label="Verified organization"
            />
          )}
          <FiArrowUpRight
            aria-hidden="true"
            className="ml-auto size-5 shrink-0 text-brand-secondary/35 transition-all duration-300 ease-out group-hover:text-brand motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
          />
        </div>

        {/* Two lines maximum, on a fixed box so the stat rule below lines up
          across a row of cards whose taglines wrap differently. */}
        <p className="mt-2 line-clamp-2 min-h-11 font-poppins text-body leading-[1.375rem] text-ink/70">
          {organization.tagLine}
        </p>

        <p className="mt-2.5 inline-flex items-center gap-1.5 font-poppins text-caption tracking-wide text-ink/55">
          <FiMapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {organization.city}
          <span aria-hidden="true" className="text-ink/25">
            •
          </span>
          Since {organization.founded}
        </p>

        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border-subtle pt-3.5 font-outfit">
          {[
            { label: "Followers", value: formatCount(organization.followers) },
            { label: "Team", value: formatCount(organization.volunteers) },
            {
              label: "Focus areas",
              value: String(organization.focusAreas.length),
            },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="font-poppins text-caption tracking-wide text-ink/50 uppercase">
                {stat.label}
              </dt>
              <dd className="m-0 mt-0.5 text-body font-semibold text-brand-secondary">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
};

export default OrganizationCard;
