/**
 * Fill the current development organization dashboard with clearly marked
 * sample activity for local UI review.
 *
 * This script only writes to the `karmacircle_dev` database and requires an
 * explicit flag. Demo contribution records never represent a Razorpay
 * transaction and are labeled as sample data in the owner dashboard.
 *
 * Run from `apps/api`: `pnpm exec tsx scripts/seed-organization-dashboard-demo.ts --confirm-demo-data`.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import {
  Organization,
  OrganizationAnalyticsEvent,
  OrganizationFollow,
} from "../src/modules/organizations/organization.model";
import { ORDER_STATUS, Order } from "../src/modules/payments/order.model";
import { Individual } from "../src/modules/users/user.model";

const MONGO_URI = process.env.MONGO_URI;
const DEMO_PASSWORD = "Demo@1234";
const ORGANIZATION_HANDLE = process.env.DEMO_ORGANIZATION_HANDLE || "ishowspeed";
const DEMO_MEMBERS = [
  { name: "Maya Volunteer", email: "maya.volunteer@example.com", userName: "maya_volunteer" },
  { name: "Arjun Mehta", email: "arjun.mehta@example.com", userName: "arjun_mehta" },
  { name: "Nisha Rao", email: "nisha.rao@example.com", userName: "nisha_rao" },
  { name: "Dev Kapoor", email: "dev.kapoor@example.com", userName: "dev_kapoor" },
  { name: "Sana Iyer", email: "sana.iyer@example.com", userName: "sana_iyer" },
];

const coverFor = () =>
  "/images/organization-covers/riverbend-resilience.jpg";
const logoFor = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontWeight=600`;

async function seedDashboardDemo() {
  if (!process.argv.includes("--confirm-demo-data")) {
    throw new Error("Pass --confirm-demo-data to write sample records to the development database.");
  }
  if (!MONGO_URI) throw new Error("MONGO_URI is missing from apps/api/.env.");

  await mongoose.connect(MONGO_URI);
  if (mongoose.connection.name !== "karmacircle_dev") {
    throw new Error(`Refusing to seed database '${mongoose.connection.name}'. Expected karmacircle_dev.`);
  }

  const organization = await Organization.findOne({ handle: ORGANIZATION_HANDLE });
  if (!organization || organization.status !== "live") {
    throw new Error(`No published organization found for handle '${ORGANIZATION_HANDLE}'.`);
  }

  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const members = await Promise.all(
    DEMO_MEMBERS.map((member) =>
      Individual.findOneAndUpdate(
        { email: member.email },
        {
          $set: {
            userType: "individual",
            userName: member.userName,
            name: member.name,
            email: member.email,
            description: "KarmaCircle dashboard demo member.",
            config: { hasCompletedProfile: true },
            password: demoPasswordHash,
            cart: [],
            tokenVersion: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  const now = new Date();
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  const eventRows = [
    { uid: "demo-ishowspeed-riverbank-cleanup", name: "Riverbank Cleanup & Safety Walk", day: -9, city: "Navi Mumbai", registrations: 5 },
    { uid: "demo-ishowspeed-home-repair", name: "Monsoon Home Repair Day", day: -2, city: "Panvel", registrations: 4 },
    { uid: "demo-ishowspeed-flood-readiness", name: "Community Flood Readiness Workshop", day: 4, city: "Navi Mumbai", registrations: 5 },
    { uid: "demo-ishowspeed-rebuild-weekend", name: "Riverbank Rebuild Weekend", day: 11, city: "Thane", registrations: 5 },
    { uid: "demo-ishowspeed-volunteer-training", name: "Volunteer Repair Skills Training", day: 19, city: "Navi Mumbai", registrations: 3 },
  ];

  for (const [eventIndex, eventRow] of eventRows.entries()) {
    const startTime = at(eventRow.day, eventIndex % 2 === 0 ? 9 : 10, 0);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
    await Event.findOneAndUpdate(
      { uid: eventRow.uid },
      {
        $set: {
          name: eventRow.name,
          uid: eventRow.uid,
          description: `Join ${organization.name} and local volunteers to repair homes and prepare riverbank neighborhoods for the next monsoon.`,
          hostUsername: organization.handle,
          hostName: organization.name,
          organizerHandle: organization.handle,
          coverImage: "",
          mode: "Offline",
          address: `${eventRow.city} community center`,
          city: eventRow.city,
          state: "Maharashtra",
          country: "India",
          startTime,
          endTime,
          startDate: startTime,
          endDate: endTime,
          isGovernmentSponsored: false,
          inviteOnly: false,
          about: ["A community-led day of practical repairs, safety preparation, and volunteer coordination."],
          agenda: [
            { time: "9:00 am", title: "Check in and safety briefing" },
            { time: "9:30 am", title: "Neighborhood repair teams" },
            { time: "11:30 am", title: "Progress review and next steps" },
          ],
          languages: ["English", "Hindi", "Marathi"],
          contactEmail: organization.contactEmail,
          isDemo: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    for (let attendeeIndex = 0; attendeeIndex < eventRow.registrations; attendeeIndex += 1) {
      const attendee = members[(eventIndex + attendeeIndex) % members.length];
      const member = members.find((candidate) => candidate.email === attendee.email);
      if (!member) continue;
      await EventRegistration.findOneAndUpdate(
        { eventUid: eventRow.uid, userId: member._id },
        {
          $set: {
            eventUid: eventRow.uid,
            userId: member._id,
            attendeeEmail: member.email,
            attendeeName: member.name,
            isDemo: true,
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const [index, member] of DEMO_MEMBERS.entries()) {
    await OrganizationFollow.findOneAndUpdate(
      { organizationHandle: organization.handle, followerEmail: member.email },
      {
        $set: { isDemo: true },
        $setOnInsert: { organizationHandle: organization.handle, followerEmail: member.email },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    const supportedAt = at(-index * 3 - 1, 13 + (index % 5));
    const razorpayOrderId = `demo_${organization.handle}_support_${index + 1}`;
    await Order.findOneAndUpdate(
      { razorpayOrderId },
      {
        $set: {
          organizationHandle: organization.handle,
          amountPaise: [25000, 50000, 75000, 100000, 150000][index],
          currency: "INR",
          razorpayOrderId,
          status: ORDER_STATUS.Paid,
          supporterName: member.name,
          supporterEmail: member.email,
          isDemo: true,
          createdAt: supportedAt,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const viewOps = [];
  for (let dayOffset = -89; dayOffset <= 0; dayOffset += 1) {
    const dailyViews = (Math.abs(dayOffset * 7 + organization.handle.length * 3) % 18) + (dayOffset % 4 === 0 ? 4 : 0);
    for (let viewIndex = 0; viewIndex < dailyViews; viewIndex += 1) {
      const occurredAt = at(dayOffset, 8 + (viewIndex % 12), (viewIndex * 7) % 60);
      const demoKey = `${organization.handle}:${occurredAt.toISOString().slice(0, 10)}:${viewIndex}`;
      viewOps.push({
        updateOne: {
          filter: { demoKey },
          update: {
            $set: {
              organizationHandle: organization.handle,
              eventType: "profile_view",
              isDemo: true,
              demoKey,
              occurredAt,
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (viewOps.length) await OrganizationAnalyticsEvent.bulkWrite(viewOps);

  const followers = await OrganizationFollow.countDocuments({ organizationHandle: organization.handle });
  await Organization.updateOne(
    { _id: organization._id },
    {
      $set: {
        followers,
        logo: logoFor(organization.name),
        cover: coverFor(),
        contactEmail: "community@karmacircle.example",
        contactPhone: "+91 98765 43210",
        sponsorship: { enabled: true },
        status: "live",
      },
    },
  );

  console.log(`Seeded demo dashboard for /organization/${organization.handle}.`);
  console.log("Demo sign-in: maya.volunteer@example.com / Demo@1234");
  console.log("All seeded events, follows, views, and contributions are marked as demo data.");
}

seedDashboardDemo()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
