import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  destinationAfterAuth,
  rememberReturnPath,
  returnPathFromState,
  safeReturnPath,
  takeReturnPath,
} from "./returnPath";

const ORIGIN = "https://www.karmacircle.org";

describe("safeReturnPath", () => {
  it("keeps a path on this site, with its query and hash", () => {
    expect(safeReturnPath("/events/river-cleanup", ORIGIN)).toBe(
      "/events/river-cleanup",
    );
    expect(safeReturnPath("/events/x?a=1#location", ORIGIN)).toBe(
      "/events/x?a=1#location",
    );
    expect(safeReturnPath("/", ORIGIN)).toBe("/");
  });

  it.each([
    "https://evil.example.com/events",
    "http://www.karmacircle.org/events",
    "//evil.example.com",
    "/\\evil.example.com",
    "\\\\evil.example.com",
    "/\t/evil.example.com",
    "/\n/evil.example.com",
    "/..//evil.example.com",
    "/%2e%2e//evil.example.com",
    "javascript:alert(1)",
    "events/river-cleanup",
    " /events",
    "",
  ])("refuses %j", (value) => {
    expect(safeReturnPath(value, ORIGIN)).toBeNull();
  });

  it("refuses anything that is not text", () => {
    for (const value of [undefined, null, 4, {}, ["/events"]]) {
      expect(safeReturnPath(value, ORIGIN)).toBeNull();
    }
  });

  it("refuses an auth page, which would only bounce a signed-in person", () => {
    expect(safeReturnPath("/auth/signin", ORIGIN)).toBeNull();
    expect(safeReturnPath("/AUTH/signup", ORIGIN)).toBeNull();
    expect(safeReturnPath("/events/../auth/signin", ORIGIN)).toBeNull();
    expect(safeReturnPath("/authors", ORIGIN)).toBe("/authors");
  });
});

describe("destinationAfterAuth", () => {
  it("returns an individual or an existing account to where they were", () => {
    expect(destinationAfterAuth("/events/a", false)).toEqual({
      to: "/events/a",
      replace: true,
    });
  });

  it("lands on the home page when nothing asked for the sign-in", () => {
    expect(destinationAfterAuth(null, false)).toEqual({
      to: "/",
      replace: false,
    });
  });

  it("always sends a brand-new organization to its setup", () => {
    for (const returnTo of ["/events/a", null]) {
      expect(destinationAfterAuth(returnTo, true)).toEqual({
        to: "/organization/setup",
        replace: false,
      });
    }
  });
});

describe("kept return path", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", { location: { origin: ORIGIN } });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads returnTo from router state", () => {
    expect(returnPathFromState({ returnTo: "/events/a" })).toBe("/events/a");
    expect(returnPathFromState({ returnTo: "//evil.example.com" })).toBeNull();
    expect(returnPathFromState(null)).toBeNull();
    expect(returnPathFromState({ email: "a@example.com" })).toBeNull();
  });

  it("is handed back once", () => {
    rememberReturnPath("/events/a");
    expect(takeReturnPath()).toBe("/events/a");
    expect(takeReturnPath()).toBeNull();
  });

  it("is forgotten by a later sign-in that has none", () => {
    rememberReturnPath("/events/a");
    rememberReturnPath(null);
    expect(takeReturnPath()).toBeNull();
  });

  it("is checked again on the way out", () => {
    store.set("karmacircle:auth-return-path", "https://evil.example.com");
    expect(takeReturnPath()).toBeNull();
  });

  it("does nothing when storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => rememberReturnPath("/events/a")).not.toThrow();
    expect(takeReturnPath()).toBeNull();
  });
});
