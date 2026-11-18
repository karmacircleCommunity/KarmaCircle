import Axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoverUploadGrant } from "@features/events/types/interfaces";
import { RequestCoverUpload, SendCoverImage } from "./KarmaCircleApi";

const grant: CoverUploadGrant = {
  uploadUrl: "https://images.example.org/v1/images",
  token: "the-token",
  expiresAt: "2026-11-18T12:05:00.000Z",
  maxBytes: 5_242_880,
};

afterEach(() => vi.restoreAllMocks());

describe("RequestCoverUpload", () => {
  it("returns the grant and the API's request id", async () => {
    vi.spyOn(Axios, "post").mockResolvedValue({
      status: 200,
      data: grant,
      headers: { "x-request-id": "api-req-42" },
    });

    expect(await RequestCoverUpload()).toEqual({
      status: 200,
      grant,
      requestId: "api-req-42",
    });
  });

  it("does not pass on a request id with odd characters", async () => {
    vi.spyOn(Axios, "post").mockResolvedValue({
      status: 200,
      data: grant,
      headers: { "x-request-id": 'bad id"<script>' },
    });

    expect((await RequestCoverUpload()).requestId).toBeUndefined();
  });

  it("returns the status, the message and the id of a refusal", async () => {
    vi.spyOn(Axios, "post").mockRejectedValue({
      response: {
        status: 403,
        data: { message: "not an organization" },
        headers: { "x-request-id": "r-9" },
      },
    });

    expect(await RequestCoverUpload()).toEqual({
      status: 403,
      message: "not an organization",
      requestId: "r-9",
    });
  });

  it("copes with a failure that has no answer at all", async () => {
    vi.spyOn(Axios, "post").mockRejectedValue(new Error("Network Error"));

    expect(await RequestCoverUpload()).toEqual({
      status: undefined,
      message: undefined,
      requestId: undefined,
    });
  });
});

describe("SendCoverImage", () => {
  const file = new File(["pixels"], "cover.png", { type: "image/png" });

  it("sends the token, the request id and no cookies to the image service", async () => {
    const post = vi
      .spyOn(Axios, "post")
      .mockResolvedValue({ status: 201, data: { id: "x" } });

    await SendCoverImage(grant, file, { requestId: "api-req-42" });

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe(grant.uploadUrl);
    expect((body as FormData).get("file")).toBeInstanceOf(File);
    expect(config?.headers).toEqual({
      Authorization: "Bearer the-token",
      "X-Request-Id": "api-req-42",
    });
    expect(config?.withCredentials).toBe(false);
  });

  it("leaves the request id header out when there is none", async () => {
    const post = vi
      .spyOn(Axios, "post")
      .mockResolvedValue({ status: 201, data: {} });

    await SendCoverImage(grant, file, {});

    expect(post.mock.calls[0][2]?.headers).toEqual({
      Authorization: "Bearer the-token",
    });
  });

  it("reports a lost connection and a cancel differently", async () => {
    vi.spyOn(Axios, "post").mockRejectedValueOnce(new Error("Network Error"));
    expect(await SendCoverImage(grant, file, {})).toEqual({
      networkError: true,
    });

    vi.spyOn(Axios, "isCancel").mockReturnValue(true);
    vi.spyOn(Axios, "post").mockRejectedValueOnce(new Error("canceled"));
    expect(await SendCoverImage(grant, file, {})).toEqual({ cancelled: true });
  });
});
