import { describe, expect, it } from "vitest";
import {
  MODE_LABELS,
  describeWhere,
  hasOnlineAccess,
  hasVenue,
} from "./eventMode";

describe("hasVenue and hasOnlineAccess", () => {
  it("treat a hybrid event as having both", () => {
    expect(hasVenue("Hybrid")).toBe(true);
    expect(hasOnlineAccess("Hybrid")).toBe(true);
  });

  it("give an in-person event a venue only, and an online event a link only", () => {
    expect(hasVenue("Offline")).toBe(true);
    expect(hasOnlineAccess("Offline")).toBe(false);
    expect(hasVenue("Online")).toBe(false);
    expect(hasOnlineAccess("Online")).toBe(true);
  });
});

describe("describeWhere", () => {
  it("names the platform for an online event", () => {
    expect(describeWhere({ mode: "Online", platform: "Zoom Meeting" })).toBe(
      "Online · Zoom Meeting",
    );
    expect(describeWhere({ mode: "Online" })).toBe("Online");
  });

  it("names the place for an in-person event, and says when it is missing", () => {
    expect(
      describeWhere({ mode: "Offline", city: "Guwahati", country: "India" }),
    ).toBe("Guwahati, India");
    expect(describeWhere({ mode: "Offline" })).toBe("Location TBA");
  });

  it("puts Hybrid in front of the place for a hybrid event", () => {
    expect(
      describeWhere({
        mode: "Hybrid",
        city: "Guwahati",
        country: "India",
        platform: "Zoom Meeting",
      }),
    ).toBe("Hybrid · Guwahati, India");
    expect(describeWhere({ mode: "Hybrid" })).toBe("Hybrid · Location TBA");
  });
});

describe("MODE_LABELS", () => {
  it("names the three modes the way the form does", () => {
    expect(MODE_LABELS).toEqual({
      Offline: "In person",
      Online: "Online",
      Hybrid: "Hybrid",
    });
  });
});
