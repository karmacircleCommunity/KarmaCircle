import type {
  EventFacts,
  Recipient,
} from "../../src/modules/notifications/notification.jobs";

/** Fixed inputs for the contract fixtures in apps/notification-worker/testdata/contract. */
export const beachDay: EventFacts = {
  uid: "beach-day",
  name: "Beach clean-up",
  startTime: new Date("2026-11-22T01:30:00Z"),
  endTime: new Date("2026-11-22T04:30:00Z"),
  timezone: "Asia/Kolkata",
  mode: "Offline",
  address: "Juhu Beach",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
};

export const asha: Recipient = {
  registrationId: "65f1a2b3c4d5e6f708192a3b",
  email: "asha@example.com",
  name: "Asha",
};

export const noon = new Date("2026-11-18T12:00:00Z");
