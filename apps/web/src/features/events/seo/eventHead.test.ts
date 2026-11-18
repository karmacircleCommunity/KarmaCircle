import indexHtml from "../../../../index.html?raw";
import { describe, expect, it } from "vitest";
import {
  buildEventHead,
  defaultImageOf,
  escapeHtml,
  eventImage,
  eventJsonLd,
  injectHead,
  jsonForScript,
  truncate,
  type SeoEvent,
} from "./eventHead";

const ctx = {
  siteUrl: "https://www.example.org",
  defaultImage: "https://www.example.org/share.png",
};

const event: SeoEvent = {
  uid: "beach-day",
  name: "Beach clean-up",
  description: "Gloves and bags provided. Bring water.",
  startTime: "2026-11-22T01:30:00.000Z",
  endTime: "2026-11-22T04:30:00.000Z",
  status: "published",
  mode: "Offline",
  address: "Juhu Beach",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  coverImage: "https://images.example.org/v1/images/abc/card",
  hostName: "Clean Coast",
  organizerHandle: "clean-coast",
};

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe("escapeHtml", () => {
  it("escapes what can end a tag or an attribute", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;",
    );
  });
});

describe("jsonForScript", () => {
  it("is still the same JSON", () => {
    const value = {
      a: "</script><script>alert(1)</script>",
      b: ["<!--", "&", LINE_SEPARATOR, PARAGRAPH_SEPARATOR],
      c: 1,
    };

    expect(JSON.parse(jsonForScript(value))).toEqual(value);
  });

  it("holds nothing that could end the script element or start markup", () => {
    const text = jsonForScript({
      name: "</script><img src=x onerror=alert(1)><!-- &amp;",
    });

    expect(text).not.toMatch(/[<>&]/);
    expect(text).not.toContain(LINE_SEPARATOR);
    expect(text).not.toContain(PARAGRAPH_SEPARATOR);
  });
});

describe("truncate", () => {
  it("leaves a short text alone and collapses its whitespace", () => {
    expect(truncate("  a  b\n c ", 50)).toBe("a b c");
  });

  it("cuts a long text at a word, with an ellipsis, within the limit", () => {
    const out = truncate("word ".repeat(100), 40);

    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
});

describe("eventImage", () => {
  it("uses a cover a crawler can fetch", () => {
    expect(eventImage(event, ctx)).toBe(
      "https://images.example.org/v1/images/abc/card",
    );
  });

  it("falls back to the site's image for a cover stored inside the event, or none, or a script", () => {
    for (const coverImage of [
      "data:image/png;base64,AAAA",
      "",
      undefined,
      "javascript:alert(1)",
      "https://x.example/" + "a".repeat(2100),
    ]) {
      expect(eventImage({ ...event, coverImage }, ctx)).toBe(ctx.defaultImage);
    }
  });
});

describe("eventJsonLd", () => {
  it("describes an in-person event the way search engines expect", () => {
    const ld = eventJsonLd(event, ctx)!;

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Event");
    expect(ld.name).toBe("Beach clean-up");
    expect(ld.startDate).toBe("2026-11-22T01:30:00.000Z");
    expect(ld.endDate).toBe("2026-11-22T04:30:00.000Z");
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(ld.eventAttendanceMode).toBe(
      "https://schema.org/OfflineEventAttendanceMode",
    );
    expect(ld.location).toEqual({
      "@type": "Place",
      name: "Juhu Beach, Mumbai, Maharashtra, India",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Juhu Beach",
        addressLocality: "Mumbai",
        addressRegion: "Maharashtra",
        addressCountry: "India",
      },
    });
    expect(ld.image).toEqual(["https://images.example.org/v1/images/abc/card"]);
    expect(ld.organizer).toEqual({
      "@type": "Organization",
      name: "Clean Coast",
      url: "https://www.example.org/organization/clean-coast",
    });
    expect(ld.url).toBe("https://www.example.org/events/beach-day");
  });

  it("describes an online event with a virtual location", () => {
    const ld = eventJsonLd(
      {
        ...event,
        mode: "Online",
        platform: "Zoom",
        platformLink: "https://zoom.example/j/1",
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      },
      ctx,
    )!;

    expect(ld.eventAttendanceMode).toBe(
      "https://schema.org/OnlineEventAttendanceMode",
    );
    expect(ld.location).toEqual({
      "@type": "VirtualLocation",
      url: "https://zoom.example/j/1",
    });
  });

  it("points an online event with no link at its own page", () => {
    const ld = eventJsonLd(
      { ...event, mode: "Online", platformLink: undefined },
      ctx,
    )!;

    expect(ld.location).toEqual({
      "@type": "VirtualLocation",
      url: "https://www.example.org/events/beach-day",
    });
  });

  it("describes a hybrid event with both places and the mixed mode", () => {
    const ld = eventJsonLd(
      { ...event, mode: "Hybrid", platformLink: "https://zoom.example/j/1" },
      ctx,
    )!;

    expect(ld.eventAttendanceMode).toBe(
      "https://schema.org/MixedEventAttendanceMode",
    );
    expect(
      (ld.location as { "@type": string }[]).map((l) => l["@type"]),
    ).toEqual(["Place", "VirtualLocation"]);
  });

  it("marks a cancelled event cancelled instead of dropping it", () => {
    expect(
      eventJsonLd({ ...event, status: "cancelled" }, ctx)!.eventStatus,
    ).toBe("https://schema.org/EventCancelled");
  });

  it("says a free event is free and invents no offer", () => {
    const ld = eventJsonLd(event, ctx)!;

    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.offers).toBeUndefined();
  });

  it("states the price the page shows, and when it is sold out", () => {
    const paid = { ...event, cost: { amount: 250, currency: "inr" } };

    expect(eventJsonLd(paid, ctx)!.offers).toMatchObject({
      "@type": "Offer",
      price: "250",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    });
    expect(
      eventJsonLd({ ...paid, capacity: 10, registrationCount: 10 }, ctx)!
        .offers,
    ).toMatchObject({ availability: "https://schema.org/SoldOut" });
    expect(
      eventJsonLd({ ...paid, capacity: 10, registrationCount: 9 }, ctx)!.offers,
    ).toMatchObject({ availability: "https://schema.org/InStock" });
  });

  it("gives no markup rather than invalid markup", () => {
    expect(eventJsonLd({ ...event, startTime: "soon" }, ctx)).toBeNull();
    expect(eventJsonLd({ ...event, name: "  " }, ctx)).toBeNull();
    expect(
      eventJsonLd(
        {
          ...event,
          address: undefined,
          city: undefined,
          state: undefined,
          country: undefined,
        },
        ctx,
      ),
    ).toBeNull();
  });

  it("leaves out an end that is not after the start", () => {
    expect(
      eventJsonLd({ ...event, endTime: event.startTime }, ctx)!.endDate,
    ).toBeUndefined();
    expect(
      eventJsonLd({ ...event, endTime: "nonsense" }, ctx)!.endDate,
    ).toBeUndefined();
  });
});

describe("buildEventHead", () => {
  const head = buildEventHead(event, ctx);

  it("writes the title and description a share preview shows", () => {
    expect(head.title).toBe("Beach clean-up | KarmaCircle");
    expect(head.description).toBe("Gloves and bags provided. Bring water.");
    expect(head.tags).toContain("<title>Beach clean-up | KarmaCircle</title>");
    expect(head.tags).toContain(
      '<meta property="og:title" content="Beach clean-up | KarmaCircle" />',
    );
    expect(head.tags).toContain(
      '<meta property="og:url" content="https://www.example.org/events/beach-day" />',
    );
    expect(head.tags).toContain(
      '<link rel="canonical" href="https://www.example.org/events/beach-day" />',
    );
    expect(head.tags).toContain(
      '<meta property="og:image" content="https://images.example.org/v1/images/abc/card" />',
    );
    expect(head.tags).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    );
  });

  it("uses a small card when there is no usable picture", () => {
    const plain = buildEventHead(
      { ...event, coverImage: undefined },
      { siteUrl: ctx.siteUrl },
    );

    expect(plain.tags).toContain(
      '<meta name="twitter:card" content="summary" />',
    );
    expect(plain.tags).not.toContain("og:image");
  });

  it("writes a description when the event has none", () => {
    expect(
      buildEventHead({ ...event, description: " " }, ctx).description,
    ).toBe("Beach clean-up, an event on KarmaCircle.");
  });

  it("cannot be broken out of by what a person typed", () => {
    const hostile = buildEventHead(
      {
        ...event,
        name: `"><script>alert(1)</script>`,
        description: `</title><img src=x onerror=alert(1)>`,
      },
      ctx,
    );

    expect(hostile.tags).not.toContain("<script>alert");
    expect(hostile.tags).not.toContain("<img");
    expect(hostile.tags).not.toContain(`content=""><`);
    expect(hostile.tags.match(/<script/g)).toHaveLength(1); // the JSON-LD one
  });

  it("carries one JSON-LD block that reads back as the event", () => {
    const blocks = [
      ...head.tags.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ];

    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0][1])).toEqual(eventJsonLd(event, ctx));
  });

  it("still gives share tags when there is no valid markup to give", () => {
    const noPlace = buildEventHead(
      {
        ...event,
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      },
      ctx,
    );

    expect(noPlace.tags).toContain("og:title");
    expect(noPlace.tags).not.toContain("ld+json");
  });
});

describe("injectHead", () => {
  const head = buildEventHead(event, ctx);
  const count = (html: string, pattern: RegExp) =>
    (html.match(pattern) ?? []).length;

  it("replaces the site-wide tags in the real index.html with the event's", () => {
    const html = injectHead(indexHtml, head);

    expect(count(html, /<title>/g)).toBe(1);
    expect(html).toContain("<title>Beach clean-up | KarmaCircle</title>");
    expect(count(html, /property="og:title"/g)).toBe(1);
    expect(count(html, /property="og:description"/g)).toBe(1);
    expect(count(html, /property="og:image"/g)).toBe(1);
    expect(count(html, /name="twitter:card"/g)).toBe(1);
    expect(count(html, /name="description"/g)).toBe(1);
    expect(count(html, /rel="canonical"/g)).toBe(1);
    expect(html).not.toContain("Welcome to KarmaCircle");
  });

  it("leaves the rest of the page, and so the app, alone", () => {
    const html = injectHead(indexHtml, head);

    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain(
      '<script type="module" src="/src/app/index.tsx"></script>',
    );
    expect(html).toContain('name="viewport"');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color"');
    expect(html.indexOf("</head>")).toBeGreaterThan(html.indexOf("og:title"));
  });

  it("can be applied twice without piling up tags", () => {
    const twice = injectHead(injectHead(indexHtml, head), head);

    expect(count(twice, /<title>/g)).toBe(1);
    expect(count(twice, /property="og:title"/g)).toBe(1);
    expect(count(twice, /rel="canonical"/g)).toBe(1);
    expect(count(twice, /application\/ld\+json/g)).toBe(1);
  });

  it("returns a page it cannot put tags into as it was", () => {
    expect(injectHead("<html><body>no head</body></html>", head)).toBe(
      "<html><body>no head</body></html>",
    );
  });
});

describe("defaultImageOf", () => {
  it("reads the site-wide share image the page already names", () => {
    expect(defaultImageOf(indexHtml)).toMatch(
      /^https:\/\/.+KarmaCircleSEO\.svg$/,
    );
  });

  it("gives nothing when there is none, or it is not a link", () => {
    expect(defaultImageOf("<head></head>")).toBeUndefined();
    expect(
      defaultImageOf('<meta property="og:image" content="javascript:x" />'),
    ).toBeUndefined();
  });
});
