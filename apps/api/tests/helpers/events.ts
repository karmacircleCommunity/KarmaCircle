import type { Server } from "node:http";
import request from "supertest";
import { Event, EventRegistration } from "../../src/modules/events/event.model";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const MEETING_LINK = "https://zoom.example.com/j/secret-123";

/** The times of an event starting `startsInMs` from now and lasting two hours. */
export function eventTimes(startsInMs = DAY_MS, lastsMs = 2 * HOUR_MS) {
  const start = new Date(Date.now() + startsInMs);
  const end = new Date(start.getTime() + lastsMs);
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/** A complete, publishable online event as the create route takes it. */
export function eventBody(
  uid: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    uid,
    name: "Beach clean-up drive",
    description: "Join us to clean the beach and sort the waste together",
    coverImage: "https://example.com/cover.png",
    mode: "Online",
    platform: "Zoom Meeting",
    platformLink: MEETING_LINK,
    ...eventTimes(),
    ...overrides,
  };
}

export const venue = {
  address: "12 River Road",
  city: "Guwahati",
  state: "Assam",
  country: "India",
};

/** The calls the event tests make, bound to one test server. */
export function eventApi(app: Server) {
  async function signup(email: string, name: string, userType?: string) {
    const res = await request(app)
      .post("/auth/signup")
      .send({
        email,
        password: "hunter2",
        name,
        ...(userType && { userType }),
      });
    const cookie = res.headers["set-cookie"]?.[0];
    if (!cookie) throw new Error(`signup failed: ${res.status}`);
    return cookie as string;
  }

  const as = (
    cookie: string | undefined,
    method: "get" | "post" | "patch" | "delete",
    url: string,
  ) => {
    const req = request(app)[method](url);
    if (cookie) req.set("Cookie", cookie);
    return req;
  };

  return {
    signup,
    as,
    signupHost: (email = "host@example.com", name = "Test Host") =>
      signup(email, name, "organization"),
    create: (
      cookie: string,
      uid: string,
      overrides: Record<string, unknown> = {},
    ) => as(cookie, "post", "/events/create").send(eventBody(uid, overrides)),
    patch: (cookie: string, uid: string, body: Record<string, unknown>) =>
      as(cookie, "patch", `/events/${uid}`).send(body),
    join: (cookie: string, uid: string, body: Record<string, unknown> = {}) =>
      as(cookie, "post", `/events/${uid}/join`).send(body),
    /** Approves or declines the registration of `email`, as the host. */
    decide: async (
      host: string,
      uid: string,
      email: string,
      action: "approve" | "decline",
    ) => {
      const row = await EventRegistration.findOne({
        eventUid: uid,
        attendeeEmail: email,
      });
      if (!row) throw new Error(`no registration for ${email} on ${uid}`);
      return as(host, "post", `/events/${uid}/attendees/${row.id}/${action}`);
    },
    stored: async (uid: string) => {
      const event = await Event.findOne({ uid }).lean();
      if (!event) throw new Error(`no event ${uid}`);
      return event;
    },
  };
}
