/**
 * One-off demo data seeder.
 *
 * Populates the karmacircle_dev database with a handful of documents in
 * each of the app's real collections — using the actual Mongoose models,
 * not throwaway ad-hoc "tables" — so the shape matches what the app itself
 * would write.
 *
 * Idempotent: every write below is an upsert keyed on a stable field
 * (email/userName/handle/uid), so re-running this after a schema change
 * updates the existing demo records instead of throwing a duplicate-key
 * error on the second run.
 *
 * Organizations, specifically, go through **two** collections, matching
 * exactly what a real signup does (see auth.service.ts and
 * organizations/organization.service.ts#createForOwner): a `users` login
 * document (the `Organization` discriminator) *and* a document in the
 * separate `organizations` collection, created directly as `status: "live"`
 * with every field a real profile can carry filled in, rather than a draft
 * that would 404 on `/organizations`. The previous version of this script
 * only wrote the `users` half, which is why `/organizations` never showed
 * any of this seed data.
 *
 * Placeholder images are generated, not hand-picked, from stable public
 * placeholder services already used elsewhere in this codebase
 * (`https://placehold.co/...` for products, below) rather than pointing at
 * any real organization's actual branding:
 *   - logos: DiceBear's `initials` set (a deterministic lettermark)
 *   - covers: Picsum Photos, seeded so the same organization always gets
 *     the same photo across reseeds
 *   - leadership photos: pravatar.cc, seeded the same way
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 * (reads MONGO_URI from apps/api/.env, same as the server does.)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Individual, Organization as OrganizationLogin } from "../src/modules/users/user.model";
import { Organization as OrganizationRecord } from "../src/modules/organizations/organization.model";
import { Event } from "../src/modules/events/event.model";
import { Product } from "../src/modules/products/product.model";
import { ReportProblem } from "../src/modules/reports/report.model";

const SALT_ROUNDS = 10;
const MONGO_URI = process.env.MONGO_URI;

const logoUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontWeight=600`;
const coverUrl = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/675`;
const galleryUrl = (seed: string, n: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-${n}/800/600`;
const avatarUrl = (seed: string) =>
  `https://i.pravatar.cc/300?u=${encodeURIComponent(seed)}`;

interface DemoLeader {
  name: string;
  title: string;
  bio: string;
}

interface DemoOrg {
  handle: string;
  name: string;
  email: string;
  phone: string;
  description: string;
  tag: string;
  domains: string[];
  city: string;
  state: string;
  address: string;
  teamSize: number;
  website: string;
  verified: boolean;
  sponsorshipEnabled: boolean;
  fundsRaised: number;
  fundsGoal: number;
  socialLinks: { instagram?: string; twitter?: string; linkedin?: string };
  leadership: DemoLeader[];
}

const DEMO_ORGS: DemoOrg[] = [
  {
    handle: "green_earth_ngo",
    name: "Green Earth NGO",
    email: "contact@greenearth.example.com",
    phone: "+91 90000 11111",
    description:
      "Community-driven environmental NGO running tree drives and cleanups across Bengaluru.\n\nWe partner with schools and residents' welfare associations to turn one-off cleanup days into standing neighbourhood habits, and we publish exactly what each drive raised and spent.",
    tag: "NGO",
    domains: ["Environment", "Disaster relief"],
    city: "Bengaluru",
    state: "Karnataka",
    address: "14 Cubbon Park Road",
    teamSize: 42,
    website: "https://greenearth.example.com",
    verified: true,
    sponsorshipEnabled: true,
    fundsRaised: 480000,
    fundsGoal: 750000,
    socialLinks: {
      instagram: "https://instagram.com/greenearth.example",
      twitter: "https://x.com/greenearth_ngo",
    },
    leadership: [
      { name: "Ananya Reddy", title: "Founder & Director", bio: "Started Green Earth in 2018 after a decade in urban forestry research." },
      { name: "Kabir Nair", title: "Operations Lead", bio: "Runs the weekend drive logistics and the volunteer roster." },
      { name: "Meera Iyer", title: "Community Partnerships", bio: "Coordinates with RWAs and schools across Bengaluru." },
    ],
  },
  {
    handle: "shiksha_seva",
    name: "Shiksha Seva Foundation",
    email: "hello@shikshaseva.example.com",
    phone: "+91 90000 22222",
    description:
      "Education-focused NGO providing free tutoring to underprivileged kids in Delhi.\n\nOur volunteer tutors run weekend sessions in maths, science and English for grades 6 through 10, and we track every student through to their board exams.",
    tag: "Foundation",
    domains: ["Education"],
    city: "Delhi",
    state: "Delhi",
    address: "Community Hall, Sector 12",
    teamSize: 28,
    website: "https://shikshaseva.example.com",
    verified: true,
    sponsorshipEnabled: true,
    fundsRaised: 210000,
    fundsGoal: 400000,
    socialLinks: {
      linkedin: "https://linkedin.com/company/shiksha-seva",
      instagram: "https://instagram.com/shikshaseva.example",
    },
    leadership: [
      { name: "Rahul Bansal", title: "Founder", bio: "Left a teaching job in 2019 to build Shiksha Seva full-time." },
      { name: "Priya Menon", title: "Curriculum Lead", bio: "Designs the weekend tutoring syllabus for every grade." },
    ],
  },
  {
    handle: "coastal_paws_rescue",
    name: "Coastal Paws Rescue",
    email: "team@coastalpaws.example.com",
    phone: "+91 90000 33333",
    description:
      "Street animal rescue and sterilisation drives along the Mumbai coastline.\n\nWe run a small clinic in Juhu and a mobile unit that covers three more suburbs on a rotating weekly schedule.",
    tag: "Trust",
    domains: ["Animal welfare", "Healthcare"],
    city: "Mumbai",
    state: "Maharashtra",
    address: "Juhu Clinic",
    teamSize: 16,
    website: "https://coastalpaws.example.com",
    verified: false,
    sponsorshipEnabled: false,
    fundsRaised: 95000,
    fundsGoal: 150000,
    socialLinks: { instagram: "https://instagram.com/coastalpaws.example" },
    leadership: [
      { name: "Farah Sheikh", title: "Founder & Vet", bio: "Runs the Juhu clinic and trains the mobile-unit volunteers." },
    ],
  },
  {
    handle: "riverside_relief_trust",
    name: "Riverside Relief Trust",
    email: "office@riversiderelief.example.com",
    phone: "+91 90000 44444",
    description:
      "Flood response and riverbank rebuilding across Assam.\n\nWe clear and rebuild homes after the monsoon and run a year-round flood-preparedness program with the villages we've worked in before.",
    tag: "Trust",
    domains: ["Disaster relief", "Shelter"],
    city: "Guwahati",
    state: "Assam",
    address: "Fancy Bazaar",
    teamSize: 34,
    website: "https://riversiderelief.example.com",
    verified: true,
    sponsorshipEnabled: true,
    fundsRaised: 620000,
    fundsGoal: 1000000,
    socialLinks: {
      twitter: "https://x.com/riversiderelief",
      linkedin: "https://linkedin.com/company/riverside-relief-trust",
    },
    leadership: [
      { name: "Dipankar Saikia", title: "Managing Trustee", bio: "Has led monsoon response for the trust since 2015." },
      { name: "Nomita Baruah", title: "Field Coordinator", bio: "Runs the rebuilding crews on the ground." },
      { name: "Rituraj Das", title: "Finance & Reporting", bio: "Publishes the trust's spend against every drive." },
    ],
  },
  {
    handle: "silver_years_collective",
    name: "Silver Years Collective",
    email: "care@silveryears.example.com",
    phone: "+91 90000 55555",
    description:
      "A student-run group visiting and supporting elder-care homes across Pune.\n\nWeekly visits, festival celebrations, and a small fund for residents without family support.",
    tag: "Student group",
    domains: ["Elderly care"],
    city: "Pune",
    state: "Maharashtra",
    address: "FC Road",
    teamSize: 12,
    website: "",
    verified: false,
    sponsorshipEnabled: false,
    fundsRaised: 0,
    fundsGoal: 0,
    socialLinks: {},
    leadership: [
      { name: "Ishaan Kulkarni", title: "Coordinator", bio: "Second-year student, organises the weekly visit roster." },
    ],
  },
];

async function seed() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set (check apps/api/.env)");
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const demoPassword = await bcrypt.hash("Demo@1234", SALT_ROUNDS);

  // --- Users: individuals ---
  await Individual.findOneAndUpdate(
    { email: "aditi.rao@example.com" },
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
    { upsert: true, setDefaultsOnInsert: true },
  );
  await Individual.findOneAndUpdate(
    { email: "rohan.mehta@example.com" },
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
    { upsert: true, setDefaultsOnInsert: true },
  );

  console.log("Upserted 2 individuals");

  // --- Organizations: the login half + the real organizations-collection half ---
  for (const org of DEMO_ORGS) {
    await OrganizationLogin.findOneAndUpdate(
      { email: org.email },
      {
        userType: "organization",
        userName: org.handle,
        name: org.name,
        email: org.email,
        phone: org.phone,
        description: org.description.split("\n\n")[0],
        address: { city: org.city, state: org.state, country: "India" },
        config: { hasCompletedProfile: true },
        password: demoPassword,
        cart: [],
        tokenVersion: 0,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    await OrganizationRecord.findOneAndUpdate(
      { handle: org.handle },
      {
        handle: org.handle,
        name: org.name,
        ownerEmail: org.email,
        tag: org.tag,
        domains: org.domains,
        description: org.description,
        teamSize: org.teamSize,
        location: { city: org.city, state: org.state, address: org.address },
        website: org.website || undefined,
        contactEmail: org.email,
        contactPhone: org.phone,
        logo: logoUrl(org.handle),
        cover: coverUrl(org.handle),
        gallery: [galleryUrl(org.handle, 1), galleryUrl(org.handle, 2)],
        socialLinks: org.socialLinks,
        leadership: org.leadership.map((leader) => ({
          ...leader,
          photo: avatarUrl(`${org.handle}-${leader.name}`),
        })),
        sponsorship: { enabled: org.sponsorshipEnabled },
        fundsRaised: org.fundsRaised || undefined,
        fundsGoal: org.fundsGoal || undefined,
        followers: Math.round(org.teamSize * (3 + Math.random() * 4)),
        status: "live",
        verified: org.verified,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Upserted ${DEMO_ORGS.length} organizations (login + record)`);

  // --- Events ---
  const now = new Date();
  /**
   * `daysFromNow` days out, at an explicit local hour:minute — unlike the
   * old `inDays(d)` helper this replaces, which only shifted the *day* and
   * left the hour wherever `now` happened to be when the script ran. That
   * was invisible until real events piled up: it meant every seeded event
   * landed at the exact same clock time, which is why every card in the
   * grid used to show the same "22:08" regardless of which event it was.
   */
  const atHour = (daysFromNow: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  interface DemoEvent {
    name: string;
    uid: string;
    description: string;
    host: DemoOrg;
    mode: "Online" | "Offline";
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    platform?: string;
    platformLink?: string;
    /** Day offset from today, and the local hour:minute the event starts. */
    startsIn: number;
    startHour: number;
    startMinute?: number;
    /** Day offset the event *ends* on — almost always the same day as
     *  `startsIn`, except the one multi-day build. */
    endsIn: number;
    endHour: number;
    endMinute?: number;
    isGovernmentSponsored?: boolean;
    inviteOnly?: boolean;
    about: string[];
    agenda: { time: string; title: string; detail?: string }[];
    bringAlong: string[];
    gettingThere?: string;
    linkDelivery?: string;
    joinRequirements?: string;
    languages: string[];
    minimumAge?: number;
    contactEmail: string;
    fundraiser?: {
      purpose: string;
      goal: number;
      raised: number;
      currency: string;
      supporters: number;
    };
  }

  const demoEvents: DemoEvent[] = [
    {
      name: "Beach Cleanup Drive",
      uid: "evt-beach-cleanup-001",
      description: "Join us for a morning of cleaning up Juhu Beach. Gloves and bags provided.",
      host: DEMO_ORGS[2], // coastal_paws_rescue is Mumbai-based; reuse its city
      mode: "Offline",
      address: "Juhu Beach",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      startsIn: 7,
      startHour: 7,
      startMinute: 30,
      endsIn: 7,
      endHour: 10,
      endMinute: 30,
      about: [
        "Juhu Beach collects more plastic every week than our small clinic team can clear on our own, so once a month we open the cleanup to anyone who wants to spend a morning on the sand instead of a screen.",
        "We work the stretch between the Juhu Aksa police chowky and the ISKCON temple gate in three teams — nets and buckets provided, along with enough bin bags for the whole morning's haul.",
      ],
      agenda: [
        { time: "7:30 am", title: "Sign in and gear up", detail: "Gloves, bags and a five-minute safety briefing." },
        { time: "7:50 am", title: "Split into three teams", detail: "Each team takes one third of the stretch." },
        { time: "9:30 am", title: "Weigh-in and sort", detail: "Plastic, glass and general waste sorted separately for the municipal pickup." },
        { time: "10:15 am", title: "Wrap and photos", detail: "A quick group photo before everyone heads off." },
      ],
      bringAlong: ["Closed-toe shoes you don't mind getting sandy", "A reusable water bottle", "Sun protection — there's no shade on this stretch"],
      gettingThere: "Six minutes' walk from Juhu Beach bus stop on the JVPD Scheme side; parking is tight, so most volunteers walk or take an auto to the ISKCON temple gate.",
      languages: ["English", "Hindi", "Marathi"],
      contactEmail: "team@coastalpaws.example.com",
    },
    {
      name: "Free Tutoring Bootcamp",
      uid: "evt-tutoring-bootcamp-002",
      description: "Weekend math and science tutoring for grades 6-10.",
      host: DEMO_ORGS[1], // shiksha_seva
      mode: "Offline",
      address: "Community Hall, Sector 12",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      startsIn: 14,
      startHour: 10,
      endsIn: 14,
      endHour: 14,
      about: [
        "Forty kids from grades 6 through 10 show up most Saturdays for maths and science help that their school day doesn't leave room for. This bootcamp weekend adds English into the rotation and doubles the usual number of tutors on the floor.",
        "No teaching experience is required — you'll be paired with a lead tutor for your first session, and every subject has a simple worksheet-based plan so nobody is improvising a lesson on the spot.",
      ],
      agenda: [
        { time: "10:00 am", title: "Tutor briefing", detail: "Which student groups need which subject most." },
        { time: "10:30 am", title: "Session 1 — Maths & Science", detail: "Small groups of four to five students per tutor." },
        { time: "12:15 pm", title: "Break and snacks" },
        { time: "12:45 pm", title: "Session 2 — English", detail: "Reading practice and a short group activity." },
        { time: "2:00 pm", title: "Close and handout worksheets for the week" },
      ],
      bringAlong: ["Nothing required — worksheets and stationery are provided", "Comfortable clothes; the hall has no air conditioning"],
      gettingThere: "The Community Hall sits directly behind the Sector 12 metro exit, gate 2 — a two-minute walk, no auto needed.",
      languages: ["Hindi", "English"],
      minimumAge: 16,
      contactEmail: "hello@shikshaseva.example.com",
    },
    {
      name: "Virtual Fundraiser Webinar",
      uid: "evt-fundraiser-webinar-003",
      description: "Online session on how to run effective grassroots fundraisers.",
      host: DEMO_ORGS[0], // green_earth_ngo
      mode: "Online",
      platform: "Zoom",
      platformLink: "https://zoom.us/j/demo123456",
      startsIn: 3,
      startHour: 18,
      endsIn: 3,
      endHour: 19,
      about: [
        "We get asked constantly how a forty-person NGO turns a single tree-drive into ₹480,000 raised, so we're finally putting the actual playbook into one session — the asks that worked, the ones that flopped, and what we track every single week.",
        "Built for anyone running (or about to start) a grassroots fundraiser of their own, not just for other environmental groups — the mechanics travel across causes.",
      ],
      agenda: [
        { time: "6:00 pm", title: "What actually moved the needle in 2026" },
        { time: "6:20 pm", title: "The weekly numbers we track, live walkthrough" },
        { time: "6:45 pm", title: "Open Q&A" },
      ],
      linkDelivery: "The Zoom link is emailed immediately on registration, and again one hour before the session starts.",
      joinRequirements: "Zoom, desktop or mobile — no account needed to join as a guest.",
      languages: ["English"],
      contactEmail: "contact@greenearth.example.com",
      fundraiser: {
        purpose: "This quarter's tree-drive costs — saplings, stakes and the watering-truck contract through the dry season.",
        goal: 750000,
        raised: 480000,
        currency: "INR",
        supporters: 214,
      },
    },
    {
      name: "Riverbank Rebuild Weekend",
      uid: "evt-riverbank-rebuild-004",
      description: "Two days rebuilding flood-damaged homes with the Guwahati crew.",
      host: DEMO_ORGS[3], // riverside_relief_trust
      mode: "Offline",
      address: "Fancy Bazaar",
      city: "Guwahati",
      state: "Assam",
      country: "India",
      startsIn: -10, // a past event, so the profile's "past" list has something to show
      startHour: 8,
      endsIn: -9, // spans two days — exercises the detail page's day-count duration
      endHour: 17,
      about: [
        "Eleven homes along the Fancy Bazaar stretch took on water past the doorframe this monsoon. This weekend is the third of five planned rebuild crews, working alongside the families themselves rather than around them.",
        "Saturday is framing and roofing; Sunday is walls and handover. Construction experience helps but isn't required — every crew is led by someone who's done this before.",
      ],
      agenda: [
        { time: "Day 1, 8:00 am", title: "Site briefing and safety walkthrough" },
        { time: "Day 1, 9:00 am", title: "Framing and roofing", detail: "Four houses, four crews." },
        { time: "Day 1, 5:00 pm", title: "Close for the day" },
        { time: "Day 2, 8:00 am", title: "Walls and finishing" },
        { time: "Day 2, 4:00 pm", title: "Handover to each family" },
      ],
      bringAlong: ["Work gloves if you have them (spares available)", "Closed-toe boots — this is a construction site", "A change of clothes for the walk back"],
      gettingThere: "Fancy Bazaar is a five-minute auto ride from Guwahati railway station; the trust's own van also runs a pickup loop from the station every morning at 7:30.",
      languages: ["Assamese", "Hindi", "English"],
      minimumAge: 18,
      contactEmail: "office@riversiderelief.example.com",
      fundraiser: {
        purpose: "Roofing sheets, timber and cement for the remaining two rebuild weekends this season.",
        goal: 1000000,
        raised: 620000,
        currency: "INR",
        supporters: 341,
      },
    },
    {
      name: "Tree Plantation Drive with the Municipal Corporation",
      uid: "evt-tree-plantation-005",
      description: "Planting 500 native saplings along Hesaraghatta Road with BBMP's forestry cell.",
      host: DEMO_ORGS[0], // green_earth_ngo
      mode: "Offline",
      address: "Hesaraghatta Road median, near the Jarakabande Kaval gate",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      startsIn: 10,
      startHour: 7,
      endsIn: 10,
      endHour: 11,
      isGovernmentSponsored: true,
      about: [
        "Run jointly with BBMP's forestry cell, who supply the saplings and the road permits — we supply the volunteers and three months of watering after the drive itself.",
        "Five hundred native saplings (honge, neem and gulmohar) along the Hesaraghatta Road median, planted in family-sized groups spaced every four metres.",
      ],
      agenda: [
        { time: "7:00 am", title: "Arrive and collect your section" },
        { time: "7:20 am", title: "Digging and planting", detail: "BBMP staff on site with a demo pit for anyone new to this." },
        { time: "10:00 am", title: "Watering and stake-tying" },
        { time: "10:45 am", title: "Group photo with the BBMP forestry team" },
      ],
      bringAlong: ["Gardening gloves if you own a pair (spares provided)", "A hat and sunscreen — no shade on the median", "Closed-toe shoes"],
      gettingThere: "The median is directly opposite the Jarakabande Kaval BMTC bus stop; street parking is available along the service road on non-drive days only, so carpooling or the bus is easier this weekend.",
      languages: ["Kannada", "English"],
      contactEmail: "contact@greenearth.example.com",
      fundraiser: {
        purpose: "Saplings, stakes and three months of watering-truck visits for every tree planted this drive.",
        goal: 300000,
        raised: 168000,
        currency: "INR",
        supporters: 96,
      },
    },
    {
      name: "Free Community Health Camp",
      uid: "evt-health-camp-006",
      description: "General checkups, dental screening and vaccinations, run with the local ward health office.",
      host: DEMO_ORGS[2], // coastal_paws_rescue also runs a healthcare-domain clinic in Juhu
      mode: "Offline",
      address: "Juhu Clinic",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      startsIn: 18,
      startHour: 9,
      endsIn: 18,
      endHour: 14,
      isGovernmentSponsored: true,
      about: [
        "Once a quarter we open the Juhu clinic's doors for a full free camp instead of the usual appointment slots, with the K/West ward health office sending two extra doctors and the vaccine cold-chain for the day.",
        "General checkups, basic dental screening and free vaccinations for anyone who turns up — no appointment, no ID required, though bringing any existing prescriptions helps the doctors move faster.",
      ],
      agenda: [
        { time: "9:00 am", title: "Registration opens" },
        { time: "9:30 am", title: "General checkups begin", detail: "Three doctors, two queues." },
        { time: "11:00 am", title: "Dental screening station opens" },
        { time: "1:30 pm", title: "Last entry for the day" },
        { time: "2:00 pm", title: "Camp closes" },
      ],
      bringAlong: ["Any existing prescriptions or medical records", "A form of ID, if you have one — not required"],
      gettingThere: "Same address as our regular clinic, a six-minute walk from Juhu Beach bus stop.",
      languages: ["Marathi", "Hindi", "English"],
      contactEmail: "team@coastalpaws.example.com",
      fundraiser: {
        purpose: "Restocking the vaccine cold-chain and basic dental supplies used on camp days.",
        goal: 150000,
        raised: 62000,
        currency: "INR",
        supporters: 58,
      },
    },
    {
      name: "Founders' Circle Preview Dinner",
      uid: "evt-founders-circle-007",
      description: "A small dinner previewing next year's second elder-care day centre, for our founding supporters.",
      host: DEMO_ORGS[4], // silver_years_collective
      mode: "Offline",
      address: "FC Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      startsIn: 21,
      startHour: 19,
      endsIn: 21,
      endHour: 21,
      inviteOnly: true,
      about: [
        "A small dinner for the people who backed us when we were four students and a WhatsApp group — a first look at the plans for a second elder-care day centre in Kothrud before anything goes public.",
        "Kept deliberately small so it's a conversation, not a presentation: expect the founding team, this year's numbers, and a lot of questions we don't have polished answers to yet.",
      ],
      agenda: [
        { time: "7:00 pm", title: "Welcome and drinks" },
        { time: "7:30 pm", title: "Kothrud centre walkthrough, with Q&A" },
        { time: "8:15 pm", title: "Dinner" },
      ],
      bringAlong: ["Your invite — checked at the door"],
      gettingThere: "FC Road, opposite the Fergusson College main gate; street parking only.",
      languages: ["Marathi", "English"],
      contactEmail: "care@silveryears.example.com",
      fundraiser: {
        purpose: "Fit-out costs for a second day centre in Kothrud — furniture, an accessible bathroom, and the first year's staffing.",
        goal: 2000000,
        raised: 350000,
        currency: "INR",
        supporters: 12,
      },
    },
    {
      name: "Disaster Preparedness Webinar",
      uid: "evt-disaster-prep-008",
      description: "What every household along the Brahmaputur should have ready before the next flood, run with the state disaster management authority.",
      host: DEMO_ORGS[3], // riverside_relief_trust
      mode: "Online",
      platform: "Zoom",
      platformLink: "https://zoom.us/j/demo987654",
      startsIn: 5,
      startHour: 18,
      startMinute: 30,
      endsIn: 5,
      endHour: 19,
      endMinute: 45,
      isGovernmentSponsored: true,
      about: [
        "Run jointly with the Assam State Disaster Management Authority ahead of this year's monsoon — the same flood-preparedness checklist their field teams use, adapted for a household to actually act on.",
        "Aimed at anyone living along the Brahmaputra floodplain, and at volunteers who want to understand what our own rebuild crews are responding to before they sign up for a weekend like the Riverbank Rebuild.",
      ],
      agenda: [
        { time: "6:30 pm", title: "Why last monsoon's warnings arrived too late for some households" },
        { time: "6:50 pm", title: "The five-item household checklist, walked through live" },
        { time: "7:25 pm", title: "Q&A with the state authority's field coordinator" },
      ],
      linkDelivery: "Zoom link and a calendar invite are emailed on registration, and again one hour before the session starts.",
      joinRequirements: "A stable internet connection — the session is not recorded or reposted afterwards.",
      languages: ["Hindi", "English", "Assamese"],
      contactEmail: "office@riversiderelief.example.com",
    },
    {
      name: "River Cleanup & Sapling Walk",
      uid: "evt-river-cleanup-009",
      description: "A morning clearing plastic from the Vrishabhavathi banks, then planting saplings along the cleared stretch.",
      host: DEMO_ORGS[0], // green_earth_ngo
      mode: "Offline",
      address: "Vrishabhavathi River, Kengeri stretch",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      startsIn: 25,
      startHour: 6,
      startMinute: 30,
      endsIn: 25,
      endHour: 9,
      endMinute: 30,
      about: [
        "The Kengeri stretch collects more plastic in a month than our last three cleanups combined — this is a return visit to keep it that way, and to finally get saplings into the ground along the bank we cleared in July.",
        "First ninety minutes are cleanup, the rest is planting. Come for either half or both.",
      ],
      agenda: [
        { time: "6:30 am", title: "Sign in and gear up" },
        { time: "6:45 am", title: "Riverbank cleanup", detail: "Nets, buckets and gloves provided." },
        { time: "8:15 am", title: "Sapling planting along the cleared bank" },
        { time: "9:15 am", title: "Weigh-in and wrap" },
      ],
      bringAlong: ["Closed-toe shoes you don't mind getting muddy", "A water bottle", "Sun protection"],
      gettingThere: "Kengeri Bus Terminal is a ten-minute walk from the site; the riverbank access path is behind the terminal's east exit.",
      languages: ["Kannada", "English"],
      contactEmail: "contact@greenearth.example.com",
    },
    {
      name: "Stray Dog Vaccination Drive",
      uid: "evt-vaccination-drive-010",
      description: "Free anti-rabies vaccination and basic health checks for street dogs across three Juhu-area lanes.",
      host: DEMO_ORGS[2], // coastal_paws_rescue
      mode: "Offline",
      address: "Juhu Clinic (mobile unit departs from here)",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      startsIn: 12,
      startHour: 8,
      endsIn: 12,
      endHour: 12,
      about: [
        "Our mobile unit covers three lanes a rotating weekly schedule doesn't always reach fast enough — this drive is a concentrated push through all three in one morning, vaccinating and health-checking every street dog we can safely handle.",
        "Volunteers pair with a handler; no veterinary experience needed for the handling side, just calm hands and a willingness to walk.",
      ],
      agenda: [
        { time: "8:00 am", title: "Team briefing and route assignment" },
        { time: "8:30 am", title: "Lane 1: vaccination and health checks" },
        { time: "10:00 am", title: "Lane 2 and 3", detail: "Two teams split the remaining lanes." },
        { time: "11:45 am", title: "Count and pack up" },
      ],
      bringAlong: ["Closed-toe shoes", "A water bottle — this is a lot of walking"],
      gettingThere: "Meet at the Juhu Clinic; the mobile unit departs from there at 8:15am sharp.",
      languages: ["English", "Hindi", "Marathi"],
      contactEmail: "team@coastalpaws.example.com",
    },
    {
      name: "Online Grant-Writing Workshop for NGOs",
      uid: "evt-grant-writing-011",
      description: "A hands-on session on writing grant applications that actually get funded, run for small NGOs and student groups.",
      host: DEMO_ORGS[1], // shiksha_seva
      mode: "Online",
      platform: "Google Meet",
      platformLink: "https://meet.google.com/demo-grant-writing",
      startsIn: 6,
      startHour: 17,
      endsIn: 6,
      endHour: 18,
      about: [
        "We've written and lost a lot of grant applications before learning what actually works — this session walks through a real successful application line by line, and the three mistakes we see most often in the ones that don't land.",
        "Built for small NGOs and student groups without a dedicated fundraising person, not for large organizations with grant-writing staff already.",
      ],
      agenda: [
        { time: "5:00 pm", title: "Anatomy of a successful application" },
        { time: "5:25 pm", title: "The three mistakes that sink most applications" },
        { time: "5:45 pm", title: "Open Q&A with your own draft, if you have one" },
      ],
      linkDelivery: "Google Meet link emailed on registration, and again the morning of the session.",
      joinRequirements: "A Google account to join the Meet call; bring a draft application if you have one to workshop live.",
      languages: ["Hindi", "English"],
      contactEmail: "hello@shikshaseva.example.com",
    },
    {
      name: "Youth Career Mentorship Meetup",
      uid: "evt-career-mentorship-012",
      description: "One-on-one mentorship matching for grade 10-12 students exploring careers, with volunteer professionals from a dozen fields.",
      host: DEMO_ORGS[1], // shiksha_seva
      mode: "Offline",
      address: "Community Hall, Sector 12",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      startsIn: 30,
      startHour: 11,
      endsIn: 30,
      endHour: 14,
      about: [
        "Most of our students have never had a real conversation with someone working in a field they're curious about. This meetup pairs each student with two volunteer professionals for a twenty-minute conversation, rotating through the afternoon.",
        "A dozen fields represented this round — medicine, law, design, engineering, the armed forces and more — and every student leaves with at least one mentor's contact for follow-up questions.",
      ],
      agenda: [
        { time: "11:00 am", title: "Students arrive, pick their top three fields" },
        { time: "11:30 am", title: "Round 1 conversations", detail: "Twenty minutes per pairing." },
        { time: "12:15 pm", title: "Round 2 conversations" },
        { time: "1:15 pm", title: "Group Q&A with all mentors on stage" },
      ],
      bringAlong: ["A notebook", "Questions written down in advance — the twenty minutes go fast"],
      gettingThere: "The Community Hall sits directly behind the Sector 12 metro exit, gate 2.",
      languages: ["Hindi", "English"],
      minimumAge: 14,
      contactEmail: "hello@shikshaseva.example.com",
    },
    {
      name: "Flood Relief Supply Packing",
      uid: "evt-supply-packing-013",
      description: "Packing emergency kits — dry rations, water purification tablets, a tarp — ahead of this year's monsoon peak.",
      host: DEMO_ORGS[3], // riverside_relief_trust
      mode: "Offline",
      address: "Fancy Bazaar",
      city: "Guwahati",
      state: "Assam",
      country: "India",
      startsIn: 9,
      startHour: 9,
      endsIn: 9,
      endHour: 13,
      about: [
        "Every kit packed today is one that reaches a family within hours of a flood warning instead of days — we pre-pack ahead of the monsoon peak precisely so the response doesn't start from zero when the water actually rises.",
        "Assembly-line packing: dry rations, water purification tablets, a tarp and a first-aid kit per bag, five hundred bags this session.",
      ],
      agenda: [
        { time: "9:00 am", title: "Briefing and station assignment" },
        { time: "9:30 am", title: "Packing", detail: "Five stations, rotating every hour so nobody's back gives out." },
        { time: "12:30 pm", title: "Count, seal and load onto the storage truck" },
      ],
      bringAlong: ["Comfortable clothes — this is standing, repetitive work", "A water bottle"],
      gettingThere: "Fancy Bazaar is a five-minute auto ride from Guwahati railway station.",
      languages: ["Assamese", "Hindi", "English"],
      contactEmail: "office@riversiderelief.example.com",
    },
    {
      name: "Elder Companionship Walk",
      uid: "evt-companionship-walk-014",
      description: "A weekly morning walk and conversation with residents of a Pune elder-care home who have no family visiting them.",
      host: DEMO_ORGS[4], // silver_years_collective
      mode: "Offline",
      address: "FC Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      startsIn: 16,
      startHour: 7,
      endsIn: 16,
      endHour: 8,
      endMinute: 30,
      about: [
        "A short, slow walk around the block with residents who have nobody else visiting this week — some weeks it's three people, some weeks it's twelve. Either way, it's the same hour of company, unhurried.",
        "No experience needed. You'll be paired with a resident by our on-site coordinator, who knows who's had a hard week and who'd rather just sit and talk instead of walking.",
      ],
      agenda: [
        { time: "7:00 am", title: "Arrive, meet your pairing" },
        { time: "7:15 am", title: "Walk or sit and talk, resident's choice" },
        { time: "8:15 am", title: "Tea together before everyone heads off" },
      ],
      bringAlong: ["Comfortable walking shoes", "Patience — some conversations move slowly, and that's the point"],
      gettingThere: "FC Road, opposite the Fergusson College main gate.",
      languages: ["Marathi", "English"],
      contactEmail: "care@silveryears.example.com",
    },
    {
      name: "Winter Blanket Distribution",
      uid: "evt-blanket-distribution-015",
      description: "Distributing 800 blankets and hot tea along the Fancy Bazaar and Pan Bazaar pavements before the cold snap.",
      host: DEMO_ORGS[3], // riverside_relief_trust
      mode: "Offline",
      address: "Fancy Bazaar",
      city: "Guwahati",
      state: "Assam",
      country: "India",
      startsIn: -20, // a second past event, for variety in the profile/directory's Past tab
      startHour: 19,
      endsIn: -20,
      endHour: 22,
      about: [
        "Guwahati's winter nights get colder than the daytime weather ever suggests, and the people sleeping rough along Fancy Bazaar and Pan Bazaar feel it first. Eight hundred blankets, handed out lane by lane, with hot tea alongside.",
        "This is a walking round, not a fixed stall — teams of three or four cover a lane each, checking in on anyone they've met on previous rounds.",
      ],
      agenda: [
        { time: "7:00 pm", title: "Load the van and split into teams" },
        { time: "7:30 pm", title: "Lane rounds", detail: "Fancy Bazaar first, then Pan Bazaar." },
        { time: "9:30 pm", title: "Tea break and regroup" },
        { time: "10:00 pm", title: "Final round and pack up" },
      ],
      bringAlong: ["Warm layers of your own", "A torch/flashlight"],
      gettingThere: "Meet at the trust's Fancy Bazaar office; the van departs from there at 6:45pm.",
      languages: ["Assamese", "Hindi", "English"],
      contactEmail: "office@riversiderelief.example.com",
    },
  ];

  for (const event of demoEvents) {
    await Event.findOneAndUpdate(
      { uid: event.uid },
      {
        name: event.name,
        uid: event.uid,
        description: event.description,
        hostUsername: event.host.handle,
        hostName: event.host.name,
        organizerHandle: event.host.handle,
        coverImage: coverUrl(`${event.uid}-cover`),
        mode: event.mode,
        address: event.address,
        city: event.city,
        state: event.state,
        country: event.country,
        platform: event.platform,
        platformLink: event.platformLink,
        startTime: atHour(event.startsIn, event.startHour, event.startMinute),
        endTime: atHour(event.endsIn, event.endHour, event.endMinute),
        startDate: atHour(event.startsIn, event.startHour, event.startMinute),
        endDate: atHour(event.endsIn, event.endHour, event.endMinute),
        isGovernmentSponsored: event.isGovernmentSponsored ?? false,
        inviteOnly: event.inviteOnly ?? false,
        about: event.about,
        agenda: event.agenda,
        bringAlong: event.bringAlong,
        gettingThere: event.gettingThere,
        linkDelivery: event.linkDelivery,
        joinRequirements: event.joinRequirements,
        languages: event.languages,
        minimumAge: event.minimumAge,
        contactEmail: event.contactEmail,
        fundraiser: event.fundraiser,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Upserted ${demoEvents.length} events`);

  // --- Products ---
  const products = [
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
  ];

  for (const product of products) {
    await Product.findOneAndUpdate({ productSlug: product.productSlug }, product, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  console.log(`Upserted ${products.length} products`);

  // --- Reports ---
  const reports = [
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
  ];

  for (const report of reports) {
    await ReportProblem.findOneAndUpdate({ email: report.email }, report, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  console.log(`Upserted ${reports.length} reports`);

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
