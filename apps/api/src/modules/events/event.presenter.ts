import { findByEmail } from "../users/user.service";
import { EventRegistration, IEvent } from "./event.model";
import { GOING, findHostIdentity, isHostedBy } from "./event.service";

/** An event as a client receives it. */
export type PresentedEvent = Record<string, unknown> & {
  uid: string;
  platformLink?: string;
};

/**
 * The one way an event document becomes a response. Serializing an event drops
 * its meeting link (see the `toJSON` transform in event.model.ts); this puts it
 * back only for the organization that hosts the event and for people whose
 * registration is going. Send every event a client receives through here: a route
 * that forgets can only ever hide the link, never leak it.
 *
 * `viewerEmail` is the signed-in caller (from `requireAuth` or `optionalAuth`),
 * absent for a visitor. A whole list costs the same few queries as one event.
 */
export async function presentEvents(
  events: IEvent[],
  viewerEmail?: string,
): Promise<PresentedEvent[]> {
  const linkVisible = await findEventsShowingLink(events, viewerEmail);

  return events.map((event) => {
    const json = event.toJSON() as unknown as PresentedEvent;
    return linkVisible.has(event.uid)
      ? { ...json, platformLink: event.platformLink }
      : json;
  });
}

export async function presentEvent(event: IEvent, viewerEmail?: string) {
  const [presented] = await presentEvents([event], viewerEmail);
  return presented;
}

/** The `uid`s, among `events`, whose meeting link the viewer may read. */
async function findEventsShowingLink(
  events: IEvent[],
  viewerEmail: string | undefined,
): Promise<Set<string>> {
  const withLink = events.filter((event) => event.platformLink);
  if (!viewerEmail || withLink.length === 0) return new Set();

  const viewer = await findByEmail(viewerEmail);
  if (!viewer) return new Set();

  const host = await findHostIdentity(viewer);
  const hosts = (event: IEvent) => host !== null && isHostedBy(event, host);
  const visible = new Set(withLink.filter(hosts).map((event) => event.uid));

  const others = withLink.filter((event) => !hosts(event));
  if (others.length > 0) {
    const going = await EventRegistration.find({
      userId: viewer._id,
      eventUid: { $in: others.map((event) => event.uid) },
      ...GOING,
    })
      .select({ eventUid: 1 })
      .lean();
    for (const registration of going) visible.add(registration.eventUid);
  }

  return visible;
}
