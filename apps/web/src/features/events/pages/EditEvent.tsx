import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { Footer, Navbar } from "@components";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { EventForm } from "@features/events/components/CreateEvents";
import { useEventSnapshot } from "@features/events/hooks/useEventSnapshot";
import { editBlocker, isMissingEvent } from "@features/events/utils/editEvent";
import { eventToFormState } from "@features/events/utils/eventToFormState";
import { hostingPath } from "@features/events/utils/myEvents";
import type { EditBlocker } from "@features/events/types";
import type { ReactNode } from "react";

const BLOCKED: Record<EditBlocker, { title: string; body: string }> = {
  foreign: {
    title: "You can only edit your own events",
    body: "This event is hosted by another organization, so only they can change it.",
  },
  cancelled: {
    title: "This event was cancelled",
    body: "A cancelled event can’t be edited. It stays on the site marked as cancelled.",
  },
  ended: {
    title: "This event has already ended",
    body: "An event that has taken place can’t be edited.",
  },
  "draft-expired": {
    title: "This draft’s dates have passed",
    body: "A draft can’t be edited after its end date. You can delete it from your events and create it again.",
  },
};

/**
 * Edit one of the organization's own events, routed at
 * `/organization/events/:eventId/edit` behind `RequireSignIn` (PG-1).
 *
 * Loads the stored event, checks in the browser that it belongs to the signed
 * in organization (the API checks again and is the real gate), then hands it
 * to the same `EventForm` the create page uses. A cancelled event, or one that
 * has already ended, cannot be edited, so those show a short explanation
 * instead of the form.
 *
 * The form starts only from a copy fetched by this visit, never from one
 * cached by an earlier page, and that copy then stays put until the form saves
 * (`useEventSnapshot`). A load that fails says so and offers another try.
 */
const EditEvent = () => {
  const { eventId } = useParams();
  const {
    organization,
    isOrganization,
    isLoading: organizationLoading,
    mutate: reloadOrganization,
  } = useMyOrganization();
  const { event, loadedAt, error, isLoading, retry, replace } =
    useEventSnapshot(eventId);

  if (isLoading || organizationLoading) {
    return (
      <Shell>
        <p role="status" className="font-poppins text-body text-ink/65">
          Loading event…
        </p>
      </Shell>
    );
  }

  if (isMissingEvent(error)) {
    return (
      <Shell>
        <Message
          title="We couldn’t find that event"
          body={`There is no event at /${eventId ?? "unknown"}. It may have been mistyped.`}
        />
      </Shell>
    );
  }

  // Without the organization's own record nobody can say whose event this is.
  if (!event || (isOrganization && !organization)) {
    return (
      <Shell>
        <Message
          title="Could not load this event"
          body="Check your connection and try again."
          onRetry={() => {
            retry();
            void reloadOrganization();
          }}
        />
      </Shell>
    );
  }

  const blocker = editBlocker(event, organization?.handle, loadedAt);
  if (blocker) {
    return (
      <Shell>
        <Message {...BLOCKED[blocker]} />
      </Shell>
    );
  }

  return (
    <EventForm
      key={event._id}
      initial={eventToFormState(event)}
      original={event}
      onStored={replace}
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

const Message = ({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-start">
    <h1 className="m-0 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
      {title}
    </h1>
    <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
      {body}
    </p>
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full border border-brand/35 bg-transparent px-6 font-poppins text-body font-medium text-brand transition-colors hover:bg-brand/8 hover:text-brand-hover"
        >
          Try again
        </button>
      )}
      <Link
        to={hostingPath()}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-poppins text-body font-medium text-white no-underline transition-colors hover:bg-brand-hover"
      >
        <FiArrowLeft aria-hidden="true" /> Back to my events
      </Link>
    </div>
  </div>
);

export default EditEvent;
