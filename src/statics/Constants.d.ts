/**
 * Type declarations for the plain-JS `Constants.js` sitting next to this
 * file. `Constants.js` itself is out of scope for this pass (it's shared
 * by features beyond authentication/clubs) so it isn't being converted —
 * but `authTypeOptions` feeds directly into the `UserType` enum both
 * converted features now use, and TypeScript can't narrow a `.js` file's
 * inferred `string` down to that enum on its own. This sibling `.d.ts`
 * is picked up automatically for type-checking purposes only; the `.js`
 * file is still what actually runs.
 */
import type { AuthTypeOption } from "@/types/user";

export declare const defaults: {
  coverImage: string;
  logo: string;
};

export declare const authTypeOptions: AuthTypeOption[];

export declare const brandingFields: string[];
export declare const addressFields: string[];
export declare const mandatoryFields: string[];
export declare const emailRegex: RegExp;

export declare const STATUSCODE: {
  OK: number;
  CREATED: number;
  ACCEPTED: number;
  NO_CONTENT: number;
  MOVED_PERMANENTLY: number;
  FOUND: number;
  NOT_MODIFIED: number;
  BAD_REQUEST: number;
  UNAUTHORIZED: number;
  FORBIDDEN: number;
  NOT_FOUND: number;
  METHOD_NOT_ALLOWED: number;
  NOT_ACCEPTABLE: number;
  CONFLICT: number;
  GONE: number;
  PRECONDITION_FAILED: number;
  UNSUPPORTED_MEDIA_TYPE: number;
  UNPROCESSABLE_ENTITY: number;
  TOO_MANY_REQUESTS: number;
  INTERNAL_SERVER_ERROR: number;
  NOT_IMPLEMENTED: number;
  BAD_GATEWAY: number;
  SERVICE_UNAVAILABLE: number;
  GATEWAY_TIMEOUT: number;
};

export declare const STATUSMESSAGE: Record<string, string>;
