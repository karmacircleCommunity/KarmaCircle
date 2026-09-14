import { useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import type { ReactNode } from "react";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiHeart,
  FiMail,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { MdVerified } from "react-icons/md";
import { Link, useParams } from "react-router-dom";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";
import { useSectionReveal } from "@hooks";
import { eventEndpoints, organizationEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import {
  ORGANIZATION_ACCENTS,
  formatCount,
} from "../constants/organizationDisplay";
import OrganizationEventsList from "../components/OrganizationEventsList";
import type { HostedEvent } from "../components/OrganizationEventsList";
import SponsorOrganizationModal from "../components/SponsorOrganizationModal";
import { monogram } from "../utils/monogram";
import { toDisplayOrganization } from "../utils/toDisplayOrganization";
import type { ApiOrganization, DisplayOrganization } from "../types";

/** Live records store a full URL; the old fixture stored a bare domain. */
const toHref = (website: string) =>
  /^https?:\/\//i.test(website) ? website : `https://${website}`;

const toLabel = (website: string) => website.replace(/^https?:\/\//i, "");

/**
 * The public organization page, routed at `/organization/:userName`
 * (`:userName` is the record's `handle`).
 *
 * **Live**, as of the organization model landing: it fetches
 * `GET /organizations/{handle}`, which serves only organizations whose
 * profile is complete. A draft organization 404s here exactly as an
 * unknown handle does — a visitor must not be able to tell a half-finished
 * signup from a nonexistent one.
 *
 * Sections with nothing behind them do not render. A newly published
 * organization has no drives and no milestones, and inventing placeholders
 * for them would be the same lie the sample fixture used to tell. The
 * layout below is unchanged from that fixture-driven version — mapping
 * happens in `utils/toDisplayOrganization.ts`, not in markup.
 */
const OrganizationProfile = () => {
  const { userName } = useParams();
  const { data, error, isLoading } = useSWR<ApiOrganization>(
    userName ? organizationEndpoints.byHandle(userName) : null,
    fetcher,
  );

  if (isLoading) return <OrganizationProfileLoading />;
  if (error || !data) return <OrganizationNotFound userName={userName} />;

  return <OrganizationProfileView organization={toDisplayOrganization(data)} />;
};

const OrganizationProfileLoading = () => (
  <>
    <Navbar />
    <div className="mx-auto max-w-6xl px-9 py-24 sm:px-10 lg:px-12">
      <p className="font-poppins text-body text-ink/55">Loading profile…</p>
    </div>
    <Footer />
  </>
);

const OrganizationNotFound = ({ userName }: { userName?: string }) => (
  <>
    <Navbar />
    <div className="mx-auto flex max-w-2xl flex-col items-start px-9 py-24 sm:px-10 lg:px-12">
      <span className="rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase">
        Not found
      </span>
      <h1 className="mt-6 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
        No organization at{" "}
        <span className="text-brand">/{userName ?? "unknown"}</span>
      </h1>
      <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
        This profile either moved or was never here. The directory has
        everything currently on the circle.
      </p>
      <Button
        to="/organizations"
        className="mt-8 inline-flex w-auto items-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium no-underline"
      >
        <FiArrowLeft aria-hidden="true" /> Back to organizations
      </Button>
    </div>
    <Footer />
  </>
);

const OrganizationProfileView = ({
  organization,
}: {
  organization: DisplayOrganization;
}) => {
  const accent =
    ORGANIZATION_ACCENTS[organization.accent % ORGANIZATION_ACCENTS.length];
  // Local-only, and deliberately so: there is no follow/subscribe endpoint
  // in `KarmaCircleApi.ts` or `ApiEndpoints.ts` today. The button acknowledging a
  // press beats a control that looks live and does nothing, which is what
  // `Profile.tsx`'s Subscribe/Sponsor pair does.
  const [following, setFollowing] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // The real link (Event.organizerHandle, falling back to the legacy
  // hostUsername match) — see event.service.ts#findAll. Not gated behind
  // anything: an unpublished-events organization just gets an empty array
  // and the section below doesn't render.
  const { data: eventsData } = useSWR<{ data: HostedEvent[] }>(
    eventEndpoints.byHost(organization.userName),
    fetcher,
  );
  const events = eventsData?.data ?? [];

  // Keyed on the fetched record *and* on the events fetch resolving:
  // "Events hosted"'s own `data-reveal` elements don't exist yet when this
  // effect would otherwise run right after the org record loads, since
  // that second fetch lands later — the same "async content needs its
  // result in the dependency array" case this page's own history already
  // has one regression for (see the note this replaced, and
  // Organizations.tsx's `useSectionReveal(gridRef, [results.length, ...])`).
  useSectionReveal(pageRef, [organization.userName, events.length]);
  const mostRecentEvent = [...events].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )[0];

  const socialLinks = [
    organization.socialLinks?.instagram && {
      key: "instagram",
      href: organization.socialLinks.instagram,
      Icon: FaInstagram,
      label: `${organization.name} on Instagram`,
    },
    organization.socialLinks?.facebook && {
      key: "facebook",
      href: organization.socialLinks.facebook,
      Icon: FaFacebook,
      label: `${organization.name} on Facebook`,
    },
    organization.socialLinks?.twitter && {
      key: "twitter",
      href: organization.socialLinks.twitter,
      Icon: FaXTwitter,
      label: `${organization.name} on X`,
    },
    organization.socialLinks?.linkedin && {
      key: "linkedin",
      href: organization.socialLinks.linkedin,
      Icon: FaLinkedin,
      label: `${organization.name} on LinkedIn`,
    },
    organization.socialLinks?.youtube && {
      key: "youtube",
      href: organization.socialLinks.youtube,
      Icon: FaYoutube,
      label: `${organization.name} on YouTube`,
    },
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    Icon: typeof FaInstagram;
    label: string;
  }>;

  const hasMainColumnSections =
    organization.activeDrives.length > 0 ||
    organization.milestones.length > 0 ||
    (organization.leadership?.length ?? 0) > 0 ||
    events.length > 0;

  const metaChips = [
    organization.city && {
      icon: FiMapPin,
      label: organization.city,
    },
    { icon: FiCalendar, label: `Since ${organization.founded}` },
    organization.volunteers > 0 && {
      icon: FiUsers,
      label: `${formatCount(organization.volunteers)} in the team`,
    },
  ].filter(Boolean) as Array<{ icon: typeof FiMapPin; label: string }>;

  return (
    <>
      <Navbar />

      <div ref={pageRef}>
        {/* ---------- Header ---------- */}
        <header className="mx-auto max-w-6xl px-9 pt-8 sm:px-10 lg:px-12 lg:pt-12">
          <Link
            to="/organizations"
            className="inline-flex items-center gap-2 font-poppins text-body text-ink/60 no-underline transition-colors duration-200 hover:text-brand"
          >
            <FiArrowLeft aria-hidden="true" className="size-4" />
            All organizations
          </Link>

          <div className="mt-5 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white shadow-[0_2px_20px_-16px_var(--color-brand-secondary)]">
            {/* The same cover photo as the card the visitor clicked, so
                arriving here reads as that card opening rather than as a
                different page. Taller than the card's 16:9 crop is wide, so
                it is object-cover on a fixed height rather than an aspect
                box. */}
            <div className="relative h-32 overflow-hidden bg-brand-secondary/10 sm:h-44">
              {organization.cover ? (
                <img
                  src={organization.cover}
                  alt={organization.coverAlt}
                  className="size-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-full"
                  style={{
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                  }}
                />
              )}
              {/* The monogram overlaps this by half its height and photos
                  are busy at the bottom edge - the scrim keeps that corner
                  calm enough for a white-bordered badge to sit on. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent"
              />
            </div>

            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              {/* `relative` is load-bearing: the cover above is a positioned
                  element, so a static monogram would paint *underneath* the
                  photo it is supposed to overlap, however negative its
                  margin. */}
              <div className="relative -mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
                {organization.logo ? (
                  <span className="flex size-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-[0_10px_24px_-16px_var(--color-brand-secondary)] sm:size-28">
                    <img
                      src={organization.logo}
                      alt=""
                      aria-hidden="true"
                      className="size-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex size-24 items-center justify-center rounded-3xl border-4 border-white font-outfit text-3xl font-semibold shadow-[0_10px_24px_-16px_var(--color-brand-secondary)] sm:size-28 sm:text-4xl"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accent.from} 16%, white)`,
                      color: accent.ink,
                    }}
                  >
                    {monogram(organization.name)}
                  </span>
                )}
              </div>

              <div className="mt-5 lg:flex lg:items-start lg:justify-between lg:gap-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h1
                      data-reveal
                      className="font-outfit text-[1.75rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl"
                    >
                      {organization.name}
                    </h1>
                    {/* The badge alone, sized to the name and in the brand
                        ink - the convention every social profile uses, and
                        quieter than the uppercase "VERIFIED" pill this
                        replaced. */}
                    {organization.verified && (
                      <MdVerified
                        role="img"
                        aria-label="Verified organization"
                        className="size-6 shrink-0 text-brand sm:size-7"
                      />
                    )}
                  </div>

                  <p
                    data-reveal
                    className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7"
                  >
                    {organization.tagLine}
                  </p>

                  <ul
                    data-reveal
                    className="mt-5 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 font-poppins text-body text-ink/60"
                  >
                    {metaChips.map(({ icon: Icon, label }) => (
                      <li
                        key={label}
                        className="inline-flex items-center gap-2"
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-4 text-brand"
                        />
                        {label}
                      </li>
                    ))}
                  </ul>

                  {/* Only the platforms this organization actually filled
                      in render — same "nothing invented" rule the rest of
                      this page follows for drives/milestones. */}
                  {socialLinks.length > 0 && (
                    <ul
                      data-reveal
                      className="mt-4 flex list-none flex-wrap items-center gap-3 p-0"
                    >
                      {socialLinks.map(({ key, href, Icon, label }) => (
                        <li key={key}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={label}
                            className="flex size-9 items-center justify-center rounded-full border border-brand-secondary/12 text-ink/55 no-underline transition-colors duration-200 hover:border-brand/35 hover:text-brand"
                          >
                            <Icon aria-hidden="true" className="size-4" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  data-reveal
                  className="mt-7 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0"
                >
                  {/* A plain button rather than the shared `Button`: this
                      control has two visually distinct states, and the
                      shared component's `variant` classes and a
                      state-dependent `className` would be two utilities
                      fighting over the same properties with no reliable
                      winner (equal specificity — the cascade decides by
                      stylesheet order, not by className order). */}
                  <button
                    type="button"
                    onClick={() => setFollowing((prev) => !prev)}
                    aria-pressed={following}
                    className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-poppins text-body font-medium transition-colors duration-300 ease-out motion-safe:active:scale-97 ${
                      following
                        ? "border border-brand/40 bg-brand/10 text-brand hover:bg-brand/15"
                        : "border-none bg-brand text-white shadow-[0_8px_24px_-12px_var(--color-brand)] hover:bg-brand-hover"
                    }`}
                  >
                    {following ? (
                      <>
                        <FiCheck aria-hidden="true" /> Following
                      </>
                    ) : (
                      <>
                        <FiUsers aria-hidden="true" /> Follow
                      </>
                    )}
                  </button>

                  {organization.website && (
                    <a
                      href={toHref(organization.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-brand-secondary/15 px-6 py-3 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand"
                    >
                      {toLabel(organization.website)}
                      <FiArrowUpRight
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                      />
                    </a>
                  )}
                </div>
              </div>

              {/* ---------- Stat strip ---------- */}
              <dl
                data-reveal
                className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-4"
              >
                {organization.stats.map((stat) => (
                  <div key={stat.label} className="bg-white px-5 py-4">
                    <dt className="font-poppins text-caption tracking-wide text-ink/50 uppercase">
                      {stat.label}
                    </dt>
                    <dd className="m-0 mt-1 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </header>

        {/* ---------- Body ---------- */}
        <div className="mx-auto max-w-6xl px-9 py-12 sm:px-10 lg:px-12 lg:py-16">
          {/* Two columns only when the main column has enough in it to hold
              one up. A newly published organization has no drives and no
              milestones, so its main column is a single paragraph and a row
              of chips — beside a sticky sidebar that leaves a column-height
              void where the rest of the page should be. Below that
              threshold the sidebar goes under the content instead. */}
          <div
            className={
              hasMainColumnSections
                ? "lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-10"
                : "mx-auto max-w-3xl"
            }
          >
            <main className="min-w-0">
              {(organization.about.length > 0 ||
                organization.focusAreas.length > 0) && (
                <Section
                  title={
                    organization.about.length > 0
                      ? "About us"
                      : "What we work on"
                  }
                  id="about"
                  reveal={false}
                >
                  {organization.about.map((paragraph, index) => (
                    <p
                      key={index}
                      className="mt-4 font-poppins text-body leading-7 text-ink/75 first:mt-0 sm:text-body-lg sm:leading-8"
                    >
                      {paragraph}
                    </p>
                  ))}

                  <ul className="mt-6 flex list-none flex-wrap gap-2 p-0">
                    {organization.focusAreas.map((area) => (
                      <li
                        key={area}
                        className="rounded-full border border-brand-secondary/12 bg-surface-warm px-3.5 py-1.5 font-outfit text-body text-ink/70"
                      >
                        {area}
                      </li>
                    ))}
                  </ul>

                  {mostRecentEvent && (
                    <Link
                      to={`/events/${mostRecentEvent.uid}`}
                      className="mt-6 flex items-center gap-3 rounded-2xl border border-brand-secondary/8 bg-surface-warm px-4 py-3 no-underline transition-colors duration-200 hover:border-brand/30"
                    >
                      <FiCalendar
                        aria-hidden="true"
                        className="size-4 shrink-0 text-brand"
                      />
                      <p className="min-w-0 truncate font-poppins text-body text-ink/70">
                        Most recently:{" "}
                        <span className="font-medium text-brand-secondary">
                          {mostRecentEvent.name}
                        </span>
                      </p>
                    </Link>
                  )}
                </Section>
              )}

              {organization.activeDrives.length > 0 && (
                <Section title="Drives running now" id="drives">
                  <ul className="flex list-none flex-col gap-4 p-0">
                    {organization.activeDrives.map((drive) => (
                      <li
                        key={drive.id}
                        data-reveal
                        className="rounded-2xl border border-brand-secondary/8 bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:border-brand/30 hover:shadow-[0_16px_34px_-22px_var(--color-brand)] sm:p-6"
                      >
                        <h3 className="font-outfit text-lg font-semibold tracking-tight text-brand-secondary sm:text-xl">
                          {drive.title}
                        </h3>
                        <p className="mt-2 font-poppins text-body leading-6 text-ink/70">
                          {drive.summary}
                        </p>

                        <div
                          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-brand-secondary/10"
                          role="progressbar"
                          aria-valuenow={drive.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${drive.title} funding progress`}
                        >
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${drive.percent}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="font-outfit text-body-lg font-semibold text-brand-secondary">
                            {drive.raised}
                            <span className="ml-1.5 font-poppins text-caption font-normal text-ink/50">
                              of {drive.goal}
                            </span>
                          </p>
                          <p className="font-poppins text-caption text-ink/55">
                            {drive.supporters} supporters • {drive.daysLeft}{" "}
                            days left
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {organization.milestones.length > 0 && (
                <Section title="Track record" id="track-record">
                  {/* Same rail-and-bead vocabulary as HowItWorks' playbook, so
                    a timeline looks like a timeline everywhere in the app. */}
                  <ol className="relative list-none p-0">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-[7px] w-px bg-brand-secondary/12"
                    />
                    {organization.milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        data-reveal
                        className="relative pb-8 pl-8 last:pb-0"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-surface bg-brand"
                        />
                        <p className="font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">
                          {milestone.year}
                        </p>
                        <h3 className="mt-1.5 font-outfit text-lg font-semibold tracking-tight text-brand-secondary">
                          {milestone.title}
                        </h3>
                        <p className="mt-1.5 font-poppins text-body leading-6 text-ink/70">
                          {milestone.body}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              {(organization.leadership?.length ?? 0) > 0 && (
                <Section title="Our team" id="team">
                  <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
                    {organization.leadership!.map((leader) => (
                      <li
                        key={leader.name}
                        data-reveal
                        className="flex gap-4 rounded-2xl border border-brand-secondary/8 bg-white p-4"
                      >
                        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-secondary/10 font-outfit text-body-lg font-semibold text-brand-secondary/70">
                          {leader.photo ? (
                            <img
                              src={leader.photo}
                              alt=""
                              aria-hidden="true"
                              className="size-full object-cover"
                            />
                          ) : (
                            monogram(leader.name)
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-outfit text-body-lg font-semibold tracking-tight text-brand-secondary">
                            {leader.name}
                          </p>
                          <p className="font-poppins text-caption tracking-wide text-brand uppercase">
                            {leader.title}
                          </p>
                          {leader.bio && (
                            <p className="mt-1.5 font-poppins text-body leading-6 text-ink/65">
                              {leader.bio}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {events.length > 0 && (
                <Section title="Events hosted" id="events-hosted">
                  <OrganizationEventsList events={events} />
                </Section>
              )}
            </main>

            {/* ---------- Sidebar ---------- */}
            <aside
              className={`mt-12 flex flex-col gap-5 ${
                hasMainColumnSections ? "lg:sticky lg:top-24 lg:mt-0" : ""
              }`}
            >
              {/* Not `data-reveal`: this card sits beside "About us", which
                  is itself exempt from the scroll entrance for the same
                  reason — see the note on `Section`'s `reveal` prop. */}
              <div className="overflow-hidden rounded-2xl bg-surface-dark p-6">
                <h2 className="font-outfit text-xl font-semibold tracking-tight text-white">
                  Back {organization.name}
                </h2>
                <p className="mt-2 font-poppins text-body leading-6 text-white/60">
                  {organization.sponsorship?.enabled
                    ? "Support goes straight to this organization through Razorpay. KarmaCircle takes no cut of what moves."
                    : "Every rupee, naira or pound goes to the drive you pick. KarmaCircle takes no cut of what moves."}
                </p>
                {/* The real payment flow, when this organization has turned
                    it on, takes priority over the drives-scroll button —
                    `activeDrives` is always empty for a live record today
                    (no drives endpoint exists yet), so this button used to
                    render for nobody. */}
                {organization.sponsorship?.enabled ? (
                  <Button
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium"
                    onClickfunction={() => setSponsorOpen(true)}
                  >
                    <FiHeart aria-hidden="true" /> Support {organization.name}
                  </Button>
                ) : (
                  organization.activeDrives.length > 0 && (
                    <Button
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium"
                      onClickfunction={() => {
                        document.getElementById("drives")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      <FiHeart aria-hidden="true" /> Sponsor a drive
                    </Button>
                  )
                )}
              </div>

              <div className="rounded-2xl border border-brand-secondary/8 bg-white p-6">
                <h2 className="font-outfit text-body-lg font-semibold tracking-tight text-brand-secondary">
                  Get in touch
                </h2>

                <dl className="mt-4 flex flex-col gap-4">
                  {organization.address && (
                    <div className="flex gap-3">
                      <FiMapPin
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-brand"
                      />
                      <div>
                        <dt className="font-poppins text-caption tracking-wide text-ink/45 uppercase">
                          Address
                        </dt>
                        <dd className="m-0 mt-1 font-poppins text-body leading-6 text-ink/75">
                          {organization.address}
                        </dd>
                      </div>
                    </div>
                  )}

                  {organization.contactEmail && (
                    <div className="flex gap-3">
                      <FiMail
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-brand"
                      />
                      <div className="min-w-0">
                        <dt className="font-poppins text-caption tracking-wide text-ink/45 uppercase">
                          Email
                        </dt>
                        <dd className="m-0 mt-1 font-poppins text-body break-all text-ink/75">
                          <a
                            href={`mailto:${organization.contactEmail}`}
                            className="text-ink/75 no-underline transition-colors duration-200 hover:text-brand"
                          >
                            {organization.contactEmail}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <FiUsers
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-brand"
                    />
                    <div>
                      <dt className="font-poppins text-caption tracking-wide text-ink/45 uppercase">
                        Community
                      </dt>
                      <dd className="m-0 mt-1 font-poppins text-body text-ink/75">
                        {formatCount(organization.followers)} followers
                      </dd>
                    </div>
                  </div>
                </dl>

                {organization.mapIframe && (
                  <div className="mt-4 aspect-16/9 w-full overflow-hidden rounded-xl border border-brand-secondary/8">
                    <iframe
                      src={organization.mapIframe}
                      title={`Map showing ${organization.name}'s location`}
                      className="size-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />

      {sponsorOpen && (
        <SponsorOrganizationModal
          handle={organization.userName}
          name={organization.name}
          logo={organization.logo}
          onClose={() => setSponsorOpen(false)}
          onSponsored={() => {
            // Revalidates the profile fetch so the "Raised via KarmaCircle"
            // stat reflects the payment that was just verified, without
            // this component owning a second copy of that number.
            globalMutate(organizationEndpoints.byHandle(organization.userName));
          }}
        />
      )}
    </>
  );
};

/**
 * Section shell — one heading rule, used down the main column.
 *
 * `reveal` defaults to true (the scroll-entrance `useSectionReveal` treats
 * this heading like every other `data-reveal` element). The first section
 * ("About us") opts out with `reveal={false}`: it sits right under the
 * hero, inside or barely past the first viewport on most screen sizes, so
 * gating it behind a scroll-triggered fade made the page read as blank on
 * first load — nothing below the hero card appeared until the visitor
 * scrolled. Sections further down the column stay on the reveal, where it
 * reads as an entrance rather than a missing page.
 */
const Section = ({
  title,
  id,
  reveal = true,
  children,
}: {
  title: string;
  id: string;
  reveal?: boolean;
  children: ReactNode;
}) => (
  <section
    id={id}
    aria-labelledby={`${id}-heading`}
    className="mt-12 scroll-mt-24 first:mt-0"
  >
    <h2
      id={`${id}-heading`}
      data-reveal={reveal || undefined}
      className="mb-5 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary sm:text-[1.75rem]"
    >
      {title}
    </h2>
    {children}
  </section>
);

export default OrganizationProfile;
