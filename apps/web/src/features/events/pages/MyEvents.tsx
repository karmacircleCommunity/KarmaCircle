import { useSelector } from "react-redux";
import { FiPlus } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import { Footer, Navbar } from "@components";
import { selectUser } from "@app/store/slices/userSlice";
import AttendingEvents from "@features/events/components/AttendingEvents";
import HostedEvents from "@features/events/components/HostedEvents";
import MyEventsTabs from "@features/events/components/MyEventsTabs";
import {
  ATTENDING_LISTS,
  HOSTING_LISTS,
} from "@features/events/constants/myEvents";
import type { MyEventsView } from "@features/events/types";
import {
  myEventsList,
  myEventsSearch,
  myEventsView,
} from "@features/events/utils/myEvents";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";

const VIEWS: ReadonlyArray<{ value: MyEventsView; label: string }> = [
  { value: "attending", label: "Attending" },
  { value: "hosting", label: "Hosting" },
];

/**
 * A person's own events, routed at `/events/mine`. Every account has the
 * Attending view (`AttendingEvents`). An organization account also has the
 * Hosting view (`HostedEvents`), which it opens on, with a switch between the
 * two so events it goes to are never mistaken for events it runs. The view and
 * the list live in the address (`?tab=hosting&show=drafts`), so a link or the
 * Back button returns to the same one. The old `/organization/events` address
 * redirects to the Hosting view.
 */
const MyEvents = () => {
  const user = useSelector(selectUser);
  const { organization } = useMyOrganization();
  const [search, setSearch] = useSearchParams();
  const hosts = user?.userType === "organization";
  const view = myEventsView(search, hosts);
  const hosting = view === "hosting";

  // Switching tabs replaces the address, so Back leaves the page.
  const open = (...target: Parameters<typeof myEventsSearch>) =>
    setSearch(myEventsSearch(...target), { replace: true });

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-6xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 font-poppins text-sm font-medium tracking-[0.14em] text-brand uppercase">
              Your plans
            </p>
            <h1 className="mt-2 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              My events
            </h1>
            <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
              {hosting
                ? `Events ${organization?.name || "your organization"} is hosting. Only you can see your drafts.`
                : "Events you have joined or been invited to, all in one place."}
            </p>
          </div>
          {hosting && (
            <Link
              to="/organization/events/new"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-outfit text-body font-semibold text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <FiPlus aria-hidden="true" />
              Create event
            </Link>
          )}
        </header>

        {hosts ? (
          <>
            <MyEventsTabs
              label="Attending or hosting"
              idPrefix="my-events-view"
              panelId="my-events-view-panel"
              options={VIEWS}
              selected={view}
              onSelect={(next) => open(next)}
              variant="switch"
            />
            <div
              id="my-events-view-panel"
              role="tabpanel"
              aria-labelledby={`my-events-view-${view}`}
              className="mt-5"
            >
              {hosting ? (
                <HostedEvents
                  list={myEventsList(search, HOSTING_LISTS)}
                  onList={(list) => open("hosting", list)}
                />
              ) : (
                <AttendingEvents
                  list={myEventsList(search, ATTENDING_LISTS)}
                  onList={(list) => open("attending", list)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="mt-8">
            <AttendingEvents
              list={myEventsList(search, ATTENDING_LISTS)}
              onList={(list) => open("attending", list)}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default MyEvents;
