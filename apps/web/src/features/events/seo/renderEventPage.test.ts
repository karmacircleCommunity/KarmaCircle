import shell from "../../../../index.html?raw";
import { describe, expect, it, vi } from "vitest";
import type { SeoEvent } from "./eventHead";
import {
  EVENT_UID_PATTERN,
  renderEventPage,
  type RenderDeps,
} from "./renderEventPage";

const event: SeoEvent = {
  uid: "beach-day",
  name: "Beach clean-up",
  description: "Gloves and bags provided.",
  startTime: "2026-11-22T01:30:00.000Z",
  mode: "Offline",
  city: "Mumbai",
  country: "India",
};

const deps = (overrides: Partial<RenderDeps> = {}): RenderDeps => ({
  loadShell: vi.fn(async () => shell),
  loadEvent: vi.fn(async () => event),
  siteUrl: "https://www.example.org",
  ...overrides,
});

describe("renderEventPage", () => {
  it("puts the event's tags into the app page", async () => {
    const result = await renderEventPage("beach-day", deps());

    expect(result.injected).toBe(true);
    expect(result.html).toContain(
      "<title>Beach clean-up | KarmaCircle</title>",
    );
    expect(result.html).toContain('<div id="root"></div>');
  });

  it("falls back to the site's own share image for a cover that is not a link", async () => {
    const result = await renderEventPage(
      "beach-day",
      deps({
        loadEvent: async () => ({
          ...event,
          coverImage: "data:image/png;base64,AAAA",
        }),
      }),
    );

    expect(result.html).toMatch(
      /property="og:image" content="https:\/\/[^"]+KarmaCircleSEO\.svg"/,
    );
    expect(result.html).not.toContain("data:image");
  });

  it.each([
    "",
    "Beach Day",
    "../etc/passwd",
    "a/b",
    "a b",
    "-leading",
    "x".repeat(120),
    "ünï",
  ])("does not even ask the API about the address %j", async (uid) => {
    const d = deps();

    const result = await renderEventPage(uid, d);

    expect(result).toEqual({ html: shell, injected: false });
    expect(d.loadEvent).not.toHaveBeenCalled();
  });

  it("accepts the addresses the create form can make", () => {
    for (const uid of ["beach-day", "a", "clean-up-2026", "9lives"])
      expect(EVENT_UID_PATTERN.test(uid)).toBe(true);
  });

  it("gives the plain page for an event that does not exist or is a draft", async () => {
    expect(
      await renderEventPage("nothing", deps({ loadEvent: async () => null })),
    ).toEqual({ html: shell, injected: false });
  });

  it("gives the plain page when the API fails or is slow", async () => {
    const result = await renderEventPage(
      "beach-day",
      deps({ loadEvent: async () => Promise.reject(new Error("timeout")) }),
    );

    expect(result).toEqual({ html: shell, injected: false });
  });

  it("gives the plain page for an answer that is not an event", async () => {
    for (const bad of [{}, { name: "" }, { name: 5 }, null]) {
      const result = await renderEventPage(
        "beach-day",
        deps({ loadEvent: async () => bad as unknown as SeoEvent }),
      );
      expect(result.injected).toBe(false);
    }
  });

  it("gives the plain page when it cannot put tags in", async () => {
    const result = await renderEventPage(
      "beach-day",
      deps({ loadShell: async () => "<html>no head</html>" }),
    );

    expect(result).toEqual({ html: "<html>no head</html>", injected: false });
  });

  it("is an error only when the app page itself cannot be read", async () => {
    await expect(
      renderEventPage(
        "beach-day",
        deps({ loadShell: async () => Promise.reject(new Error("down")) }),
      ),
    ).rejects.toThrow("down");
  });
});
