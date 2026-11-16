import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import useSWR from "swr";
import { Footer, Navbar } from "@components";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { EventForm } from "@features/events/components/CreateEvents";
import { eventToFormState } from "@features/events/utils/eventToFormState";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import type { ApiEvent } from "@features/events/types";
import type { ReactNode } from "react";

/**
 * Edit one of the organization's own events, routed at
 * `/organization/events/:eventId/edit` behind `RequireSignIn` (PG-1).
 *
 * Loads the stored event, checks in the browser that it belongs to the signed
 * in organization (the API checks again and is the real gate), then hands it
 * to the same `EventForm` the create page uses. A cancelled event, or one that
 * has already ended, cannot be edited, so those show a short explanation
 * instead of the form. The fetch does not revalidate on focus: a refresh in
 * the middle of editing would swap the event the unsaved changes are measured
 * against.
 */
const EditEvent = () => {
  const { eventId } = useParams();
  const { organization, isLoading: organizationLoading } = useMyOrganization();
  const { data, error, isLoading } = useSWR<ApiEvent>(
    eventId ? eventEndpoints.byUid(eventId) : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading || organizationLoading) {
    return (
      <Shell>
        <p className="font-poppins text-body text-ink/55">Loading event…</p>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <Message
          title="We couldn’t find that event"
          body={`There is no event at /${eventId ?? "unknown"}. It may have been mistyped.`}
        />
      </Shell>
    );
  }

  const ownsEvent =
    organization !== undefined &&
    (data.organizerHandle === organization.handle ||
      data.hostUsername === organization.handle);
  if (!ownsEvent) {
    return (
      <Shell>
        <Message
          title="You can only edit your own events"
          body="This event is hosted by another organization, so only they can change it."
        />
      </Shell>
    );
  }

  if (data.status === "cancelled") {
    return (
      <Shell>
        <Message
          title="This event was cancelled"
          body="A cancelled event can’t be edited. It stays on the site marked as cancelled."
        />
      </Shell>
    );
  }

  if (new Date(data.endTime).getTime() < Date.now()) {
    return (
      <Shell>
        <Message
          title="This event has already ended"
          body="An event that has taken place can’t be edited."
        />
      </Shell>
    );
  }

  return (
    <EventForm
      key={data._id}
      initial={eventToFormState(data)}
      original={data}
    />
  );
};

const Shell = ({ children }: { children: ReactNode }) => (
  <>
    <Navbar />
    <main className="mx-auto min-h-[50vh] max-w-2xl px-9 py-16 sm:px-10 lg:px-12 lg:py-24">
      {children}
    </main>
    <Footer />
  </>
);

const Message = ({ title, body }: { title: string; body: string }) => (
  <div className="flex flex-col items-start">
    <h1 className="m-0 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
      {title}
    </h1>
    <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
      {body}
    </p>
    <Link
      to="/organization/events"
      className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-poppins text-body font-medium text-white no-underline transition-colors hover:bg-brand-hover"
    >
      <FiArrowLeft aria-hidden="true" /> Back to your events
    </Link>
  </div>
);

export default EditEvent;
