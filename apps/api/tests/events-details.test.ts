import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event } from "../src/modules/events/event.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

async function signupHost() {
  const res = await request(app).post("/auth/signup").send({
    email: "host@example.com",
    password: "hunter2",
    name: "Test Host",
    userType: "organization",
  });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("signup failed: " + res.status);
  return cookie as string;
}

function eventBody(uid: string, overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + DAY_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  return {
    uid,
    name: "Beach clean-up drive",
    description: "Join us to clean the beach and sort the waste together",
    coverImage: "https://example.com/cover.png",
    mode: "Offline",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    address: "Juhu Beach, gate 2",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ...overrides,
  };
}

const create = (cookie: string, uid: string, overrides = {}) =>
  request(app)
    .post("/events/create")
    .set("Cookie", cookie)
    .send(eventBody(uid, overrides));
const patch = (cookie: string, uid: string, body: unknown) =>
  request(app)
    .patch(`/events/${uid}`)
    .set("Cookie", cookie)
    .send(body as object);
const stored = async (uid: string) => (await Event.findOne({ uid }).lean())!;

const richDetails = {
  about: ["We meet at the gate.", "Gloves and bags are provided."],
  contactEmail: "volunteer@riverbend.example",
  cost: { amount: 250, currency: "inr", note: "Covers snacks and gloves" },
  bringAlong: ["Water bottle", "Sun hat"],
  languages: ["English", "Hindi"],
  minimumAge: 12,
  agenda: [
    { time: "9:00 am", title: "Welcome", detail: "Briefing at the gate" },
    { time: "10:00 am", title: "Clean-up" },
  ],
  gettingThere: "Take the road behind the temple and follow the signs.",
};

describe("Rich event details (PG-7)", () => {
  describe("creating", () => {
    it("saves every optional detail the event page can show", async () => {
      const host = await signupHost();
      const res = await create(host, "rich-create", richDetails);
      expect(res.status).toBe(201);

      const event = await stored("rich-create");
      expect(event.about).toEqual(richDetails.about);
      expect(event.contactEmail).toBe("volunteer@riverbend.example");
      expect(event.cost).toEqual({
        amount: 250,
        currency: "INR",
        note: "Covers snacks and gloves",
      });
      expect(event.bringAlong).toEqual(richDetails.bringAlong);
      expect(event.languages).toEqual(richDetails.languages);
      expect(event.minimumAge).toBe(12);
      expect(event.agenda).toEqual(richDetails.agenda);
      expect(event.gettingThere).toBe(richDetails.gettingThere);
    });

    it("is not required: a basic event stays valid and has none of them", async () => {
      const host = await signupHost();
      expect((await create(host, "rich-none")).status).toBe(201);
      const event = await stored("rich-none");
      expect(event.about).toEqual([]);
      expect(event.cost).toBeUndefined();
      expect(event.minimumAge).toBeUndefined();
      expect(event.contactEmail).toBeUndefined();
    });

    it("ignores null on create (null only means 'remove' when editing)", async () => {
      const host = await signupHost();
      const res = await create(host, "rich-null", {
        cost: null,
        minimumAge: null,
        contactEmail: null,
        gettingThere: null,
      });
      expect(res.status).toBe(201);
      const event = await stored("rich-null");
      expect(event.cost).toBeUndefined();
      expect(event.minimumAge).toBeUndefined();
    });

    it("keeps only the chosen mode's fields", async () => {
      const host = await signupHost();
      await create(host, "rich-online", {
        mode: "Online",
        platform: "Zoom Meeting",
        platformLink: "https://zoom.example.com/j/1",
        linkDelivery: "Emailed the day before",
        joinRequirements: "A working camera",
        gettingThere: "Should not be stored for an online event",
      }).expect(201);

      const online = await stored("rich-online");
      expect(online.linkDelivery).toBe("Emailed the day before");
      expect(online.joinRequirements).toBe("A working camera");
      expect(online.gettingThere).toBeUndefined();

      await create(host, "rich-offline", {
        linkDelivery: "Should not be stored for an in-person event",
        gettingThere: "Use the north gate",
      }).expect(201);
      const offline = await stored("rich-offline");
      expect(offline.gettingThere).toBe("Use the north gate");
      expect(offline.linkDelivery).toBeUndefined();
    });

    it("never accepts the server-only trust badge or an unsupported fundraiser", async () => {
      const host = await signupHost();
      await create(host, "rich-badge", {
        isGovernmentSponsored: true,
        fundraiser: {
          purpose: "x",
          goal: 1,
          raised: 1,
          currency: "INR",
          supporters: 1,
        },
      }).expect(201);
      const event = await stored("rich-badge");
      expect(event.isGovernmentSponsored).toBe(false);
      expect(event.fundraiser).toBeUndefined();
    });
  });

  describe("validation", () => {
    it.each([
      ["contactEmail", "not-an-email"],
      ["cost", { amount: 0, currency: "INR" }],
      ["cost", { amount: -5, currency: "INR" }],
      ["cost", { amount: 10, currency: "rupees" }],
      ["cost", { amount: 10, currency: "INR", extra: true }],
      ["cost", { amount: 10_000_001, currency: "INR" }],
      ["minimumAge", 0],
      ["minimumAge", 121],
      ["minimumAge", 12.5],
      ["bringAlong", [""]],
      ["bringAlong", Array.from({ length: 21 }, (_, i) => `item ${i}`)],
      ["about", Array.from({ length: 21 }, (_, i) => `paragraph ${i}`)],
      ["about", ["x".repeat(2001)]],
      ["languages", Array.from({ length: 11 }, (_, i) => `lang${i}`)],
      ["agenda", [{ time: "", title: "No time" }]],
      ["agenda", [{ time: "9 am", title: "" }]],
      ["agenda", [{ time: "9 am", title: "x", sneaky: 1 }]],
      [
        "agenda",
        Array.from({ length: 31 }, () => ({ time: "9 am", title: "x" })),
      ],
      ["gettingThere", "x".repeat(501)],
    ])("rejects an invalid %s on create (case %#)", async (field, value) => {
      const host = await signupHost();
      const res = await create(host, "rich-invalid", { [field]: value });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path.split(".")[0]).toBe(field);
    });

    it("trims text and upper-cases the currency", async () => {
      const host = await signupHost();
      await create(host, "rich-trim", {
        contactEmail: "  hello@example.com  ",
        cost: { amount: 5, currency: " usd " },
        bringAlong: ["  gloves  "],
      }).expect(201);
      const event = await stored("rich-trim");
      expect(event.contactEmail).toBe("hello@example.com");
      expect(event.cost?.currency).toBe("USD");
      expect(event.bringAlong).toEqual(["gloves"]);
    });
  });

  describe("editing", () => {
    it("adds details to an existing event and leaves the rest alone", async () => {
      const host = await signupHost();
      await create(host, "rich-edit-add").expect(201);

      const res = await patch(host, "rich-edit-add", richDetails);
      expect(res.status).toBe(200);
      expect(res.body.event.about).toEqual(richDetails.about);
      expect(res.body.event.cost.amount).toBe(250);
      expect(res.body.event.name).toBe("Beach clean-up drive");
    });

    it("removes a field with null and a list with an empty array", async () => {
      const host = await signupHost();
      await create(host, "rich-edit-clear", richDetails).expect(201);

      const res = await patch(host, "rich-edit-clear", {
        cost: null,
        minimumAge: null,
        contactEmail: null,
        gettingThere: null,
        about: [],
        agenda: [],
        bringAlong: [],
        languages: [],
      });
      expect(res.status).toBe(200);

      const event = await stored("rich-edit-clear");
      expect(event.cost).toBeUndefined();
      expect(event.minimumAge).toBeUndefined();
      expect(event.contactEmail).toBeUndefined();
      expect(event.gettingThere).toBeUndefined();
      expect(event.about).toEqual([]);
      expect(event.agenda ?? []).toEqual([]);
      expect(event.bringAlong).toEqual([]);
      expect(event.languages).toEqual([]);
    });

    it("leaves a detail alone when the body does not mention it", async () => {
      const host = await signupHost();
      await create(host, "rich-edit-keep", richDetails).expect(201);

      await patch(host, "rich-edit-keep", {
        name: "Renamed clean-up drive",
      }).expect(200);

      const event = await stored("rich-edit-keep");
      expect(event.cost?.amount).toBe(250);
      expect(event.about).toEqual(richDetails.about);
      expect(event.agenda).toHaveLength(2);
    });

    it("validates edited details like create", async () => {
      const host = await signupHost();
      await create(host, "rich-edit-bad").expect(201);

      const res = await patch(host, "rich-edit-bad", {
        cost: { amount: 0, currency: "INR" },
      });
      expect(res.status).toBe(400);
      expect((await stored("rich-edit-bad")).cost).toBeUndefined();
    });

    it("drops the other mode's detail fields when the mode changes", async () => {
      const host = await signupHost();
      await create(host, "rich-edit-mode", {
        gettingThere: "Use the north gate",
      }).expect(201);

      await patch(host, "rich-edit-mode", {
        mode: "Online",
        platform: "Google Meet",
        platformLink: "https://meet.example.com/abc",
        linkDelivery: "Emailed an hour before",
      }).expect(200);

      const event = await stored("rich-edit-mode");
      expect(event.gettingThere).toBeUndefined();
      expect(event.linkDelivery).toBe("Emailed an hour before");

      await patch(host, "rich-edit-mode", {
        mode: "Offline",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        address: "FC Road",
      }).expect(200);
      expect((await stored("rich-edit-mode")).linkDelivery).toBeUndefined();
    });
  });

  it("returns the details on the public event so the page can show them", async () => {
    const host = await signupHost();
    await create(host, "rich-public", richDetails).expect(201);

    const res = await request(app).get("/events").query({ uid: "rich-public" });
    expect(res.body).toMatchObject({
      about: richDetails.about,
      contactEmail: "volunteer@riverbend.example",
      minimumAge: 12,
      languages: ["English", "Hindi"],
    });
    expect(res.body.cost).toMatchObject({ amount: 250, currency: "INR" });
    expect(res.body.agenda).toHaveLength(2);
  });
});
