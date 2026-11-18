import { describe, expect, it, vi } from "vitest";
import type {
  CoverGrantResult,
  CoverSendResult,
  CoverUploadDeps,
  CoverUploadGrant,
} from "@features/events/types/interfaces";
import {
  COVER_GENERIC_ERROR,
  COVER_NETWORK_ERROR,
  COVER_READ_ERROR,
  uploadCover,
} from "./uploadCover";

const grant: CoverUploadGrant = {
  uploadUrl: "https://images.example.org/v1/images",
  token: "token",
  expiresAt: "2026-11-18T12:05:00.000Z",
  maxBytes: 5_242_880,
};

const stored = {
  id: "a".repeat(32),
  width: 1200,
  height: 800,
  variants: {
    thumb: {
      url: "https://images.example.org/v1/images/a/thumb",
      width: 400,
      height: 267,
      bytes: 5800,
    },
    card: {
      url: "https://images.example.org/v1/images/a/card",
      width: 800,
      height: 533,
      bytes: 17000,
    },
    large: {
      url: "https://images.example.org/v1/images/a/large",
      width: 1200,
      height: 800,
      bytes: 35000,
    },
  },
};

const file = new File(["pixels"], "cover.png", { type: "image/png" });

function deps(
  grantResult: CoverGrantResult,
  sendResult: CoverSendResult = { status: 201, body: stored },
) {
  const fake: CoverUploadDeps = {
    requestGrant: vi.fn(async () => grantResult),
    sendFile: vi.fn(async () => sendResult),
    readAsDataUrl: vi.fn(async () => "data:image/png;base64,AAAA"),
  };
  return fake;
}

describe("uploadCover", () => {
  it("sends the picture to the image service and keeps the card link", async () => {
    const fake = deps({ status: 200, grant });

    const outcome = await uploadCover(file, fake);

    expect(outcome).toEqual({
      kind: "uploaded",
      url: "https://images.example.org/v1/images/a/card",
    });
    expect(fake.sendFile).toHaveBeenCalledWith(grant, file, {});
    expect(fake.readAsDataUrl).not.toHaveBeenCalled();
  });

  it("passes the progress callback and the abort signal through", async () => {
    const fake = deps({ status: 200, grant });
    const onProgress = vi.fn();
    const controller = new AbortController();

    await uploadCover(file, fake, { onProgress, signal: controller.signal });

    expect(fake.sendFile).toHaveBeenCalledWith(grant, file, {
      onProgress,
      signal: controller.signal,
    });
  });

  describe("when image uploads are not set up on the server (503)", () => {
    it("falls back to putting the picture inside the event, as before", async () => {
      const fake = deps({ status: 503, message: "not set up" });

      const outcome = await uploadCover(file, fake);

      expect(outcome).toEqual({
        kind: "inline",
        dataUrl: "data:image/png;base64,AAAA",
      });
      expect(fake.sendFile).not.toHaveBeenCalled();
    });

    it("reports a picture that cannot be read", async () => {
      const fake = deps({ status: 503 });
      fake.readAsDataUrl = vi.fn(async () => {
        throw new Error("unreadable");
      });

      expect(await uploadCover(file, fake)).toEqual({
        kind: "failed",
        message: COVER_READ_ERROR,
      });
    });
  });

  describe("when the API refuses the token", () => {
    it.each([
      [401, /sign in again/],
      [403, /organization accounts/],
      [500, new RegExp(COVER_GENERIC_ERROR)],
    ])(
      "status %i gives a clear message and sends nothing",
      async (status, message) => {
        const fake = deps({ status });

        const outcome = await uploadCover(file, fake);

        expect(outcome.kind).toBe("failed");
        expect((outcome as { message: string }).message).toMatch(message);
        expect(fake.sendFile).not.toHaveBeenCalled();
        expect(fake.readAsDataUrl).not.toHaveBeenCalled();
      },
    );

    it("says the connection is the problem when the API cannot be reached", async () => {
      const outcome = await uploadCover(file, deps({}));

      expect(outcome).toEqual({ kind: "failed", message: COVER_NETWORK_ERROR });
    });
  });

  describe("when the image service refuses the picture", () => {
    it.each([
      [
        413,
        { error: "the image is larger than 5 MB" },
        "the image is larger than 5 MB",
      ],
      [
        415,
        { error: "only JPEG, PNG, GIF and WebP images are accepted" },
        "only JPEG, PNG, GIF and WebP images are accepted",
      ],
      [
        422,
        { error: "the image is damaged and could not be read" },
        "the image is damaged and could not be read",
      ],
    ])(
      "status %i shows the service's own message",
      async (status, body, expected) => {
        const outcome = await uploadCover(
          file,
          deps({ status: 200, grant }, { status, body }),
        );

        expect(outcome).toEqual({ kind: "failed", message: expected });
      },
    );

    it("falls back to a plain message when the service sends none", async () => {
      const outcome = await uploadCover(
        file,
        deps({ status: 200, grant }, { status: 413, body: "<html>" }),
      );

      expect(outcome).toEqual({
        kind: "failed",
        message: "That image is too large.",
      });
    });

    it("tells the person to choose again when the token expired", async () => {
      const outcome = await uploadCover(
        file,
        deps({ status: 200, grant }, { status: 401, body: { error: "x" } }),
      );

      expect(outcome).toEqual({
        kind: "failed",
        message: "That upload expired. Choose the image again.",
      });
    });

    it("says the service is busy on 503", async () => {
      const outcome = await uploadCover(
        file,
        deps({ status: 200, grant }, { status: 503, body: {} }),
      );

      expect((outcome as { message: string }).message).toMatch(/busy/);
    });

    it("never treats a 201 without a usable link as success", async () => {
      for (const body of [
        undefined,
        {},
        { variants: {} },
        { variants: { card: { url: "javascript:alert(1)" } } },
        { variants: { card: { url: 42 } } },
      ]) {
        const outcome = await uploadCover(
          file,
          deps({ status: 200, grant }, { status: 201, body }),
        );
        expect(outcome.kind).toBe("failed");
      }
    });

    it("reports a lost connection", async () => {
      const outcome = await uploadCover(
        file,
        deps({ status: 200, grant }, { networkError: true }),
      );

      expect(outcome).toEqual({ kind: "failed", message: COVER_NETWORK_ERROR });
    });
  });

  describe("when another picture is chosen first", () => {
    it("stops before asking for a token if already cancelled", async () => {
      const controller = new AbortController();
      controller.abort();
      const fake = deps({ status: 200, grant });

      expect(
        await uploadCover(file, fake, { signal: controller.signal }),
      ).toEqual({ kind: "cancelled" });
      expect(fake.requestGrant).not.toHaveBeenCalled();
    });

    it("drops the result if cancelled while the token was being requested", async () => {
      const controller = new AbortController();
      const fake = deps({ status: 200, grant });
      fake.requestGrant = vi.fn(async () => {
        controller.abort();
        return { status: 200, grant };
      });

      expect(
        await uploadCover(file, fake, { signal: controller.signal }),
      ).toEqual({ kind: "cancelled" });
      expect(fake.sendFile).not.toHaveBeenCalled();
    });

    it("drops the result if cancelled during the upload", async () => {
      const controller = new AbortController();
      const fake = deps({ status: 200, grant });
      fake.sendFile = vi.fn(async () => {
        controller.abort();
        return { status: 201, body: stored };
      });

      expect(
        await uploadCover(file, fake, { signal: controller.signal }),
      ).toEqual({ kind: "cancelled" });
    });

    it("treats a cancelled request as cancelled, not as a failure", async () => {
      const outcome = await uploadCover(
        file,
        deps({ status: 200, grant }, { cancelled: true }),
      );

      expect(outcome).toEqual({ kind: "cancelled" });
    });
  });
});
