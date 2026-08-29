import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

async function signupAndGetCookie() {
  const res = await request(app).post("/auth/signup").send({
    email: "host@example.com",
    password: "hunter2",
    name: "Test Host",
  });

  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error("signup did not return a Token cookie");
  }
  return cookie;
}

const validOnlineEvent = {
  uid: "test-event-1",
  name: "Test Event",
  description: "A test event",
  coverImage: "https://example.com/cover.png",
  mode: "Online",
  startTime: "2026-01-01T10:00:00.000Z",
  endTime: "2026-01-01T12:00:00.000Z",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-01T00:00:00.000Z",
};

describe("Events", () => {
  it("rejects event creation without authentication", async () => {
    const res = await request(app)
      .post("/events/create")
      .send(validOnlineEvent);
    expect(res.status).toBe(401);
  });

  it("creates an event for the authenticated host", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    expect(res.status).toBe(201);
    expect(res.body.savedEvent.uid).toBe(validOnlineEvent.uid);
    expect(res.body.savedEvent.hostUsername).toBeDefined();
  });

  it("filters the list to one host's own events with ?host=", async () => {
    const cookie = await signupAndGetCookie();

    const created = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "host-filter-event" });
    expect(created.status).toBe(201);

    const host = created.body.savedEvent.hostUsername;

    const mine = await request(app).get("/events").query({ host });
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThan(0);
    expect(
      mine.body.data.every(
        (event: { hostUsername: string }) => event.hostUsername === host,
      ),
    ).toBe(true);
    expect(mine.body.pagination.total).toBe(mine.body.data.length);

    // Someone else's handle returns an empty page, not everyone's events.
    const theirs = await request(app)
      .get("/events")
      .query({ host: "nobody-by-that-name" });
    expect(theirs.status).toBe(200);
    expect(theirs.body.data).toHaveLength(0);
  });

  it("rejects an Offline event missing location fields with 400", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "test-event-2", mode: "Offline" });

    expect(res.status).toBe(400);
  });

  it("lists all events, paginated", async () => {
    const cookie = await signupAndGetCookie();
    await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    const res = await request(app).get("/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("paginates across multiple pages with skip/limit math", async () => {
    const cookie = await signupAndGetCookie();
    for (const uid of ["multi-1", "multi-2", "multi-3"]) {
      await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send({ ...validOnlineEvent, uid });
    }

    const page1 = await request(app).get("/events?page=1&limit=2");
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const page2 = await request(app).get("/events?page=2&limit=2");
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const uidsSeen = new Set(
      [...page1.body.data, ...page2.body.data].map(
        (e: { uid: string }) => e.uid,
      ),
    );
    expect(uidsSeen.size).toBe(3);
  });

  it("rejects an out-of-range limit with 400", async () => {
    const res = await request(app).get("/events?limit=101");
    expect(res.status).toBe(400);
  });

  it("finds a single event by uid", async () => {
    const cookie = await signupAndGetCookie();
    await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    const res = await request(app).get(`/events?uid=${validOnlineEvent.uid}`);

    expect(res.status).toBe(200);
    expect(res.body.uid).toBe(validOnlineEvent.uid);
  });

  it("returns 404 for an unknown event uid", async () => {
    const res = await request(app).get("/events?uid=does-not-exist");
    expect(res.status).toBe(404);
  });
});
