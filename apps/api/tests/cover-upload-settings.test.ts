import jwt from "jsonwebtoken";
import { parseEnv } from "../src/config/env";
import { coverImageSchema } from "../src/modules/events/event.validation";
import {
  COVER_MAX_BYTES,
  issueCoverUploadGrant,
} from "../src/modules/events/cover-upload.service";
import { findByEmail } from "../src/modules/users/user.service";

jest.mock("../src/modules/users/user.service", () => ({
  findByEmail: jest.fn(),
}));
const findByEmailMock = findByEmail as jest.Mock;

const configured = {
  url: "https://images.example.org",
  secret: "a-shared-secret-of-at-least-32-chars!!",
};

describe("issueCoverUploadGrant account rules", () => {
  it("gives an organization account a grant that points at the service", async () => {
    findByEmailMock.mockResolvedValue({ userType: "organization" });

    const grant = await issueCoverUploadGrant("host@example.com", configured);

    expect(grant.uploadUrl).toBe("https://images.example.org/v1/images");
    expect(grant.maxBytes).toBe(COVER_MAX_BYTES);
    expect(() => jwt.verify(grant.token, configured.secret)).not.toThrow();
  });

  it("refuses an individual account with 403", async () => {
    findByEmailMock.mockResolvedValue({ userType: "individual" });

    await expect(
      issueCoverUploadGrant("person@example.com", configured),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("refuses an account that no longer exists with 401", async () => {
    findByEmailMock.mockResolvedValue(null);

    await expect(
      issueCoverUploadGrant("gone@example.com", configured),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("never signs a token for a refused account", async () => {
    findByEmailMock.mockResolvedValue({ userType: "individual" });
    const signSpy = jest.spyOn(jwt, "sign");

    await issueCoverUploadGrant("person@example.com", configured).catch(
      () => undefined,
    );

    expect(signSpy).not.toHaveBeenCalled();
    signSpy.mockRestore();
  });
});

describe("when the image service is not set up", () => {
  it("answers 503 before looking at any account", async () => {
    await expect(
      issueCoverUploadGrant("host@example.com", {
        url: undefined,
        secret: undefined,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(
      issueCoverUploadGrant("host@example.com", {
        url: "http://x",
        secret: undefined,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe("image service environment settings", () => {
  const base = {
    NODE_ENV: "development",
    MONGO_URI: "mongodb://127.0.0.1:27017/x",
    JWT_SECRET: "local-only-change-me",
    SECRET_KEY: "local-only-change-me",
    CLIENT_ID: "id",
    CLIENT_SECRET: "secret",
    CALLBACK_URL: "http://localhost:5050/cb",
    successURL: "http://localhost:3000/",
    ORIGIN_URL: "http://localhost:3000",
  };
  const long = "k3Jf9sL0pQwX7vBn2ZcR8mYtA5dHe1Gu";

  it("is fine with neither set", () => {
    expect(parseEnv(base).IMAGE_SERVICE_URL).toBeUndefined();
  });

  it("is fine with both set, and drops a trailing slash from the url", () => {
    const parsed = parseEnv({
      ...base,
      IMAGE_SERVICE_URL: "https://images.example.org/",
      IMAGE_SERVICE_SECRET: long,
    });

    expect(parsed.IMAGE_SERVICE_URL).toBe("https://images.example.org");
  });

  it("treats empty values as not set", () => {
    expect(() =>
      parseEnv({ ...base, IMAGE_SERVICE_URL: "", IMAGE_SERVICE_SECRET: "" }),
    ).not.toThrow();
  });

  it("refuses one without the other", () => {
    expect(() =>
      parseEnv({ ...base, IMAGE_SERVICE_URL: "https://images.example.org" }),
    ).toThrow(/IMAGE_SERVICE_SECRET/);
    expect(() => parseEnv({ ...base, IMAGE_SERVICE_SECRET: long })).toThrow(
      /IMAGE_SERVICE_URL/,
    );
  });

  it("refuses a short secret in every environment", () => {
    expect(() =>
      parseEnv({
        ...base,
        IMAGE_SERVICE_URL: "https://images.example.org",
        IMAGE_SERVICE_SECRET: "short",
      }),
    ).toThrow(/IMAGE_SERVICE_SECRET: must be at least 32/);
  });

  it("refuses a placeholder secret in production", () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: "production",
        JWT_SECRET: long,
        SECRET_KEY: "Zr4Xy8Qm1Lw6Pb3Nv9Tc2Hd7Ja5Ke0Sg",
        CLIENT_ID: "real-id",
        CLIENT_SECRET: "real-secret",
        IMAGE_SERVICE_URL: "https://images.example.org",
        IMAGE_SERVICE_SECRET: "change-me-change-me-change-me-change-me",
      }),
    ).toThrow(/IMAGE_SERVICE_SECRET: looks like a placeholder/);
  });

  it("refuses a url that is not http or https", () => {
    expect(() =>
      parseEnv({
        ...base,
        IMAGE_SERVICE_URL: "ftp://images",
        IMAGE_SERVICE_SECRET: long,
      }),
    ).toThrow(/IMAGE_SERVICE_URL/);
  });
});

describe("cover image links from the image service", () => {
  // IMAGE_SERVICE_URL is http://127.0.0.1:8080 in the test environment.
  const id = "0123456789abcdef0123456789abcdef";
  const accepts = (value: string) => coverImageSchema.safeParse(value).success;

  it("accepts a card link from the configured service, even over http", () => {
    expect(accepts(`http://127.0.0.1:8080/v1/images/${id}/card`)).toBe(true);
    expect(accepts(`http://127.0.0.1:8080/v1/images/${id}/thumb`)).toBe(true);
  });

  it("still accepts any https link, as before", () => {
    expect(accepts("https://example.org/cover.jpg")).toBe(true);
  });

  it("does not open the door to other http links", () => {
    expect(accepts("http://example.org/cover.jpg")).toBe(false);
    expect(accepts(`http://127.0.0.1:9999/v1/images/${id}/card`)).toBe(false);
    expect(accepts(`http://localhost:8080/v1/images/${id}/card`)).toBe(false);
  });

  it("only accepts the service's own image paths", () => {
    expect(accepts("http://127.0.0.1:8080/")).toBe(false);
    expect(accepts("http://127.0.0.1:8080/v1/images/short/card")).toBe(false);
    expect(accepts(`http://127.0.0.1:8080/v1/images/${id}/original`)).toBe(
      false,
    );
    expect(accepts(`http://127.0.0.1:8080/v1/images/${id}/card?x=1`)).toBe(
      false,
    );
    expect(accepts(`http://user:pw@127.0.0.1:8080/v1/images/${id}/card`)).toBe(
      false,
    );
  });

  it("refuses scripts and other schemes", () => {
    expect(accepts("javascript:alert(1)")).toBe(false);
    expect(accepts("ftp://127.0.0.1:8080/v1/images/x")).toBe(false);
  });
});
