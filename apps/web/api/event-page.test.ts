import shell from "../index.html?raw";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./event-page";

const apiEvent = {
  uid: "beach-day",
  name: "Beach clean-up",
  description: "Gloves and bags provided.",
  startTime: "2026-11-22T01:30:00.000Z",
  mode: "Offline",
  city: "Mumbai",
  country: "India",
};

function respond(status: number, body: string, contentType = "text/html") {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

function call(url = "/api/event-page?uid=beach-day") {
  const headers: Record<string, string> = {};
  const out = { status: 0, body: "" };
  const res = {
    statusCode: 0,
    setHeader: (name: string, value: string) =>
      void (headers[name.toLowerCase()] = value),
    end: (body?: string) => {
      out.status = res.statusCode;
      out.body = body ?? "";
    },
  };
  return handler({ url, headers: { host: "www.example.org" } }, res).then(
    () => ({ ...out, headers }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function stubFetch(handlerFn: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) =>
    handlerFn(String(input)),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_URL", "https://api.example.org");
  return fetchMock;
}

describe("api/event-page", () => {
  it("serves the app page with the event's tags, cached at the edge", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/index.html")
        ? respond(200, shell)
        : respond(200, JSON.stringify(apiEvent), "application/json"),
    );

    const result = await call();

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(result.headers["cache-control"]).toBe(
      "public, s-maxage=300, stale-while-revalidate=86400",
    );
    expect(result.body).toContain(
      "<title>Beach clean-up | KarmaCircle</title>",
    );
    expect(result.body).toContain(
      'href="https://www.example.org/events/beach-day"',
    );
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("https://www.example.org/index.html");
    expect(urls).toContain("https://api.example.org/events?uid=beach-day");
  });

  it("reads the app page from this deployment, not from the host a request names", async () => {
    vi.stubEnv("VERCEL_URL", "karmacircle-abc123.vercel.app");
    const fetchMock = stubFetch((url) =>
      url.endsWith("/index.html")
        ? respond(200, shell)
        : respond(200, JSON.stringify(apiEvent), "application/json"),
    );
    const res = {
      statusCode: 0,
      setHeader: () => undefined,
      end: () => undefined,
    };

    await handler(
      {
        url: "/api/event-page?uid=beach-day",
        headers: {
          host: "internal.service.local",
          "x-forwarded-host": "169.254.169.254",
        },
      },
      res,
    );

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("https://karmacircle-abc123.vercel.app/index.html");
    expect(
      urls.some(
        (u) =>
          u.includes("internal.service.local") || u.includes("169.254.169.254"),
      ),
    ).toBe(false);
  });

  it("uses SITE_URL for the addresses in the tags when it is set", async () => {
    vi.stubEnv("SITE_URL", "https://www.karmacircle.org/");
    stubFetch((url) =>
      url.endsWith("/index.html")
        ? respond(200, shell)
        : respond(200, JSON.stringify(apiEvent), "application/json"),
    );

    const result = await call();

    expect(result.body).toContain(
      'href="https://www.karmacircle.org/events/beach-day"',
    );
  });

  it("serves the plain app page when the API answers 404 or 500", async () => {
    for (const status of [404, 500]) {
      stubFetch((url) =>
        url.endsWith("/index.html")
          ? respond(200, shell)
          : respond(status, "{}", "application/json"),
      );

      const result = await call();

      expect(result.status).toBe(200);
      expect(result.body).toBe(shell);
    }
  });

  it("serves the plain app page when the API cannot be reached", async () => {
    stubFetch((url) => {
      if (url.endsWith("/index.html")) return respond(200, shell);
      throw new TypeError("fetch failed");
    });

    expect((await call()).body).toBe(shell);
  });

  it("serves the plain app page when no API address is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(200, shell)),
    );
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("API_URL", "");

    expect((await call()).body).toBe(shell);
  });

  it("never sends an address that is not an event address to the API", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/index.html")
        ? respond(200, shell)
        : respond(200, JSON.stringify(apiEvent), "application/json"),
    );

    for (const uid of ["..%2f..%2fadmin", "a%20b", "x%3Fy%3D1", ""]) {
      const result = await call(`/api/event-page?uid=${uid}`);
      expect(result.body).toBe(shell);
    }
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/events?"),
      ),
    ).toHaveLength(0);
  });

  it("answers 502, uncached, only when the app page itself cannot be read", async () => {
    stubFetch(() => respond(500, "down"));

    const result = await call();

    expect(result.status).toBe(502);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body).not.toContain("<html");
  });
});
