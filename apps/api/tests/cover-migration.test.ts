import { Event } from "../src/modules/events/event.model";
import {
  migrateEventCovers,
  parseCoverDataUrl,
} from "../src/modules/uploads/cover-migration";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_URL = `data:image/png;base64,${PNG_BASE64}`;

async function insertEvent(uid: string, coverImage: string) {
  await Event.collection.insertOne({
    uid,
    name: `Event ${uid}`,
    description: "A description that is long enough",
    hostUsername: "host",
    hostName: "Host",
    coverImage,
    mode: "Online",
    startTime: new Date(Date.now() + 86_400_000),
    endTime: new Date(Date.now() + 90_000_000),
  });
}
const coverOf = async (uid: string) =>
  (await Event.collection.findOne({ uid }))?.coverImage;

describe("parseCoverDataUrl", () => {
  it("reads the type and bytes of a real image data URL", () => {
    const parsed = parseCoverDataUrl(PNG_URL);
    expect(parsed?.contentType).toBe("image/png");
    expect(parsed?.bytes.equals(Buffer.from(PNG_BASE64, "base64"))).toBe(true);
  });

  it("refuses anything else, including bytes that are not the declared type", () => {
    expect(parseCoverDataUrl("https://example.com/a.png")).toBeNull();
    expect(
      parseCoverDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
    ).toBeNull();
    expect(parseCoverDataUrl("data:image/png;base64,@@@@")).toBeNull();
    expect(
      parseCoverDataUrl(`data:image/jpeg;base64,${PNG_BASE64}`),
    ).toBeNull();
    expect(parseCoverDataUrl("data:image/png;base64,PHNjcmlwdD4=")).toBeNull();
  });
});

describe("migrateEventCovers", () => {
  it("replaces data URL covers with the link the upload returns", async () => {
    await insertEvent("old-one", PNG_URL);
    await insertEvent("old-two", PNG_URL);
    await insertEvent("already-a-link", "https://example.com/cover.png");

    const upload = jest
      .fn()
      .mockImplementation(
        async (_cover, uid: string) => `https://blob.example/${uid}.png`,
      );
    const result = await migrateEventCovers(upload);

    expect(result).toMatchObject({ found: 2, migrated: 2, skipped: [] });
    expect(result.bytesFreed).toBe(PNG_URL.length * 2);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(await coverOf("old-one")).toBe("https://blob.example/old-one.png");
    expect(await coverOf("old-two")).toBe("https://blob.example/old-two.png");
    expect(await coverOf("already-a-link")).toBe(
      "https://example.com/cover.png",
    );
  });

  it("is safe to run again", async () => {
    await insertEvent("once", PNG_URL);
    const upload = jest.fn().mockResolvedValue("https://blob.example/once.png");
    await migrateEventCovers(upload);
    const second = await migrateEventCovers(upload);

    expect(second).toMatchObject({ found: 0, migrated: 0 });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("changes nothing on a dry run", async () => {
    await insertEvent("looked-at", PNG_URL);
    const upload = jest.fn();
    const lines: string[] = [];
    const result = await migrateEventCovers(upload, {
      dryRun: true,
      log: (line) => lines.push(line),
    });

    expect(result).toMatchObject({ found: 1, migrated: 0 });
    expect(upload).not.toHaveBeenCalled();
    expect(await coverOf("looked-at")).toBe(PNG_URL);
    expect(lines[0]).toMatch(/would\s+looked-at: image\/png/);
  });

  it("leaves a malformed data URL alone and says so", async () => {
    await insertEvent("broken", "data:image/png;base64,@@@@");
    const upload = jest.fn();
    const result = await migrateEventCovers(upload);

    expect(result.skipped).toEqual([
      { uid: "broken", reason: expect.stringMatching(/not a well-formed/) },
    ]);
    expect(upload).not.toHaveBeenCalled();
    expect(await coverOf("broken")).toBe("data:image/png;base64,@@@@");
  });

  it("keeps a cover the organizer changed while the migration ran", async () => {
    await insertEvent("raced", PNG_URL);
    const upload = jest.fn().mockImplementation(async () => {
      await Event.collection.updateOne(
        { uid: "raced" },
        { $set: { coverImage: "https://example.com/new.png" } },
      );
      return "https://blob.example/raced.png";
    });
    const result = await migrateEventCovers(upload);

    expect(result.migrated).toBe(0);
    expect(result.skipped[0].reason).toMatch(/changed while/);
    expect(await coverOf("raced")).toBe("https://example.com/new.png");
  });
});
