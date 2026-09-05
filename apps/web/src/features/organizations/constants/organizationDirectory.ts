import { UserType } from "@/types/user";
import aarogyaVolunteersCover from "@assets/pictures/organizations/aarogya-volunteers.jpg";
import casaAbiertaCover from "@assets/pictures/organizations/casa-abierta.jpg";
import clearwellFoundationCover from "@assets/pictures/organizations/clearwell-foundation.jpg";
import greenCorridorCollectiveCover from "@assets/pictures/organizations/green-corridor-collective.jpg";
import himalLightCollectiveCover from "@assets/pictures/organizations/himal-light-collective.jpg";
import mercyPawsLagosCover from "@assets/pictures/organizations/mercy-paws-lagos.jpg";
import northStarShelterCover from "@assets/pictures/organizations/north-star-shelter.jpg";
import pawsitivePuneCover from "@assets/pictures/organizations/pawsitive-pune.jpg";
import sandhyaElderCareCover from "@assets/pictures/organizations/sandhya-elder-care.jpg";
import sunriseYouthClubCover from "@assets/pictures/organizations/sunrise-youth-club.jpg";
import tanakaSkillsLabCover from "@assets/pictures/organizations/tanaka-skills-lab.jpg";
import ubuntuLearningTrustCover from "@assets/pictures/organizations/ubuntu-learning-trust.jpg";
import type {
  Cause,
  DirectoryOrganization,
  OrganizationAccent,
} from "../types";

/**
 * Sample content for the organizations directory and the public
 * organization profile it links to.
 *
 * **None of this is fetched.** There is no live "list organizations"
 * response wired into the app yet — `services/Organizations.ts`'s
 * `getOrganizations()` exists and is still never called (see
 * `docs/specs/organizations.md`). This file replaces the twenty identical
 * `"God Father Org"` objects that used to live inline in
 * `Organizations.tsx`: the grid's job is to show a visitor what a directory
 * of real causes feels like, and twenty copies of one record actively
 * argued the opposite.
 *
 * The record shape is deliberately the shape a real organization record
 * would have, so wiring this up later is a `useSWR` swap plus a mapping
 * function — not a rewrite of the two components that read it. Keep new
 * entries varied: different causes, different countries, different sizes,
 * a mix of verified and not. A directory where every row looks alike is
 * the bug this file was written to fix.
 */

/**
 * Decorative gradients for the card cover band and the monogram, indexed by
 * each organization's `accent`.
 *
 * These are *not* palette tokens and must not become any: they exist only
 * to make twelve cards on one screen distinguishable at a glance, the way a
 * photo would if the app had twelve photos. Every one is a warm hue that
 * sits on the cream page next to `--color-brand` without arguing with it —
 * a cool blue or a saturated green here would read as a different site.
 */
export const ORGANIZATION_ACCENTS: OrganizationAccent[] = [
  { from: "#a8623e", to: "#d8a17c", ink: "#7d4527" },
  { from: "#8a6b3d", to: "#d9c08a", ink: "#6a5029" },
  { from: "#7d5a4f", to: "#c9a596", ink: "#5e4038" },
  { from: "#96603f", to: "#e0b48e", ink: "#70452b" },
  { from: "#6f6a45", to: "#c2bd8f", ink: "#535030" },
  { from: "#9c5450", to: "#dda49c", ink: "#763a37" },
];

/** Filter chips, in the order they render. "All" is prepended in the page. */
export const CAUSES: Cause[] = [
  "Relief",
  "Education",
  "Healthcare",
  "Environment",
  "Animal welfare",
  "Livelihood",
  "Water & sanitation",
  "Elder care",
];

export const organizationDirectory: DirectoryOrganization[] = [
  {
    _id: "org-sunrise-youth-club",
    userType: UserType.Organization,
    userName: "sunriseyouthclub",
    name: "Sunrise Youth Club",
    email: "hello@sunriseyouth.org",
    tagLine: "Winter relief and night kitchens across east Kolkata",
    description:
      "A neighbourhood club that has run blanket and hot-meal drives along the Sealdah corridor every winter since 2016.",
    cause: "Relief",
    city: "Kolkata",
    founded: 2016,
    verified: true,
    followers: 12400,
    drives: 38,
    volunteers: 210,
    accent: 0,
    cover: sunriseYouthClubCover,
    coverAlt: "A volunteer plating food in a community kitchen",
    focusAreas: ["Winter relief", "Night kitchens", "Disaster response"],
    about: [
      "Sunrise Youth Club started as eleven people with a borrowed van and a list of names. Ten winters later it runs the largest volunteer-led night kitchen in east Kolkata, serving the stretch between Sealdah and Beleghata where the city's shelters run out of beds first.",
      "Everything the club does is decided at a monthly open meeting that anyone in the neighbourhood can walk into. Drives are costed publicly before they launch, and every drive closes with a photo set and a receipt trail posted here.",
    ],
    stats: [
      { label: "Raised to date", value: "₹41.6L" },
      { label: "Drives completed", value: "38" },
      { label: "Meals served", value: "126k" },
      { label: "Active volunteers", value: "210" },
    ],
    activeDrives: [
      {
        id: "winter-blankets",
        title: "Winter blankets & hot meals",
        summary:
          "200 blankets and two weeks of evening meals for families sleeping rough along the Sealdah corridor.",
        raised: "₹3,42,000",
        goal: "₹5,00,000",
        percent: 68,
        supporters: 214,
        daysLeft: 9,
      },
      {
        id: "school-kits",
        title: "Monsoon school kits",
        summary:
          "Waterproof bags, notebooks and a pair of shoes each for 180 children in the Beleghata canal-side settlements.",
        raised: "₹88,000",
        goal: "₹2,20,000",
        percent: 40,
        supporters: 73,
        daysLeft: 26,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2024",
        title: "Second kitchen opened",
        body: "A permanent night kitchen at Beleghata, cooking 400 meals a night through the cold months.",
      },
      {
        id: "m2",
        year: "2022",
        title: "Cyclone Sitrang response",
        body: "Nine days of relief for 1,200 displaced families, coordinated with four neighbouring clubs.",
      },
      {
        id: "m3",
        year: "2016",
        title: "First winter drive",
        body: "Eleven volunteers, one van, 60 blankets — the drive the club is still named after.",
      },
    ],
    website: "sunriseyouth.org",
    contactEmail: "hello@sunriseyouth.org",
    address: "14/2 Beleghata Main Road, Kolkata 700010, West Bengal",
  },
  {
    _id: "org-ubuntu-learning-trust",
    userType: UserType.Organization,
    userName: "ubuntulearning",
    name: "Ubuntu Learning Trust",
    email: "team@ubuntulearning.org",
    tagLine: "Rebuilding rural school libraries in Kajiado county",
    description:
      "Shelving, books and solar reading lamps for primary schools where the nearest library is a day's travel away.",
    cause: "Education",
    city: "Kajiado",
    founded: 2019,
    verified: true,
    followers: 6800,
    drives: 21,
    volunteers: 84,
    accent: 1,
    cover: ubuntuLearningTrustCover,
    coverAlt: "Shelves of colour-coded books in a school library",
    focusAreas: ["School libraries", "Teacher stipends", "Solar reading lamps"],
    about: [
      "Ubuntu Learning Trust works with fourteen primary schools across Kajiado county, most of them an hour or more from the nearest bookshop. The trust does one thing well: it puts a working library inside a school and keeps it stocked.",
      "Every library is handed over to a school committee with a three-year restocking budget attached, so the shelves don't go empty the moment the ribbon is cut.",
    ],
    stats: [
      { label: "Raised to date", value: "$96,400" },
      { label: "Libraries built", value: "14" },
      { label: "Books placed", value: "31k" },
      { label: "Active volunteers", value: "84" },
    ],
    activeDrives: [
      {
        id: "village-library",
        title: "Rebuild the village library",
        summary:
          "Shelving, 1,200 books and a solar reading lamp for a primary school that lost its roof in the March storms.",
        raised: "$4,180",
        goal: "$10,000",
        percent: 41,
        supporters: 96,
        daysLeft: 23,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2025",
        title: "Fourteenth library handed over",
        body: "Olkiramatian Primary, with a three-year restocking budget attached.",
      },
      {
        id: "m2",
        year: "2021",
        title: "Solar lamp programme",
        body: "Reading lamps for 600 households so homework survives sundown.",
      },
    ],
    website: "ubuntulearning.org",
    contactEmail: "team@ubuntulearning.org",
    address: "Namanga Road, Kajiado Town, Kajiado County",
  },
  {
    _id: "org-aarogya-volunteers",
    userType: UserType.Organization,
    userName: "aarogyavolunteers",
    name: "Aarogya Volunteers",
    email: "camps@aarogya.org",
    tagLine: "Free monsoon health camps across flood-hit wards",
    description:
      "A doctors-and-students collective running check-up camps, rehydration kits and mosquito nets where the water sits longest.",
    cause: "Healthcare",
    city: "Dhaka",
    founded: 2018,
    verified: true,
    followers: 9200,
    drives: 47,
    volunteers: 320,
    accent: 2,
    cover: aarogyaVolunteersCover,
    coverAlt: "A clinician examining a patient's ear at a health camp",
    focusAreas: ["Mobile camps", "Maternal health", "Flood response"],
    about: [
      "Aarogya Volunteers is 40 practising doctors and about 280 medical students who give one weekend a month to wards that lose their clinics to standing water every monsoon.",
      "Camps are announced two weeks ahead so nobody travels for a queue that closed at noon, and every camp publishes the count of people seen and what they were treated for.",
    ],
    stats: [
      { label: "Raised to date", value: "৳1.4Cr" },
      { label: "Camps run", value: "47" },
      { label: "People seen", value: "58k" },
      { label: "Active volunteers", value: "320" },
    ],
    activeDrives: [
      {
        id: "monsoon-health-camp",
        title: "Monsoon health camp",
        summary:
          "Three days of free check-ups, oral rehydration kits and mosquito nets across four flood-hit wards.",
        raised: "৳7,60,000",
        goal: "৳8,75,000",
        percent: 87,
        supporters: 431,
        daysLeft: 4,
      },
      {
        id: "maternal-kits",
        title: "Safe delivery kits",
        summary:
          "500 sterile delivery kits for midwives working in wards where the nearest hospital is two hours by boat.",
        raised: "৳1,10,000",
        goal: "৳4,00,000",
        percent: 28,
        supporters: 88,
        daysLeft: 34,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2024",
        title: "50,000th patient seen",
        body: "Six years after the first camp in a borrowed school hall.",
      },
      {
        id: "m2",
        year: "2020",
        title: "Pandemic oxygen line",
        body: "A 24-hour cylinder-matching desk that ran for eleven months.",
      },
    ],
    website: "aarogya.org",
    contactEmail: "camps@aarogya.org",
    address: "House 42, Road 7, Dhanmondi, Dhaka 1205",
  },
  {
    _id: "org-pawsitive-pune",
    userType: UserType.Organization,
    userName: "pawsitivepune",
    name: "Pawsitive Pune",
    email: "rescue@pawsitivepune.in",
    tagLine: "Emergency pickup and care for injured street animals",
    description:
      "A rescue line, a sterilisation programme and a shelter that has never turned away an emergency call.",
    cause: "Animal welfare",
    city: "Pune",
    founded: 2020,
    verified: false,
    followers: 15600,
    drives: 19,
    volunteers: 96,
    accent: 3,
    cover: pawsitivePuneCover,
    coverAlt: "A street dog standing on a pavement between parked cars",
    focusAreas: ["Emergency rescue", "Sterilisation", "Adoption"],
    about: [
      "Pawsitive Pune runs a rescue line that answers at three in the morning. Most calls are hit-and-runs on the Nagar Road stretch, and most of them currently wait on a borrowed rickshaw.",
      "Alongside rescue, the group runs a rolling sterilisation programme in Kharadi and Wagholi and rehomes about 30 animals a month.",
    ],
    stats: [
      { label: "Raised to date", value: "₹18.9L" },
      { label: "Rescues logged", value: "4,120" },
      { label: "Animals rehomed", value: "980" },
      { label: "Active volunteers", value: "96" },
    ],
    activeDrives: [
      {
        id: "street-dog-van",
        title: "A rescue van that actually starts",
        summary:
          "One second-hand van, kitted out for emergency pickups, so injured strays stop waiting on a borrowed rickshaw.",
        raised: "₹2,10,000",
        goal: "₹6,40,000",
        percent: 33,
        supporters: 128,
        daysLeft: 31,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2023",
        title: "Shelter licence granted",
        body: "A permanent 40-animal facility replacing three volunteers' terraces.",
      },
      {
        id: "m2",
        year: "2020",
        title: "The rescue line opened",
        body: "One phone, four volunteers, answering around the clock.",
      },
    ],
    website: "pawsitivepune.in",
    contactEmail: "rescue@pawsitivepune.in",
    address: "Survey 22, Kharadi Bypass, Pune 411014, Maharashtra",
  },
  {
    _id: "org-himal-light-collective",
    userType: UserType.Organization,
    userName: "himallight",
    name: "Himal Light Collective",
    email: "info@himallight.np",
    tagLine: "Solar light for hill villages that go dark at six",
    description:
      "Swapping kerosene for rechargeable solar lamps and micro-grids across three districts of the Nepali midhills.",
    cause: "Environment",
    city: "Sindhupalchok",
    founded: 2017,
    verified: true,
    followers: 5100,
    drives: 26,
    volunteers: 62,
    accent: 4,
    cover: himalLightCollectiveCover,
    coverAlt: "A row of solar panels on a hillside",
    focusAreas: ["Solar lamps", "Micro-grids", "Kerosene buyback"],
    about: [
      "Himal Light Collective installs and maintains small solar systems in villages the national grid has no plan to reach this decade. A lamp is cheaper than kerosene inside eight months, and it doesn't fill a one-room house with smoke.",
      "The collective trains two local technicians per village before it leaves, because a solar programme with no one to fix it is a two-year programme.",
    ],
    stats: [
      { label: "Raised to date", value: "रु 62L" },
      { label: "Villages lit", value: "22" },
      { label: "Lamps installed", value: "4,300" },
      { label: "Technicians trained", value: "44" },
    ],
    activeDrives: [
      {
        id: "solar-lamps",
        title: "Solar lamps for 300 homes",
        summary:
          "Replacing kerosene with rechargeable solar lamps in three hill villages that go dark at 6pm.",
        raised: "रु 9,40,000",
        goal: "रु 21,00,000",
        percent: 45,
        supporters: 156,
        daysLeft: 18,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2023",
        title: "First village micro-grid",
        body: "A shared 6kW array powering a school, a health post and 40 homes.",
      },
      {
        id: "m2",
        year: "2017",
        title: "Founded after the rebuild",
        body: "Started by four engineers who stayed on after post-earthquake reconstruction work.",
      },
    ],
    website: "himallight.np",
    contactEmail: "info@himallight.np",
    address: "Ward 4, Chautara, Sindhupalchok District, Bagmati",
  },
  {
    _id: "org-tanaka-skills-lab",
    userType: UserType.Organization,
    userName: "tanakaskillslab",
    name: "Tanaka Skills Lab",
    email: "apply@tanakaskills.co.zw",
    tagLine: "Six-month trades training with a job at the end",
    description:
      "Welding, electrical and tailoring cohorts for young people in Mbare, run with the employers who hire them.",
    cause: "Livelihood",
    city: "Harare",
    founded: 2021,
    verified: false,
    followers: 3400,
    drives: 12,
    volunteers: 38,
    accent: 5,
    cover: tanakaSkillsLabCover,
    coverAlt: "A lamp-lit workshop bench with woodworking tools",
    focusAreas: ["Trades training", "Tool grants", "Employer placement"],
    about: [
      "Tanaka Skills Lab runs three trade cohorts a year, each one designed with the workshops that will do the hiring. Graduates leave with a certificate, a starter toolkit and an interview already booked.",
      "The lab publishes its placement rate every cohort, including the cohorts that went badly. Seventy-one percent of the 2025 intake was in paid work within three months.",
    ],
    stats: [
      { label: "Raised to date", value: "$74,200" },
      { label: "Cohorts run", value: "12" },
      { label: "Graduates placed", value: "418" },
      { label: "Partner workshops", value: "27" },
    ],
    activeDrives: [
      {
        id: "toolkits",
        title: "Starter toolkits for 60 graduates",
        summary:
          "A welding mask, hand tools and a first month of consumables — the gap between a certificate and a wage.",
        raised: "$6,900",
        goal: "$15,000",
        percent: 46,
        supporters: 141,
        daysLeft: 12,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2025",
        title: "71% placement rate",
        body: "The best cohort yet, published alongside the two that underperformed.",
      },
      {
        id: "m2",
        year: "2021",
        title: "First welding cohort",
        body: "Fourteen students in a converted container in Mbare.",
      },
    ],
    website: "tanakaskills.co.zw",
    contactEmail: "apply@tanakaskills.co.zw",
    address: "Stand 118, Mbare Industrial Site, Harare",
  },
  {
    _id: "org-clearwell-foundation",
    userType: UserType.Organization,
    userName: "clearwell",
    name: "Clearwell Foundation",
    email: "hello@clearwell.org",
    tagLine: "Borewells, filters and the maintenance nobody funds",
    description:
      "Clean water for villages in the Sahel — and a repair fund so the pumps are still running in year five.",
    cause: "Water & sanitation",
    city: "Tamale",
    founded: 2015,
    verified: true,
    followers: 7900,
    drives: 33,
    volunteers: 71,
    accent: 1,
    cover: clearwellFoundationCover,
    coverAlt: "Cupped hands with clean water running through them",
    focusAreas: ["Borewells", "Filtration", "Pump maintenance"],
    about: [
      "Clearwell has drilled 88 borewells across the Northern Region. It is better known, locally, for the thing that isn't glamorous: a maintenance fund that keeps sending a mechanic long after the ribbon-cutting photos have stopped.",
      "Roughly a third of every drive's budget is ring-fenced for five years of repairs, which is why 84 of those 88 wells were still working at the last audit.",
    ],
    stats: [
      { label: "Raised to date", value: "$412,000" },
      { label: "Wells drilled", value: "88" },
      { label: "Still working", value: "84" },
      { label: "People served", value: "61k" },
    ],
    activeDrives: [
      {
        id: "borewell-kumbungu",
        title: "Two borewells for Kumbungu",
        summary:
          "Two wells and five years of ring-fenced maintenance for a district walking 4km each way for water.",
        raised: "$11,300",
        goal: "$26,000",
        percent: 43,
        supporters: 189,
        daysLeft: 21,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2024",
        title: "Independent audit published",
        body: "84 of 88 wells confirmed working — the full report is public.",
      },
      {
        id: "m2",
        year: "2015",
        title: "First well at Savelugu",
        body: "Funded by 62 people, most of whom had never met the village.",
      },
    ],
    website: "clearwell.org",
    contactEmail: "hello@clearwell.org",
    address: "Plot 6, Kalpohin Estate, Tamale, Northern Region",
  },
  {
    _id: "org-sandhya-elder-care",
    userType: UserType.Organization,
    userName: "sandhyacare",
    name: "Sandhya Elder Care",
    email: "care@sandhya.org.in",
    tagLine: "Day centres and home visits for elders living alone",
    description:
      "Meals, medicines and a weekly visit for 600 elders in Bengaluru whose families live in another city.",
    cause: "Elder care",
    city: "Bengaluru",
    founded: 2014,
    verified: true,
    followers: 4600,
    drives: 29,
    volunteers: 143,
    accent: 2,
    cover: sandhyaElderCareCover,
    coverAlt: "A carer's hand steadying an elderly person's walking stick",
    focusAreas: ["Home visits", "Day centres", "Medicine subsidy"],
    about: [
      "Sandhya runs four day centres and a home-visit roster covering 600 elders across Bengaluru, most of them living alone with their families several states away.",
      "The visits matter as much as the medicines. Every volunteer is matched to the same handful of people for at least a year, because a stranger every fortnight is a service, not company.",
    ],
    stats: [
      { label: "Raised to date", value: "₹2.1Cr" },
      { label: "Elders supported", value: "600" },
      { label: "Visits a month", value: "2,400" },
      { label: "Active volunteers", value: "143" },
    ],
    activeDrives: [
      {
        id: "medicine-fund",
        title: "A year of medicines for 120 elders",
        summary:
          "Blood pressure, diabetes and cardiac prescriptions for elders choosing between medicine and rent.",
        raised: "₹6,80,000",
        goal: "₹9,00,000",
        percent: 76,
        supporters: 302,
        daysLeft: 15,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2023",
        title: "Fourth day centre opened",
        body: "In Kengeri, after two years on a waiting list of 90 people.",
      },
      {
        id: "m2",
        year: "2014",
        title: "Started as a phone tree",
        body: "Nine neighbours checking on eleven elders every Sunday.",
      },
    ],
    website: "sandhya.org.in",
    contactEmail: "care@sandhya.org.in",
    address: "3rd Cross, Jayanagar 4th Block, Bengaluru 560011, Karnataka",
  },
  {
    _id: "org-green-corridor-collective",
    userType: UserType.Organization,
    userName: "greencorridor",
    name: "Green Corridor Collective",
    email: "plant@greencorridor.ph",
    tagLine: "Mangrove replanting along typhoon-exposed coast",
    description:
      "Community nurseries and replanting on the Leyte coastline, with survival rates published every quarter.",
    cause: "Environment",
    city: "Tacloban",
    founded: 2019,
    verified: false,
    followers: 2800,
    drives: 17,
    volunteers: 205,
    accent: 4,
    cover: greenCorridorCollectiveCover,
    coverAlt: "Seedlings breaking through dark soil",
    focusAreas: ["Mangrove nurseries", "Coastal defence", "Fisher training"],
    about: [
      "Green Corridor plants mangroves where a storm surge does the most damage, working with fishing barangays who maintain the nurseries and get paid to do it.",
      "The collective reports survival rates, not planting counts — a number that is far less flattering and far more useful. The current three-year survival rate is 61%.",
    ],
    stats: [
      { label: "Raised to date", value: "₱6.4M" },
      { label: "Hectares replanted", value: "112" },
      { label: "3-year survival", value: "61%" },
      { label: "Barangays involved", value: "18" },
    ],
    activeDrives: [
      {
        id: "nursery-expansion",
        title: "Two new community nurseries",
        summary:
          "Seedbeds, shade netting and a year of caretaker stipends for two coastal barangays.",
        raised: "₱310,000",
        goal: "₱900,000",
        percent: 34,
        supporters: 64,
        daysLeft: 40,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2024",
        title: "100 hectares passed",
        body: "Nine years ahead of the provincial coastal defence target.",
      },
      {
        id: "m2",
        year: "2019",
        title: "First nursery at Basey",
        body: "Built by 30 fishers on land the barangay donated.",
      },
    ],
    website: "greencorridor.ph",
    contactEmail: "plant@greencorridor.ph",
    address: "Barangay 88, San Jose, Tacloban City, Leyte",
  },
  {
    _id: "org-north-star-shelter",
    userType: UserType.Organization,
    userName: "northstarshelter",
    name: "North Star Shelter",
    email: "intake@northstarshelter.org",
    tagLine: "Emergency beds and casework, no questions at the door",
    description:
      "A 60-bed shelter and a caseworker team helping people out of homelessness and into a tenancy.",
    cause: "Relief",
    city: "Manchester",
    founded: 2012,
    verified: true,
    followers: 8300,
    drives: 41,
    volunteers: 118,
    accent: 3,
    cover: northStarShelterCover,
    coverAlt: "Two made-up beds in a plain shelter room",
    focusAreas: ["Emergency beds", "Tenancy casework", "Winter night shelter"],
    about: [
      "North Star runs 60 emergency beds year-round and another 40 through the winter night-shelter months. Nobody is asked for a referral at the door.",
      "The shelter's real work is the caseworker team: 214 people moved into a sustained tenancy last year, and the shelter tracks how many were still housed twelve months later.",
    ],
    stats: [
      { label: "Raised to date", value: "£1.28M" },
      { label: "Beds a night", value: "60" },
      { label: "Housed last year", value: "214" },
      { label: "Still housed at 12mo", value: "78%" },
    ],
    activeDrives: [
      {
        id: "winter-night-shelter",
        title: "Winter night shelter, 40 extra beds",
        summary:
          "Staffing, bedding and hot food for the four coldest months, when the referral list doubles.",
        raised: "£38,400",
        goal: "£65,000",
        percent: 59,
        supporters: 512,
        daysLeft: 27,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2025",
        title: "78% sustained tenancies",
        body: "Measured at twelve months, independently verified.",
      },
      {
        id: "m2",
        year: "2012",
        title: "Opened with 12 beds",
        body: "In a church hall on Oldham Road, staffed entirely by volunteers.",
      },
    ],
    website: "northstarshelter.org",
    contactEmail: "intake@northstarshelter.org",
    address: "118 Oldham Road, Manchester M4 6AY",
  },
  {
    _id: "org-casa-abierta",
    userType: UserType.Organization,
    userName: "casaabierta",
    name: "Casa Abierta",
    email: "hola@casaabierta.mx",
    tagLine: "After-school study halls in Iztapalapa",
    description:
      "Four study halls with tutors, wifi and a hot meal, open every weekday afternoon to any child who walks in.",
    cause: "Education",
    city: "Mexico City",
    founded: 2018,
    verified: false,
    followers: 3900,
    drives: 15,
    volunteers: 67,
    accent: 5,
    cover: casaAbiertaCover,
    coverAlt: "A child writing in a notebook at a study table",
    focusAreas: ["Study halls", "Tutoring", "School meals"],
    about: [
      "Casa Abierta keeps four rooms open every weekday between three and eight: desks, wifi, a tutor on shift and a hot meal at five. About 340 children use them in a normal week.",
      "There is no enrolment and no attendance requirement. The only rule is that the rooms stay open, which turns out to be the expensive part.",
    ],
    stats: [
      { label: "Raised to date", value: "$1.9M MXN" },
      { label: "Study halls", value: "4" },
      { label: "Children a week", value: "340" },
      { label: "Tutors on roster", value: "67" },
    ],
    activeDrives: [
      {
        id: "keep-rooms-open",
        title: "Keep the rooms open for a year",
        summary:
          "Rent, wifi, and tutor stipends for four study halls — the unglamorous cost nobody wants to fund.",
        raised: "$420,000 MXN",
        goal: "$1,100,000 MXN",
        percent: 38,
        supporters: 210,
        daysLeft: 45,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2024",
        title: "Fourth hall opened",
        body: "In Santa Martha, in a room the neighbourhood association lends rent-free.",
      },
      {
        id: "m2",
        year: "2018",
        title: "One room, six children",
        body: "A tutor's own living room, three afternoons a week.",
      },
    ],
    website: "casaabierta.mx",
    contactEmail: "hola@casaabierta.mx",
    address: "Calle Sur 20 #148, Iztapalapa, 09800 Ciudad de México",
  },
  {
    _id: "org-mercy-paws-lagos",
    userType: UserType.Organization,
    userName: "mercypawslagos",
    name: "Mercy Paws Lagos",
    email: "contact@mercypaws.ng",
    tagLine: "Free veterinary clinics for working animals",
    description:
      "Mobile clinics treating cart horses, donkeys and street dogs across Lagos and Ogun state.",
    cause: "Animal welfare",
    city: "Lagos",
    founded: 2022,
    verified: false,
    followers: 2100,
    drives: 9,
    volunteers: 41,
    accent: 0,
    cover: mercyPawsLagosCover,
    coverAlt: "A puppy being held during a check-up",
    focusAreas: ["Mobile clinics", "Working animals", "Owner training"],
    about: [
      "Mercy Paws runs a mobile clinic two weekends a month, treating the animals that families depend on for a living — cart horses, draught donkeys, and the dogs that guard market stalls.",
      "Treatment is free and comes with a short handling session for the owner, because most of what the clinic treats is preventable and comes back within the year otherwise.",
    ],
    stats: [
      { label: "Raised to date", value: "₦34M" },
      { label: "Clinic days", value: "62" },
      { label: "Animals treated", value: "5,800" },
      { label: "Owners trained", value: "1,240" },
    ],
    activeDrives: [
      {
        id: "clinic-van",
        title: "Kit out the second clinic van",
        summary:
          "A surgical table, a cold chain for vaccines and three months of drugs for a second mobile unit.",
        raised: "₦4,200,000",
        goal: "₦12,000,000",
        percent: 35,
        supporters: 77,
        daysLeft: 33,
      },
    ],
    milestones: [
      {
        id: "m1",
        year: "2025",
        title: "5,000th animal treated",
        body: "Three years after the first clinic day in Mushin market.",
      },
      {
        id: "m2",
        year: "2022",
        title: "First mobile clinic",
        body: "Two vets, one hired van, 38 animals in a single Saturday.",
      },
    ],
    website: "mercypaws.ng",
    contactEmail: "contact@mercypaws.ng",
    address: "12 Bode Thomas Street, Surulere, Lagos",
  },
];

/** Lookup used by the public profile page's `:userName` route param. */
export const findOrganization = (
  userName?: string,
): DirectoryOrganization | undefined =>
  organizationDirectory.find((org) => org.userName === userName);

/**
 * Compact display form for the raw follower/volunteer counts ("12.4k").
 * `Intl.NumberFormat`'s own `notation: "compact"` rather than a hand-rolled
 * divide-and-round, so it stays correct past a million and localises.
 */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
