import { buildTestApp } from "./helpers/test-app";
import { eventApi, eventTimes, DAY_MS } from "./helpers/events";
import { Event, IEvent } from "../src/modules/events/event.model";
import { sendEventCancellations, sendEventUpdates } from "../src/config/mailer";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOrganizationSetupReminder: jest.fn().mockResolvedValue(true),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
  sendEventCancellations: jest.fn().mockResolvedValue(1),
  sendEventUpdates: jest.fn().mockResolvedValue(1),
}));

const app = buildTestApp();
const api = eventApi(app);

const CHANGED = "This event just changed. Reload and try again.";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

/**
 * Lets another request run in full after the next one has read the event and
 * just before it writes with `save()`: the interleaving two taps can produce,
 * made to happen every time.
 */
function beforeNextSave(meanwhile: () => PromiseLike<unknown>) {
  const original = Event.prototype.save;
  spies.push(
    jest.spyOn(Event.prototype, "save").mockImplementationOnce(async function (
      this: IEvent,
    ) {
      await meanwhile();
      return original.call(this);
    }),
  );
}

async function setUp(uid: string, overrides: Record<string, unknown> = {}) {
  const host = await api.signupHost();
  await api.create(host, uid, overrides).expect(201);
  return {
    host,
    publish: () => api.as(host, "post", `/events/${uid}/publish`),
    unpublish: () => api.as(host, "post", `/events/${uid}/unpublish`),
    cancel: () => api.as(host, "post", `/events/${uid}/cancel`),
    remove: () => api.as(host, "delete", `/events/${uid}`),
    edit: (body: Record<string, unknown>) => api.patch(host, uid, body),
    stored: () => api.stored(uid),
  };
}

describe("Two changes to one event at once", () => {
  it("does not publish a draft whose description is being cleared", async () => {
    const event = await setUp("race", { status: "draft" });
    beforeNextSave(() => event.edit({ description: "" }).expect(200));

    const published = await event.publish();

    expect(published.status).toBe(409);
    expect(published.body.message).toBe(CHANGED);
    const saved = await event.stored();
    expect(saved.status).toBe("draft");
    expect(saved).not.toHaveProperty("description");
  });

  it("does not clear the description of a draft that was just published", async () => {
    const event = await setUp("race", { status: "draft" });
    beforeNextSave(() => event.publish().expect(200));

    const edited = await event.edit({ description: "" });

    expect(edited.status).toBe(409);
    expect(edited.body.message).toBe(CHANGED);
    const saved = await event.stored();
    expect(saved.status).toBe("published");
    expect(saved.description).toBeTruthy();
  });

  it("never ends up published and incomplete when both are fired together", async () => {
    const host = await api.signupHost();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const uid = `together-${attempt}`;
      await api.create(host, uid, { status: "draft" }).expect(201);

      const results = await Promise.all([
        api.patch(host, uid, { description: "" }),
        api.as(host, "post", `/events/${uid}/publish`),
      ]);

      for (const res of results) expect([200, 400, 409]).toContain(res.status);
      const saved = await api.stored(uid);
      if (saved.status === "published") expect(saved.description).toBeTruthy();
    }
  });

  it("refuses an edit that read the event before it was cancelled, and emails no update", async () => {
    const event = await setUp("race");
    const person = await api.signup("person@example.com", "Person");
    await api.join(person, "race").expect(201);
    beforeNextSave(() => event.cancel().expect(200));

    const edited = await event.edit(eventTimes(3 * DAY_MS));

    expect(edited.status).toBe(409);
    expect(edited.body.message).toBe(CHANGED);
    expect((await event.stored()).status).toBe("cancelled");
    expect(sendEventCancellations).toHaveBeenCalledTimes(1);
    expect(sendEventUpdates).not.toHaveBeenCalled();
  });

  it("emails an update once when the same edit arrives twice", async () => {
    const event = await setUp("race");
    const person = await api.signup("person@example.com", "Person");
    await api.join(person, "race").expect(201);
    const move = eventTimes(3 * DAY_MS);
    beforeNextSave(() => event.edit(move).expect(200));

    const second = await event.edit(move);

    expect(second.status).toBe(409);
    expect(sendEventUpdates).toHaveBeenCalledTimes(1);
  });

  it("does not bring a cancelled event back as a draft", async () => {
    const event = await setUp("race");
    beforeNextSave(() => event.cancel().expect(200));

    const unpublished = await event.unpublish();

    expect(unpublished.status).toBe(409);
    expect(unpublished.body.message).toBe(CHANGED);
    expect((await event.stored()).status).toBe("cancelled");
  });

  it("does not cancel, or email about, an event that was just unpublished", async () => {
    const event = await setUp("race");
    const original = Event.findOneAndUpdate;
    spies.push(
      jest.spyOn(Event, "findOneAndUpdate").mockImplementationOnce(((
        ...args: Parameters<typeof original>
      ) =>
        event
          .unpublish()
          .expect(200)
          .then(() => original.apply(Event, args))) as never),
    );

    const cancelled = await event.cancel();

    expect(cancelled.status).toBe(409);
    expect(cancelled.body.message).toBe(CHANGED);
    expect((await event.stored()).status).toBe("draft");
    expect(sendEventCancellations).not.toHaveBeenCalled();
  });

  it("answers 409 when the draft being published has just been deleted", async () => {
    const event = await setUp("race", { status: "draft" });
    beforeNextSave(() => event.remove().expect(200));

    const published = await event.publish();

    expect(published.status).toBe(409);
    expect(published.body.message).toBe(CHANGED);
    expect(await Event.countDocuments({})).toBe(0);
  });

  it("does not delete a draft that was just published", async () => {
    const event = await setUp("race", { status: "draft" });
    const original = Event.deleteOne;
    spies.push(
      jest.spyOn(Event, "deleteOne").mockImplementationOnce(((
        ...args: Parameters<typeof original>
      ) =>
        event
          .publish()
          .expect(200)
          .then(() => original.apply(Event, args))) as never),
    );

    const removed = await event.remove();

    expect(removed.status).toBe(409);
    expect(removed.body.message).toBe(CHANGED);
    expect((await event.stored()).status).toBe("published");
  });

  it("never makes an organizer's save fail because people are joining", async () => {
    const event = await setUp("busy", { capacity: 10 });
    const first = await api.signup("first@example.com", "First");
    const second = await api.signup("second@example.com", "Second");
    await api.join(first, "busy").expect(201);
    beforeNextSave(async () => {
      await api.join(second, "busy").expect(201);
      await api.as(first, "delete", "/events/busy/registration").expect(200);
      await api.join(first, "busy").expect(201);
    });

    await event.edit({ name: "Edited while people joined" }).expect(200);

    const saved = await event.stored();
    expect(saved.registrationCount).toBe(2);
    expect(saved.name).toBe("Edited while people joined");
  });

  it("keeps accepting changes one after another, also for an event with no version yet", async () => {
    const event = await setUp("plain");
    await event.edit({ name: "The first of two edits" }).expect(200);
    await event.edit({ name: "The second of two edits" }).expect(200);

    await Event.collection.updateOne({ uid: "plain" }, { $unset: { __v: 1 } });
    await event.edit({ name: "An edit of an old record" }).expect(200);
    await event.edit({ name: "And one more after that" }).expect(200);
    await event.edit({ name: "And one more after that" }).expect(200);
    await event.unpublish().expect(200);
    await event.publish().expect(200);
    await event.cancel().expect(200);
  });
});
