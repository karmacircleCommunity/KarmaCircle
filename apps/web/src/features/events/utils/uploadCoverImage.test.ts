import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { put } from "@vercel/blob/client";
import { RequestCoverUpload } from "@services/KarmaCircleApi";
import {
  CoverUploadError,
  uploadCoverImage,
} from "@features/events/utils/uploadCoverImage";

vi.mock("@services/KarmaCircleApi", () => ({ RequestCoverUpload: vi.fn() }));
vi.mock("@vercel/blob/client", () => ({ put: vi.fn() }));

const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
  type: "image/png",
});

const ask = vi.mocked(RequestCoverUpload);
const blobPut = vi.mocked(put);

describe("uploadCoverImage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("asks the API with the file's own type and size", async () => {
    ask.mockResolvedValue({ ok: false, message: "Nope" });
    await expect(uploadCoverImage(file)).rejects.toThrow("Nope");
    expect(ask).toHaveBeenCalledWith("image/png", 3);
  });

  it("sends the image to Vercel Blob with the ticket and returns its link", async () => {
    ask.mockResolvedValue({
      ok: true,
      ticket: {
        strategy: "vercel-blob",
        clientToken: "client-token",
        pathname: "event-covers/abc.png",
      },
    });
    blobPut.mockResolvedValue({
      url: "https://store.public.blob.vercel-storage.com/event-covers/abc.png",
    } as Awaited<ReturnType<typeof put>>);

    const url = await uploadCoverImage(file);

    expect(url).toBe(
      "https://store.public.blob.vercel-storage.com/event-covers/abc.png",
    );
    expect(blobPut).toHaveBeenCalledWith("event-covers/abc.png", file, {
      access: "public",
      token: "client-token",
      contentType: "image/png",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PUTs to the signed URL for a direct ticket and returns the public link", async () => {
    ask.mockResolvedValue({
      ok: true,
      ticket: {
        strategy: "direct",
        uploadUrl: "http://localhost:5050/uploads/local/token",
        method: "PUT",
        publicUrl: "http://localhost:5050/uploads/files/event-covers/abc.png",
      },
    });
    fetchMock.mockResolvedValue({ ok: true });

    const url = await uploadCoverImage(file);

    expect(url).toBe(
      "http://localhost:5050/uploads/files/event-covers/abc.png",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5050/uploads/local/token",
      { method: "PUT", headers: { "Content-Type": "image/png" }, body: file },
    );
    expect(blobPut).not.toHaveBeenCalled();
  });

  it("shows the API's own message when the direct upload is refused", async () => {
    ask.mockResolvedValue({
      ok: true,
      ticket: {
        strategy: "direct",
        uploadUrl: "http://localhost:5050/uploads/local/token",
        method: "PUT",
        publicUrl: "http://localhost:5050/uploads/files/event-covers/abc.png",
      },
    });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "That upload is too large." }),
    });

    await expect(uploadCoverImage(file)).rejects.toThrow(
      "That upload is too large.",
    );
  });

  it("turns a network or Blob failure into one plain message", async () => {
    ask.mockResolvedValue({
      ok: true,
      ticket: {
        strategy: "vercel-blob",
        clientToken: "t",
        pathname: "event-covers/abc.png",
      },
    });
    blobPut.mockRejectedValue(new Error("socket hang up"));

    const failure = uploadCoverImage(file);
    await expect(failure).rejects.toBeInstanceOf(CoverUploadError);
    await expect(failure).rejects.toThrow(/Check your connection/);
  });

  it("falls back to a plain message when the API gives none", async () => {
    ask.mockResolvedValue({ ok: false });
    await expect(uploadCoverImage(file)).rejects.toThrow(
      /couldn’t start the upload/,
    );
  });
});
