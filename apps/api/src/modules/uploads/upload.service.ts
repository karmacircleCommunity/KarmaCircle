import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { env } from "../../config/env";
import { STATUS_CODE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { findByEmail } from "../users/user.service";
import { COVER_IMAGE_MAX_BYTES } from "../events/event.constants";
import type {
  CoverImageContentType,
  CoverUploadRequest,
} from "./upload.validation";

/**
 * Event cover uploads (DB-1). A cover used to travel as a base64 string inside
 * the event document, so every event list carried every image. Now the image
 * lives in object storage and the event keeps only its https link.
 *
 * The browser asks this API for an upload "ticket" and sends the bytes straight
 * to storage, never through the API (a serverless function cannot take a body
 * of this size anyway):
 *
 * - `vercel-blob` (production, and any environment with a
 *   `BLOB_READ_WRITE_TOKEN`): the ticket is a short-lived Blob client token that
 *   allows exactly one content type, the size cap and one random pathname.
 * - `direct` (development and test, no token): the ticket is a signed URL on
 *   this API itself; the bytes are written to `UPLOADS_DIR` and served back from
 *   `/uploads/files`. It exists so the whole flow runs offline and in the
 *   isolated test suites, and is never offered in production.
 */

export const EVENT_COVER_FOLDER = "event-covers";
const TICKET_LIFETIME_MS = 10 * 60 * 1000;

const EXTENSIONS: Record<CoverImageContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadTicket =
  | {
      strategy: "vercel-blob";
      clientToken: string;
      pathname: string;
    }
  | {
      strategy: "direct";
      uploadUrl: string;
      method: "PUT";
      /** The link the event will keep once the bytes are uploaded. */
      publicUrl: string;
    };

/** Which driver is active: Blob when it has a token, otherwise local disk. */
export const storageDriver = (): "vercel-blob" | "local" | "none" => {
  if (env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return env.NODE_ENV === "production" ? "none" : "local";
};

export const uploadsDir = () =>
  path.resolve(env.UPLOADS_DIR || path.join(process.cwd(), ".uploads"));

const base64url = (value: Buffer | string) =>
  Buffer.from(value).toString("base64url");

const sign = (payload: string) =>
  crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(payload)
    .digest("base64url");

interface LocalTicketPayload {
  /** File name inside the event cover folder. */
  f: string;
  /** Media type the bytes must be. */
  t: CoverImageContentType;
  /** Expiry, epoch ms. */
  e: number;
}

const signLocalTicket = (payload: LocalTicketPayload) => {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
};

const readLocalTicket = (token: string): LocalTicketPayload => {
  const invalid = () =>
    new AppError(STATUS_CODE.FORBIDDEN, "This upload link is not valid.");
  const [body, signature] = token.split(".");
  if (!body || !signature) throw invalid();

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(expected, given)
  ) {
    throw invalid();
  }

  let payload: LocalTicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (
    typeof payload.f !== "string" ||
    !/^[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(payload.f) ||
    typeof payload.e !== "number" ||
    !(payload.t in EXTENSIONS)
  ) {
    throw invalid();
  }
  if (payload.e < Date.now()) {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      "This upload link has expired. Choose the image again.",
    );
  }
  return payload;
};

/**
 * The media type the first bytes of a file really have, or `undefined` when it
 * is none of the four allowed image types. The declared type of an upload is
 * only a claim; this is what the bytes say.
 */
export function sniffImageType(
  bytes: Buffer,
): CoverImageContentType | undefined {
  if (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))
  ) {
    return "image/gif";
  }
  return undefined;
}

/**
 * Gives an organization an upload ticket for one event cover. Only an
 * organization account can create or edit an event, so only one gets a ticket.
 */
export async function createCoverUpload(
  email: string,
  request: CoverUploadRequest,
  origin: string,
): Promise<UploadTicket> {
  const user = await findByEmail(email);
  if (!user) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, "Unauthorized");
  }
  if (user.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      "Only an organization account can upload an event cover.",
    );
  }

  const driver = storageDriver();
  if (driver === "none") {
    throw new AppError(
      STATUS_CODE.SERVICE_UNAVAILABLE,
      "Image uploads are not set up on this server yet.",
    );
  }

  const extension = EXTENSIONS[request.contentType];

  if (driver === "vercel-blob") {
    const pathname = `${EVENT_COVER_FOLDER}/${crypto.randomUUID()}.${extension}`;
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: env.BLOB_READ_WRITE_TOKEN as string,
      pathname,
      allowedContentTypes: [request.contentType],
      maximumSizeInBytes: COVER_IMAGE_MAX_BYTES,
      validUntil: Date.now() + TICKET_LIFETIME_MS,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return { strategy: "vercel-blob", clientToken, pathname };
  }

  const fileName = `${crypto.randomUUID()}.${extension}`;
  const token = signLocalTicket({
    f: fileName,
    t: request.contentType,
    e: Date.now() + TICKET_LIFETIME_MS,
  });
  return {
    strategy: "direct",
    uploadUrl: `${origin}/uploads/local/${token}`,
    method: "PUT",
    publicUrl: `${origin}/uploads/files/${EVENT_COVER_FOLDER}/${fileName}`,
  };
}

/**
 * Writes the bytes of a local-driver upload (development and test only). The
 * signed ticket in the URL decides the file name and the type, so the caller
 * can neither pick a path nor store anything but one of the four image types:
 * the declared header and the real bytes must both match the ticket.
 */
export async function saveLocalUpload(
  token: string,
  declaredType: string | undefined,
  bytes: Buffer,
): Promise<void> {
  if (storageDriver() !== "local") {
    throw new AppError(STATUS_CODE.NOT_FOUND, "Not found");
  }
  const ticket = readLocalTicket(token);

  if (declaredType !== ticket.t) {
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      "The image type does not match what was asked for.",
    );
  }
  if (bytes.length === 0 || bytes.length > COVER_IMAGE_MAX_BYTES) {
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      "Cover image must be 5 MB or smaller",
    );
  }
  if (sniffImageType(bytes) !== ticket.t) {
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      "That file is not a valid image of the chosen type.",
    );
  }

  const folder = path.join(uploadsDir(), EVENT_COVER_FOLDER);
  await fs.mkdir(folder, { recursive: true });
  // `wx`: a ticket names one file and cannot overwrite an earlier upload.
  try {
    await fs.writeFile(path.join(folder, ticket.f), bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new AppError(
        STATUS_CODE.CONFLICT,
        "This image was already uploaded. Choose it again.",
      );
    }
    throw error;
  }
}
