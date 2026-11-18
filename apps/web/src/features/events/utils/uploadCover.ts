import type {
  CoverSendOptions,
  CoverUploadDeps,
  UploadedCover,
} from "@features/events/types/interfaces";
import type { CoverUploadOutcome } from "@features/events/types/types";

export const COVER_READ_ERROR =
  "We couldn’t read that image. Choose it again to retry.";
export const COVER_NETWORK_ERROR =
  "We couldn’t reach the upload service. Check your connection and try again.";
export const COVER_GENERIC_ERROR = "We couldn’t upload that image. Try again.";

/** True when the image service answered with the sizes it stored. */
const isUploadedCover = (body: unknown): body is UploadedCover => {
  const card = (body as UploadedCover | undefined)?.variants?.card;
  return typeof card?.url === "string" && /^https?:\/\//.test(card.url);
};

/** The service's own message when it sent one, otherwise a plain fallback. */
const serviceMessage = (body: unknown, fallback: string): string => {
  const message = (body as { error?: unknown } | undefined)?.error;
  return typeof message === "string" && message ? message : fallback;
};

const messageForSendStatus = (status: number | undefined, body: unknown) => {
  switch (status) {
    case 401:
      // The token only lives five minutes.
      return "That upload expired. Choose the image again.";
    case 413:
      return serviceMessage(body, "That image is too large.");
    case 415:
      return serviceMessage(
        body,
        "Cover image must be a PNG, JPEG, WebP or GIF image",
      );
    case 422:
      return serviceMessage(body, "That image looks damaged. Try another one.");
    case 503:
      return "Uploads are busy right now. Try again in a few seconds.";
    default:
      return COVER_GENERIC_ERROR;
  }
};

/**
 * Turns a chosen picture into something the event can keep.
 *
 * Normally that is a link: the API hands out a short-lived token, the picture
 * goes straight to the image service, and the event stores the `card` link it
 * gets back. When the API says image uploads are not set up (503), the picture
 * is read into a data URL and goes inside the event, which is how covers
 * worked before the image service, so a server without it still works.
 */
export async function uploadCover(
  file: File,
  deps: CoverUploadDeps,
  options: CoverSendOptions = {},
): Promise<CoverUploadOutcome> {
  const cancelled = (): CoverUploadOutcome => ({ kind: "cancelled" });
  if (options.signal?.aborted) return cancelled();

  const granted = await deps.requestGrant();
  if (options.signal?.aborted) return cancelled();

  if (granted.status === 503) {
    try {
      const dataUrl = await deps.readAsDataUrl(file);
      return options.signal?.aborted
        ? cancelled()
        : { kind: "inline", dataUrl };
    } catch {
      return { kind: "failed", message: COVER_READ_ERROR };
    }
  }
  if (!granted.grant) {
    if (granted.status === 401) {
      return {
        kind: "failed",
        message: "Please sign in again to upload a cover image.",
      };
    }
    if (granted.status === 403) {
      return {
        kind: "failed",
        message: "Only organization accounts can upload a cover image.",
      };
    }
    return {
      kind: "failed",
      message: granted.status ? COVER_GENERIC_ERROR : COVER_NETWORK_ERROR,
    };
  }

  const sent = await deps.sendFile(granted.grant, file, options);
  if (sent.cancelled || options.signal?.aborted) return cancelled();
  if (sent.networkError)
    return { kind: "failed", message: COVER_NETWORK_ERROR };

  if (sent.status === 201 && isUploadedCover(sent.body)) {
    return { kind: "uploaded", url: sent.body.variants.card.url };
  }
  return {
    kind: "failed",
    message: messageForSendStatus(sent.status, sent.body),
  };
}
