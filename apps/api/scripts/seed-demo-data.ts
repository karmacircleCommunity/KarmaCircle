/**
 * One-off demo data seeder.
 *
 * Populates the karmacircle_dev database with a handful of documents in
 * each of the app's real collections (users/individuals+organizations, events,
 * products, reports) using the actual Mongoose models — not throwaway
 * ad-hoc "tables" — so the shape matches what the app itself would write.
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 * (reads MONGO_URI from apps/api/.env, same as the server does.)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Individual, Organization } from "../src/modules/users/user.model";
import { Event } from "../src/modules/events/event.model";
import { Product } from "../src/modules/products/product.model";
import { ReportProblem } from "../src/modules/reports/report.model";

const SALT_ROUNDS = 10;
const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set (check apps/api/.env)");
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const demoPassword = await bcrypt.hash("Demo@1234", SALT_ROUNDS);

  // --- Users: individuals ---
  const individuals = await Individual.insertMany([
    {
      userType: "individual",
      userName: "aditi_rao",
      name: "Aditi Rao",
      email: "aditi.rao@example.com",
      phone: "+91 98765 43210",
      description: "Volunteer coordinator, loves beach cleanups.",
      address: { city: "Mumbai", state: "Maharashtra", country: "India" },
      config: { hasCompletedProfile: true },
      password: demoPassword,
      cart: [],
      tokenVersion: 0,
    },
    {
      userType: "individual",
      userName: "rohan_mehta",
      name: "Rohan Mehta",
      email: "rohan.mehta@example.com",
      phone: "+91 91234 56789",
      description: "First-time volunteer, into education drives.",
      address: { city: "Pune", state: "Maharashtra", country: "India" },
      config: { hasCompletedProfile: true },
      password: demoPassword,
      cart: [],
      tokenVersion: 0,
    },
  ]);

  // --- Users: organizations ---
  const organizations = await Organization.insertMany([
    {
      userType: "organization",
      userName: "green_earth_ngo",
      name: "Green Earth NGO",
      email: "contact@greenearth.example.com",
      phone: "+91 90000 11111",
      description: "Community-driven environmental NGO running tree drives and cleanups.",
      address: { city: "Bengaluru", state: "Karnataka", country: "India" },
      config: { hasCompletedProfile: true },
      password: demoPassword,
      cart: [],
      tokenVersion: 0,
    },
    {
      userType: "organization",
      userName: "shiksha_seva",
      name: "Shiksha Seva Foundation",
      email: "hello@shikshaseva.example.com",
      phone: "+91 90000 22222",
      description: "Education-focused NGO providing free tutoring to underprivileged kids.",
      address: { city: "Delhi", state: "Delhi", country: "India" },
      config: { hasCompletedProfile: true },
      password: demoPassword,
      cart: [],
      tokenVersion: 0,
    },
  ]);

  console.log(`Inserted ${individuals.length} individuals, ${organizations.length} organizations`);

  // --- Events ---
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const events = await Event.insertMany([
    {
      name: "Beach Cleanup Drive",
      uid: "evt-beach-cleanup-001",
      description: "Join us for a morning of cleaning up Juhu Beach. Gloves and bags provided.",
      hostUsername: "green_earth_ngo",
      hostName: "Green Earth NGO",
      mode: "Offline",
      address: "Juhu Beach",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      startTime: inDays(7),
      endTime: inDays(7),
      startDate: inDays(7),
      endDate: inDays(7),
    },
    {
      name: "Free Tutoring Bootcamp",
      uid: "evt-tutoring-bootcamp-002",
      description: "Weekend math and science tutoring for grades 6-10.",
      hostUsername: "shiksha_seva",
      hostName: "Shiksha Seva Foundation",
      mode: "Offline",
      address: "Community Hall, Sector 12",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      startTime: inDays(14),
      endTime: inDays(14),
      startDate: inDays(14),
      endDate: inDays(14),
    },
    {
      name: "Virtual Fundraiser Webinar",
      uid: "evt-fundraiser-webinar-003",
      description: "Online session on how to run effective grassroots fundraisers.",
      hostUsername: "green_earth_ngo",
      hostName: "Green Earth NGO",
      mode: "Online",
      platform: "Zoom",
      platformLink: "https://zoom.us/j/demo123456",
      startTime: inDays(3),
      endTime: inDays(3),
      startDate: inDays(3),
      endDate: inDays(3),
    },
  ]);

  console.log(`Inserted ${events.length} events`);

  // --- Products ---
  const products = await Product.insertMany([
    {
      productType: "Apparel",
      productName: "Green Earth NGO T-Shirt",
      productPrice: 499,
      productDescription: "100% organic cotton tee, proceeds fund tree-planting drives.",
      productImage: "https://placehold.co/400x400?text=NGO+T-Shirt",
      productQty: 120,
      productSlug: "green-earth-ngo-tshirt",
    },
    {
      productType: "Accessories",
      productName: "Reusable Cloth Tote Bag",
      productPrice: 249,
      productDescription: "Handwoven jute tote bag supporting local artisans.",
      productImage: "https://placehold.co/400x400?text=Tote+Bag",
      productQty: 80,
      productSlug: "reusable-cloth-tote-bag",
    },
    {
      productType: "Stationery",
      productName: "Shiksha Seva Notebook Set",
      productPrice: 149,
      productDescription: "Pack of 3 recycled-paper notebooks; every sale funds a student's supplies.",
      productImage: "https://placehold.co/400x400?text=Notebook+Set",
      productQty: 200,
      productSlug: "shiksha-seva-notebook-set",
    },
  ]);

  console.log(`Inserted ${products.length} products`);

  // --- Reports ---
  const reports = await ReportProblem.insertMany([
    {
      firstName: "Neha",
      lastName: "Sharma",
      email: "neha.sharma@example.com",
      reportmessage: "The event RSVP button doesn't respond on mobile Safari.",
    },
    {
      firstName: "Vikram",
      lastName: "Iyer",
      email: "vikram.iyer@example.com",
      reportmessage: "Profile picture upload fails for files over 2MB with no error shown.",
    },
  ]);

  console.log(`Inserted ${reports.length} reports`);

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
