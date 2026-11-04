import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  FiArrowUpRight,
  FiCalendar,
  FiEye,
  FiHeart,
  FiMapPin,
  FiPlus,
  FiUsers,
} from "react-icons/fi";
import { Navbar } from "@components";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import TrackSection from "@features/dashboard/components/TrackSection";
import fetcher from "@utils/Fetcher";
import { organizationEndpoints } from "@services/ApiEndpoints";
import type { OrganizationDashboardData } from "../types";

const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const compact = (count: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count);
const LEGACY_DEMO_COVER_ID = "photo-1531206715517-5c0ba140b2b8";
const RIVERBEND_COVER = "/images/organization-covers/riverbend-resilience.jpg";

const Dashboard = () => {
  const { organization, isOrganization } = useMyOrganization();
  const { data, error, isLoading } = useSWR<OrganizationDashboardData>(
    isOrganization ? organizationEndpoints.dashboard : null,
    fetcher,
    { refreshInterval: 60_000 },
  );
  const org = data?.organization ?? organization;
  const name = org?.name || "Your organization";
  const coverImage = org?.cover?.includes(LEGACY_DEMO_COVER_ID)
    ? RIVERBEND_COVER
    : org?.cover;
  const chart = data?.viewsByDay ?? [];
  const profileHighlights = org
    ? [
        { label: "Description", complete: Boolean(org.description?.trim()) },
        { label: "Logo", complete: Boolean(org.logo) },
        { label: "Cover image", complete: Boolean(org.cover) },
        {
          label: "Focus areas",
          complete: Boolean(org.tag && org.domains.length > 0),
        },
        { label: "Location", complete: Boolean(org.location?.city) },
        {
          label: "Website or social link",
          complete: Boolean(
            org.website || Object.values(org.socialLinks ?? {}).some(Boolean),
          ),
        },
      ]
    : [];
  const completedProfileHighlights = profileHighlights.filter(
    (highlight) => highlight.complete,
  ).length;
  const nextProfileHighlight = profileHighlights.find(
    (highlight) => !highlight.complete,
  );

  return (
    <OrganizationSetupGate
      title="Your dashboard opens up once your profile is live"
      description="Your organization is still a draft. Complete its public profile to see your events, community, supporters, and reach here."
    >
      <Navbar />
      <main className="min-h-screen bg-surface pb-16">
        <div className="mx-auto max-w-6xl px-9 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pt-14">
          <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8" aria-labelledby="dashboard-page-title">
            <div className="max-w-2xl min-w-0">
              <p className="m-0 font-outfit text-caption font-semibold tracking-[0.12em] text-brand uppercase">Organization workspace</p>
              <h1 id="dashboard-page-title" className="mt-2 font-outfit text-3xl leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">Dashboard</h1>
              <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/65">A clear view of {name}&apos;s followers, events, support, and profile reach.</p>
            </div>
            <nav aria-label="Organization dashboard actions" className="flex w-full flex-col gap-3 sm:w-auto sm:shrink-0 sm:flex-row">
              <Link to="/organization/setup" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-outfit text-body font-semibold text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"><span>Edit organization profile</span><FiArrowUpRight aria-hidden="true" /></Link>
              <Link to="/organization/events" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-secondary/15 bg-white px-5 py-3 font-outfit text-body font-medium text-brand-secondary no-underline transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"><FiCalendar aria-hidden="true" /><span>View hosted events</span></Link>
            </nav>
          </header>

          {data?.includesDemoData && (
            <div role="note" className="mt-5 flex flex-col gap-1 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 font-outfit text-body font-semibold text-info">Demo activity loaded</p>
              <p className="m-0 font-poppins text-caption text-ink/60">Sample follows, events, views, and contributions are marked below. No money was collected.</p>
            </div>
          )}

          {isLoading && <DashboardMessage title="Loading your dashboard" detail="Gathering your organization, event, support, and reach data." />}
          {error && !isLoading && <DashboardMessage title="We couldn’t load your dashboard" detail="Refresh the page in a moment. Your organization information remains saved." error />}

          {data && org && (
            <>
              <section className="mt-8 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white" aria-labelledby="organization-overview-title">
                <div className="relative h-36 bg-brand-secondary/10 sm:h-48 lg:h-56">
                  {coverImage ? (
                    <img src={coverImage} alt="" className="size-full object-cover object-center" />
                  ) : (
                    <div className="size-full bg-linear-to-br from-brand/25 via-surface-warm to-brand-secondary/15" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-brand-secondary/35 via-transparent to-transparent" />
                </div>
                <div className="px-5 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                    <div className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-surface-warm font-outfit text-3xl font-semibold text-brand shadow-md sm:-mt-14 sm:size-28">
                      {org.logo ? <img src={org.logo} alt={`${name} logo`} className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 id="organization-overview-title" className="m-0 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary sm:text-3xl">{name}</h2>
                        {org.verified && <span className="rounded-full bg-success/10 px-2.5 py-1 font-outfit text-caption font-medium text-success">Verified</span>}
                      </div>
                      <p className="mt-2 mb-0 line-clamp-2 max-w-2xl font-poppins text-body leading-7 text-ink/65">{org.description || "Add a description so supporters understand your work."}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-poppins text-caption text-ink/55">
                        {org.tag && <span className="font-medium text-brand-secondary/75">{org.tag}</span>}
                        {org.location?.city && <span className="inline-flex items-center gap-1"><FiMapPin aria-hidden="true" className="size-3.5" />{[org.location.city, org.location.state].filter(Boolean).join(", ")}</span>}
                        {org.teamSize && <span>{org.teamSize.toLocaleString()} team members</span>}
                        {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand no-underline">Website <FiArrowUpRight aria-hidden="true" /></a>}
                      </div>
                      {org.domains.length > 0 && <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">{org.domains.map((domain) => <li key={domain} className="rounded-full bg-brand/5 px-3 py-1 font-poppins text-caption text-brand-secondary/80">{domain}</li>)}</ul>}
                    </div>
                    <Link to={`/organization/${org.handle}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-brand-secondary/15 px-5 font-outfit text-body font-medium text-brand-secondary no-underline transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:mb-1"><span>Open public page</span><FiArrowUpRight aria-hidden="true" /></Link>
                  </div>

                  <div className="mt-7 rounded-2xl bg-surface-warm/75 p-4 sm:px-6 sm:py-5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <p className="m-0 font-outfit text-body font-semibold text-brand-secondary">Profile completeness</p>
                      <p className="m-0 font-outfit text-caption font-medium text-brand-secondary">{completedProfileHighlights}/{profileHighlights.length} highlights</p>
                    </div>
                    <div
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-secondary/10"
                      role="progressbar"
                      aria-label="Organization profile highlights"
                      aria-valuemin={0}
                      aria-valuemax={profileHighlights.length}
                      aria-valuenow={completedProfileHighlights}
                      aria-valuetext={`${completedProfileHighlights} of ${profileHighlights.length} profile highlights added`}
                    >
                      <div className="h-full rounded-full bg-brand transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${profileHighlights.length ? (completedProfileHighlights / profileHighlights.length) * 100 : 0}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="m-0 font-poppins text-caption leading-5 text-ink/55">
                        {nextProfileHighlight ? `Next: add ${nextProfileHighlight.label.toLowerCase()}.` : "Your organization profile is complete."}
                      </p>
                      {nextProfileHighlight && <Link to="/organization/setup" className="shrink-0 font-outfit text-caption font-semibold text-brand no-underline hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Finish profile</Link>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Organization contact details">
                <Detail label="Contact email" value={org.contactEmail} href={org.contactEmail ? `mailto:${org.contactEmail}` : undefined} />
                <Detail label="Contact phone" value={org.contactPhone} href={org.contactPhone ? `tel:${org.contactPhone}` : undefined} />
                <Detail label="Community support" value={org.sponsorship?.enabled ? "Accepting support" : "Support button off"} />
                <Detail label="Public visibility" value={org.isLive ? "Public page is live" : "Not public yet"} />
              </section>

              <section className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Organization metrics">
                <Metric icon={<FiUsers />} label="Followers" value={compact(data.metrics.followers)} detail="people following this organization" />
                <Metric icon={<FiArrowUpRight />} label="Following" value={compact(data.metrics.following)} detail="organizations this account follows" />
                <Metric icon={<FiCalendar />} label="Hosted events" value={compact(data.metrics.hostedEvents)} detail="all time" />
                <Metric icon={<FiUsers />} label="Registrations" value={compact(data.metrics.eventRegistrations)} detail="across all events" />
                <Metric icon={<FiHeart />} label="Support received" value={compact(data.metrics.supporters)} detail={`${data.metrics.verifiedSupporters} verified · ${data.metrics.demoSupporters} sample`} />
                <Metric icon={<FiEye />} label="Profile views" value={compact(data.metrics.profileViews.last30Days)} detail="last 30 days" />
              </section>

              <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
                <TrackSection data={chart} />
                <div className="rounded-3xl border border-brand-secondary/10 bg-white p-5 shadow-[0_18px_48px_-38px_var(--color-brand-secondary)] sm:p-7">
                  <p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">Community</p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div><h2 className="m-0 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">Your people</h2><p className="mt-1 font-poppins text-caption text-ink/55">Recent followers</p></div>
                    <div className="text-right"><p className="m-0 font-outfit text-2xl font-semibold text-brand-secondary">{compact(data.metrics.followers)}</p><p className="m-0 font-poppins text-caption text-ink/50">followers</p></div>
                  </div>
                  {data.followers.length ? <ul className="mt-5 flex list-none flex-col gap-3 p-0">{data.followers.map((follower, index) => <li key={`${follower.userName ?? follower.name}-${index}`} className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-outfit font-semibold text-brand">{follower.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate font-poppins text-body text-brand-secondary">{follower.name}{follower.isDemo && <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 font-outfit text-caption text-info">Demo</span>}</span><span className="font-poppins text-caption text-ink/45">{new Date(follower.followedAt).toLocaleDateString()}</span></li>)}</ul> : <EmptyLine title="Your community is growing" detail="New followers will show up here." />}
                  <p className="mt-4 border-t border-brand-secondary/8 pt-4 font-poppins text-caption text-ink/50">Following {data.metrics.following} organization{data.metrics.following === 1 ? "" : "s"} on KarmaCircle</p>
                </div>
              </section>

              <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
                <div className="rounded-3xl border border-brand-secondary/10 bg-white p-5 shadow-[0_18px_48px_-38px_var(--color-brand-secondary)] sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">Programs</p><h2 className="mt-1 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">Hosted events</h2></div><Link to="/organization/events" className="inline-flex items-center gap-1 font-outfit text-body font-medium text-brand no-underline">Manage events <FiArrowUpRight aria-hidden="true" /></Link></div>
                  {data.events.length ? <ul className="mt-5 flex list-none flex-col gap-3 p-0">{data.events.map((event) => <li key={event.uid}><Link to={`/events/${event.uid}`} className="flex items-center gap-3 rounded-2xl border border-brand-secondary/8 p-3 no-underline transition-colors hover:border-brand/30"><span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-warm">{event.coverImage ? <img src={event.coverImage} alt="" className="size-full object-cover" /> : <FiCalendar className="text-brand" aria-hidden="true" />}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="block truncate font-outfit font-semibold text-brand-secondary">{event.name}</span>{event.isDemo && <span className="rounded-full bg-info/10 px-2 py-0.5 font-outfit text-caption text-info">Demo</span>}</span><span className="mt-1 block font-poppins text-caption text-ink/55">{new Date(event.startTime).toLocaleDateString()} · {event.mode === "Online" ? "Online" : event.city || "In person"}</span><span className="mt-1 line-clamp-2 font-poppins text-caption leading-5 text-ink/60">{event.description}</span></span><span className="shrink-0 text-right"><span className="block font-outfit font-semibold text-brand-secondary">{event.registrations}</span><span className="font-poppins text-caption text-ink/50">registered</span></span></Link></li>)}</ul> : <EmptyLine title="Your first event starts here" detail="Create an event to bring your community together." action={<Link to="/organization/events" className="mt-3 inline-flex items-center gap-2 font-outfit text-body font-medium text-brand no-underline"><FiPlus aria-hidden="true" /> Create or manage events</Link>} />}
                </div>
                <div className="rounded-3xl border border-brand-secondary/10 bg-white p-5 shadow-[0_18px_48px_-38px_var(--color-brand-secondary)] sm:p-7">
                  <p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">Giving</p><h2 className="mt-1 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">Support received</h2>
                  <div className="mt-5 rounded-2xl bg-surface-warm p-4"><p className="m-0 font-poppins text-caption text-ink/55">Verified support through KarmaCircle</p><p className="mt-1 font-outfit text-3xl font-semibold tracking-tight text-brand-secondary">{money(data.metrics.raisedViaPlatform)}</p><p className="mt-1 font-poppins text-caption text-ink/50">{data.metrics.verifiedSupporters} verified contribution{data.metrics.verifiedSupporters === 1 ? "" : "s"}</p></div>
                  {data.metrics.demoSupporters > 0 && <div className="mt-3 rounded-2xl border border-info/15 bg-info/5 p-4"><div className="flex items-baseline justify-between gap-3"><p className="m-0 font-poppins text-caption font-medium text-info">Sample activity</p><p className="m-0 font-outfit text-xl font-semibold text-brand-secondary">{money(data.metrics.demoRaisedViaPlatform)}</p></div><p className="mt-1 font-poppins text-caption text-ink/55">{data.metrics.demoSupporters} sample contribution{data.metrics.demoSupporters === 1 ? "" : "s"} · no money was collected</p></div>}
                  {data.supporters.length ? <ul className="mt-4 flex list-none flex-col gap-3 p-0">{data.supporters.slice(0, 5).map((supporter, index) => <li key={`${supporter.supportedAt}-${index}`} className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><FiHeart aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate font-poppins text-body text-brand-secondary">{supporter.name}{supporter.isDemo && <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 font-outfit text-caption text-info">Sample</span>}</span><span className="font-poppins text-caption text-ink/45">{new Date(supporter.supportedAt).toLocaleDateString()}</span></span><span className="font-outfit font-semibold text-brand-secondary">{money(supporter.amount, supporter.currency)}</span></li>)}</ul> : <EmptyLine title="No supporters yet" detail="Verified contributions will appear here when people support your organization." />}
                </div>
              </section>
              <p className="mt-7 text-right font-poppins text-caption text-ink/40">Dashboard refreshes every minute. Profile view tracking began when this version went live.</p>
            </>
          )}
        </div>
      </main>
    </OrganizationSetupGate>
  );
};

const Metric = ({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) => (
  <article className="rounded-2xl border border-brand-secondary/10 bg-white p-4 shadow-[0_14px_38px_-34px_var(--color-brand-secondary)] sm:p-5"><span className="flex size-9 items-center justify-center rounded-xl bg-brand/8 text-brand">{icon}</span><p className="mt-3 mb-0 font-poppins text-caption text-ink/55">{label}</p><p className="mt-0.5 mb-0 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">{value}</p><p className="mt-0.5 mb-0 font-poppins text-caption text-ink/45">{detail}</p></article>
);

const EmptyLine = ({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) => <div className="mt-5 rounded-2xl bg-surface-warm p-4"><p className="m-0 font-outfit font-semibold text-brand-secondary">{title}</p><p className="mt-1 font-poppins text-caption leading-5 text-ink/55">{detail}</p>{action}</div>;

const DashboardMessage = ({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) => <div role={error ? "alert" : "status"} className="mt-8 rounded-2xl border border-brand-secondary/10 bg-white p-6"><p className="m-0 font-outfit text-lg font-semibold text-brand-secondary">{title}</p><p className="mt-1 font-poppins text-body text-ink/60">{detail}</p></div>;

const Detail = ({ label, value, href }: { label: string; value?: string; href?: string }) => <div className="rounded-2xl border border-brand-secondary/10 bg-white p-4"><p className="m-0 font-poppins text-caption text-ink/50">{label}</p>{href && value ? <a href={href} className="mt-1 block font-poppins text-body font-medium break-all text-brand-secondary no-underline hover:text-brand">{value}</a> : <p className="mt-1 mb-0 font-poppins text-body font-medium text-brand-secondary">{value || "Not added"}</p>}</div>;

export default Dashboard;
