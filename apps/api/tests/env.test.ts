import {
  MIN_SECRET_LENGTH,
  parseEnv,
  weakSecretReason,
} from "../src/config/env";

/**
 * S-5: in production the signing secrets must be long and not copied from an
 * example file. Local development and tests keep their short example values.
 */

const strong = "k3Jf9sL0pQwX7vBn2ZcR8mYtA5dHe1Gu"; // 33 characters
const otherStrong = "Zr4Xy8Qm1Lw6Pb3Nv9Tc2Hd7Ja5Ke0Sg";

const base = {
  MONGO_URI: "mongodb://127.0.0.1:27017/x",
  JWT_SECRET: strong,
  SECRET_KEY: otherStrong,
  CLIENT_ID: "123-real.apps.googleusercontent.com",
  CLIENT_SECRET: "GOCSPX-realvalue",
  CALLBACK_URL: "https://api.example.org/auth/google/callback",
  successURL: "https://www.example.org/",
  ORIGIN_URL: "https://www.example.org",
};

const production = (overrides: Record<string, string> = {}) =>
  parseEnv({ ...base, NODE_ENV: "production", ...overrides });

describe("production secrets (S-5)", () => {
  it("accepts long random secrets", () => {
    expect(() => production()).not.toThrow();
  });

  it("accepts a secret of exactly the minimum length", () => {
    expect(() =>
      production({ JWT_SECRET: strong.slice(0, MIN_SECRET_LENGTH) }),
    ).not.toThrow();
  });

  it("refuses a secret one character too short", () => {
    expect(() =>
      production({ JWT_SECRET: strong.slice(0, MIN_SECRET_LENGTH - 1) }),
    ).toThrow(/JWT_SECRET: must be at least 32 characters/);
  });

  it.each([
    "local-only-change-me-local-only-change-me",
    "please-CHANGEME-before-going-live-1234567",
    "your-secret-goes-here-your-secret-goes-here",
    "test-jwt-secret-test-jwt-secret-test-jwt",
    "this-is-an-example-secret-value-123456",
  ])("refuses the placeholder %s even when it is long enough", (secret) => {
    expect(secret.length).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
    expect(() => production({ JWT_SECRET: secret })).toThrow(
      /JWT_SECRET: looks like a placeholder/,
    );
  });

  it("refuses a long secret with almost no variety", () => {
    expect(() => production({ SECRET_KEY: "a".repeat(40) })).toThrow(
      /SECRET_KEY: uses too few different characters/,
    );
    expect(() => production({ SECRET_KEY: "ab".repeat(20) })).toThrow(
      /SECRET_KEY/,
    );
  });

  it("checks SECRET_KEY as well as JWT_SECRET and reports both at once", () => {
    let message = "";
    try {
      production({ JWT_SECRET: "short", SECRET_KEY: "local-only-change-me" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("JWT_SECRET");
    expect(message).toContain("SECRET_KEY");
  });

  it("never prints the secret itself in the error", () => {
    const secret = "local-only-change-me-local-only-change-me";
    let message = "";
    try {
      production({ JWT_SECRET: secret });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain(secret);
  });

  it("refuses the example Google OAuth placeholders", () => {
    expect(() => production({ CLIENT_ID: "local-dev-placeholder" })).toThrow(
      /CLIENT_ID: is still the example placeholder/,
    );
    expect(() =>
      production({ CLIENT_SECRET: "local-dev-placeholder" }),
    ).toThrow(/CLIENT_SECRET/);
  });
});

describe("outside production", () => {
  it.each(["development", "test"])(
    "%s keeps accepting the short example values",
    (NODE_ENV) => {
      expect(() =>
        parseEnv({
          ...base,
          NODE_ENV,
          JWT_SECRET: "local-only-change-me",
          SECRET_KEY: "local-only-change-me",
          CLIENT_ID: "local-dev-placeholder",
          CLIENT_SECRET: "local-dev-placeholder",
        }),
      ).not.toThrow();
    },
  );

  it("still requires the variables to be present", () => {
    expect(() =>
      parseEnv({ ...base, NODE_ENV: "development", JWT_SECRET: "" }),
    ).toThrow(/JWT_SECRET is required/);
  });
});

describe("weakSecretReason", () => {
  it("returns nothing for a strong secret", () => {
    expect(weakSecretReason(strong)).toBeUndefined();
  });

  it("is case and padding insensitive for placeholders", () => {
    expect(
      weakSecretReason(`  ${"X".repeat(10)}ChangeMe${"y".repeat(20)}  `),
    ).toMatch(/placeholder/);
  });
});
