import {
  FiCamera,
  FiCode,
  FiCompass,
  FiHeart,
  FiPenTool,
  FiStar,
} from "react-icons/fi";
import type { ContributeWay, DriveStep, SampleDrive } from "../types";

/**
 * Static content for the three marketing sections between the hero and the
 * footer. Kept out of the components for the same reason `footerLinksConfig`
 * is kept out of `Footer.tsx`: the copy is the thing most likely to be
 * edited, and it shouldn't require reading JSX to find it.
 *
 * None of this is fetched. See each section's component for what would have
 * to exist on the API side to make it real.
 */

export const drivePlaybook: DriveStep[] = [
  {
    id: "post",
    label: "01",
    icon: FiPenTool,
    title: "A club posts a drive",
    body: "Winter is closing in and your club wants 200 blankets and hot meals out by the weekend. Write it up once — what you need, where it goes, what it costs — and the drive is live on the circle.",
    meta: "Minutes, not paperwork",
  },
  {
    id: "discover",
    label: "02",
    icon: FiCompass,
    title: "The whole circle sees it",
    body: "It doesn't sit on your own timeline hoping for reach. Anyone on KarmaCircle can find the drive by cause, by city, or by the organization running it — whether they're down the road or eleven time zones away.",
    meta: "No gatekeeping, no pay-to-be-seen",
  },
  {
    id: "fund",
    label: "03",
    icon: FiHeart,
    title: "People fund it directly",
    body: "Supporters give what they can and follow along as the drive fills up. Nothing routes through a middleman skimming a slice on the way — KarmaCircle takes no cut of what moves.",
    meta: "0% platform fee",
  },
  {
    id: "report",
    label: "04",
    icon: FiCamera,
    title: "The impact goes on record",
    body: "Post the counts, the photos, the receipts. Every drive keeps a public trail, so the next person deciding whether to back you can see exactly what happened the last time.",
    meta: "Receipts stay public",
  },
];

export const sampleDrives: SampleDrive[] = [
  {
    id: "winter-blankets",
    category: "Relief",
    title: "Winter blankets & hot meals",
    organizer: "Sunrise Youth Club",
    location: "Kolkata, India",
    summary:
      "200 blankets and two weeks of evening meals for families sleeping rough along the Sealdah corridor.",
    raised: "₹3,42,000",
    goal: "₹5,00,000",
    percent: 68,
    supporters: 214,
    daysLeft: 9,
  },
  {
    id: "school-library",
    category: "Education",
    title: "Rebuild the village library",
    organizer: "Ubuntu Learning Trust",
    location: "Kajiado, Kenya",
    summary:
      "Shelving, 1,200 books, and a solar reading lamp for a primary school that lost its roof in the March storms.",
    raised: "$4,180",
    goal: "$10,000",
    percent: 41,
    supporters: 96,
    daysLeft: 23,
  },
  {
    id: "monsoon-health-camp",
    category: "Healthcare",
    title: "Monsoon health camp",
    organizer: "Aarogya Volunteers",
    location: "Dhaka, Bangladesh",
    summary:
      "Three days of free check-ups, oral rehydration kits, and mosquito nets across four flood-hit wards.",
    raised: "৳7,60,000",
    goal: "৳8,75,000",
    percent: 87,
    supporters: 431,
    daysLeft: 4,
  },
  {
    id: "street-dog-van",
    category: "Animal welfare",
    title: "A rescue van that actually starts",
    organizer: "Pawsitive Pune",
    location: "Pune, India",
    summary:
      "One second-hand van, kitted out for emergency pickups, so injured strays stop waiting on a borrowed rickshaw.",
    raised: "₹2,10,000",
    goal: "₹6,40,000",
    percent: 33,
    supporters: 128,
    daysLeft: 31,
  },
  {
    id: "solar-lamps",
    category: "Environment",
    title: "Solar lamps for 300 homes",
    organizer: "Himal Light Collective",
    location: "Sindhupalchok, Nepal",
    summary:
      "Replacing kerosene with rechargeable solar lamps in three hill villages that go dark at 6pm.",
    raised: "$9,050",
    goal: "$16,500",
    percent: 55,
    supporters: 173,
    daysLeft: 17,
  },
];

/**
 * The three ways to pitch in, rendered by `OpenSource.tsx`.
 *
 * Two of the three are deliberately non-technical. The section's whole job
 * is "this is a community project, join in" — if every entry asked for a
 * pull request, it would read as a section for developers on a page whose
 * audience is mostly clubs, NGOs and supporters.
 */
export const contributeWays: ContributeWay[] = [
  {
    id: "build",
    icon: FiCode,
    title: "Build with us",
    body: "Pick up a first issue. The whole thing is public — nothing to ask permission for.",
  },
  {
    id: "shape",
    icon: FiPenTool,
    title: "Shape it",
    body: "Sharpen a screen, the words on it, or just tell us where it confused you.",
  },
  {
    id: "spread",
    icon: FiStar,
    title: "Pass it on",
    body: "Star the repo, or tell one club near you that this exists.",
  },
];

/** Where the "see how it's built" link points. Matches `footerLinksConfig`'s repo link. */
export const REPOSITORY_URL =
  "https://github.com/karmacircleCommunity/KarmaCircle";

/**
 * GitHub's own per-repository "ways to contribute" page — good first
 * issues, help-wanted, and the contributing guide, assembled by GitHub
 * rather than maintained by hand here.
 */
export const CONTRIBUTE_URL = `${REPOSITORY_URL}/contribute`;
