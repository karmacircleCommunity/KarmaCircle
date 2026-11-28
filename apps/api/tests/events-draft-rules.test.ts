import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { eventApi, eventBody, eventTimes, venue } from "./helpers/events";
import { Event } from "../src/modules/events/event.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOrganizationSetupReminder: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();
const api = eventApi(app);

const LENGTH_MESSAGE = "Description should be between 20 and 200 characters";

/** Everything a draft must have, and nothing more. */
const minimal = (uid: string, mode = "Online") => ({
  uid,
  name: "A bare draft event",
  mode,
  ...eventTimes(),
});

const OPTIONAL_TEXTS = [
  "description",
  "coverImage",
  "address",
  "city",
  "state",
  "country",
  "platform",
  "platformLink",
] as const;

const publishIssues = {
  description: "Add a description before publishing",
  coverImage: "Add a cover image before publishing",
  city: "Add a city before publishing",
  state: "Add a state before publishing",
  country: "Add a country before publishing",
  address: "Add an address before publishing",
  platform: "Add a platform before publishing",
  platformLink: "Add a meeting link before publishing",
};
type Field = keyof typeof publishIssues;

const NEEDED: Record<string, Field[]> = {
  Online: ["description", "coverImage", "platform", "platformLink"],
  Offline: ["description", "coverImage", "city", "state", "country", "address"],
  Hybrid: [
    "description",
    "coverImage",
    "city",
    "state",
    "country",
    "address",
    "platform",
    "platformLink",
  ],
};

const issuesFor = (mode: string) =>
  NEEDED[mode].map((path) => ({ path, message: publishIssues[path] }));

describe("Draft and publishing rules", () => {
  let host: string;
  beforeEach(async () => {
    host = await api.signupHost();
  });

  const post = (body: Record<string, unknown>) =>
    api.as(host, "post", "/events/create").send(body);
  const publish = (uid: string) =>
    api.as(host, "post", `/events/${uid}/publish`);

  describe("creating a draft", () => {
    it.each(["Online", "Offline", "Hybrid"])(
      "needs only a name, address, mode and times (%s)",
      async (mode) => {
        const res = await post({
          ...minimal("bare", mode),
          status: "draft",
        });

        expect(res.status).toBe(201);
        expect(res.body.savedEvent.status).toBe("draft");
        const saved = await api.stored("bare");
        for (const field of OPTIONAL_TEXTS) {
          expect(saved).not.toHaveProperty(field);
        }
      },
    );

    it.each([
      ["empty strings", ""],
      ["spaces", "   "],
      ["null", null],
    ])("reads %s as not provided", async (_label, value) => {
      const blanks = Object.fromEntries(
        OPTIONAL_TEXTS.map((field) => [field, value]),
      );
      const res = await post({
        ...minimal("blank", "Hybrid"),
        ...blanks,
        status: "draft",
      });

      expect(res.status).toBe(201);
      const saved = await api.stored("blank");
      for (const field of OPTIONAL_TEXTS) {
        expect(saved).not.toHaveProperty(field);
      }
    });

    it("takes a description shorter than the publishing minimum", async () => {
      const res = await post({
        ...minimal("short"),
        description: "Soon",
        status: "draft",
      });
      expect(res.status).toBe(201);
      expect(res.body.savedEvent.description).toBe("Soon");
    });

    it.each([
      ["description", "x".repeat(201)],
      ["coverImage", "http://example.com/insecure.png"],
      ["coverImage", "data:image/png;base64,iVBORw0KGgo="],
      ["city", "x".repeat(101)],
      ["state", "x".repeat(101)],
      ["country", "x".repeat(101)],
      ["address", "x".repeat(201)],
      ["platform", "x".repeat(61)],
      ["platformLink", "ftp://example.com/room"],
      ["platformLink", `https://example.com/${"x".repeat(2048)}`],
      ["name", "Too short"],
      ["name", "          "],
    ])("still checks a %s that is provided", async (field, value) => {
      const res = await post({
        ...minimal("checked", "Hybrid"),
        [field]: value,
        status: "draft",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
      expect(res.body.errors[0].path).toBe(field);
      expect(res.body.errors[0].message).toEqual(expect.any(String));
      expect(await Event.countDocuments({})).toBe(0);
    });

    it.each(["uid", "name", "mode", "startTime", "endTime"])(
      "still needs %s",
      async (field) => {
        const res = await post({
          ...minimal("missing"),
          [field]: undefined,
          status: "draft",
        });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].path).toBe(field);
      },
    );
  });

  describe("publishing on create", () => {
    it.each([
      ["no status", undefined],
      ["status published", "published"],
    ])("needs the whole listing with %s", async (_label, status) => {
      for (const mode of ["Online", "Offline", "Hybrid"]) {
        const res = await post({ ...minimal("full", mode), status });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: "Validation failed",
          errors: issuesFor(mode),
        });
      }
      expect(await Event.countDocuments({})).toBe(0);
    });

    it("reports a short description with the length message", async () => {
      const res = await post(eventBody("short", { description: "Soon" }));
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([
        { path: "description", message: LENGTH_MESSAGE },
      ]);
    });

    it("does not count padding toward the minimum", async () => {
      const res = await post(
        eventBody("padded", { description: `Soon${" ".repeat(30)}` }),
      );
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("description");
    });
  });

  describe("POST /events/:uid/publish", () => {
    it.each(["Online", "Offline", "Hybrid"])(
      "lists everything a bare %s draft still needs",
      async (mode) => {
        await post({ ...minimal("bare", mode), status: "draft" }).expect(201);

        const res = await publish("bare");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: "Validation failed",
          errors: issuesFor(mode),
        });
        expect((await api.stored("bare")).status).toBe("draft");
      },
    );

    it.each([
      ["description", undefined, publishIssues.description],
      ["description", "Soon", LENGTH_MESSAGE],
      ["coverImage", undefined, publishIssues.coverImage],
    ])("checks the %s (%s)", async (field, value, message) => {
      await api
        .create(host, "nearly", { [field]: value, status: "draft" })
        .expect(201);

      const res = await publish("nearly");
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: field, message }]);
    });

    it("publishes once the draft is filled in", async () => {
      await post({ ...minimal("filled", "Offline"), status: "draft" }).expect(
        201,
      );
      await api
        .patch(host, "filled", {
          ...venue,
          description: "Now long enough to be published",
          coverImage: "https://example.com/cover.png",
        })
        .expect(200);

      const res = await publish("filled");
      expect(res.status).toBe(200);
      expect(res.body.event.status).toBe("published");
    });
  });

  describe("editing", () => {
    it("lets a draft be emptied and changed freely", async () => {
      await api.create(host, "loose", { status: "draft" }).expect(201);

      const res = await api.patch(host, "loose", {
        description: "",
        coverImage: null,
        platform: "",
        platformLink: null,
      });
      expect(res.status).toBe(200);
      const saved = await api.stored("loose");
      for (const field of [
        "description",
        "coverImage",
        "platform",
        "platformLink",
      ]) {
        expect(saved).not.toHaveProperty(field);
      }

      await api.patch(host, "loose", { mode: "Offline" }).expect(200);
      await api.patch(host, "loose", { description: "Soon" }).expect(200);
    });

    it("still checks what a draft edit provides", async () => {
      await api.create(host, "loose", { status: "draft" }).expect(201);

      const long = await api.patch(host, "loose", {
        description: "x".repeat(201),
      });
      expect(long.status).toBe(400);
      const link = await api.patch(host, "loose", {
        platformLink: "ftp://example.com",
      });
      expect(link.status).toBe(400);
      expect(link.body.errors[0].path).toBe("platformLink");
    });

    it.each([
      ["description", "", "A published event needs a description"],
      ["description", null, "A published event needs a description"],
      ["description", "Soon", LENGTH_MESSAGE],
      ["coverImage", "", "A published event needs a cover image"],
      ["coverImage", null, "A published event needs a cover image"],
      ["platform", "", "A published event needs a platform"],
      ["platformLink", null, "A published event needs a meeting link"],
    ])(
      "keeps a published event complete (%s set to %s)",
      async (field, value, message) => {
        await api.create(host, "live").expect(201);
        const before = await api.stored("live");

        const res = await api.patch(host, "live", { [field]: value });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: "Validation failed",
          errors: [{ path: field, message }],
        });
        expect(await api.stored("live")).toEqual(before);
      },
    );

    it("asks a published event for the new mode's fields", async () => {
      await api.create(host, "live").expect(201);
      const res = await api.patch(host, "live", { mode: "Offline" });
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual([
        "city",
        "state",
        "country",
        "address",
      ]);
    });

    it("lets an older published event without a cover or a long description fix other things", async () => {
      await api.create(host, "older").expect(201);
      await Event.collection.updateOne(
        { uid: "older" },
        { $set: { description: "Old", coverImage: "" }, $unset: { status: 1 } },
      );

      const res = await api.patch(host, "older", {
        name: "A corrected event name",
      });
      expect(res.status).toBe(200);
    });

    it("holds an unpublished event to the draft rules again", async () => {
      await api.create(host, "back").expect(201);
      await api.as(host, "post", "/events/back/unpublish").expect(200);
      await api.patch(host, "back", { description: "" }).expect(200);
      expect((await publish("back")).status).toBe(400);
    });
  });

  it("serves a bare draft to its host and nobody else", async () => {
    await post({ ...minimal("bare"), status: "draft" }).expect(201);
    const handle = (await api.stored("bare")).organizerHandle;

    const own = await api.as(host, "get", "/events?uid=bare");
    expect(own.status).toBe(200);
    expect(own.body).not.toHaveProperty("description");
    expect(
      (await api.as(host, "get", `/events?host=${handle}`)).body.data,
    ).toHaveLength(1);
    expect((await request(app).get("/events?uid=bare")).status).toBe(404);
  });
});
