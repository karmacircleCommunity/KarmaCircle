import { put } from "@vercel/blob/client";
import { RequestCoverUpload } from "@services/KarmaCircleApi";

/** A failed cover upload, with a message that is fine to show the organizer. */
export class CoverUploadError extends Error {}

/**
 * Uploads one event cover and returns the https link the event keeps (DB-1).
 *
 * The image never goes into the event form as data and never passes through the
 * API's JSON body: the API only says where to send it (`RequestCoverUpload`),
 * and the browser sends it there. In production that is Vercel Blob with a
 * short-lived token; in development and test it is a signed URL on the API.
 * The API checks type, size and the organizer's account at both steps.
 *
 * Throws `CoverUploadError`; its message is the one to show.
 */
export async function uploadCoverImage(file: File): Promise<string> {
  const asked = await RequestCoverUpload(file.type, file.size);
  if (!asked.ok) {
    throw new CoverUploadError(
      asked.message ?? "We couldn’t start the upload. Try again.",
    );
  }
  const { ticket } = asked;

  try {
    if (ticket.strategy === "vercel-blob") {
      const blob = await put(ticket.pathname, file, {
        access: "public",
        token: ticket.clientToken,
        contentType: file.type,
      });
      return blob.url;
    }

    const response = await fetch(ticket.uploadUrl, {
      method: ticket.method,
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new CoverUploadError(
        body.message ?? "We couldn’t upload that image. Try again.",
      );
    }
    return ticket.publicUrl;
  } catch (error) {
    if (error instanceof CoverUploadError) throw error;
    throw new CoverUploadError(
      "We couldn’t upload that image. Check your connection and choose it again.",
    );
  }
}
