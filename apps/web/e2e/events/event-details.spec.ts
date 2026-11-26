import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseKind,
  createEvent,
  openEditSection,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
} from "./event-helpers";

/**
 * The optional "More about the event" section of the organizer's form (PG-7):
 * a full write-up, contact email, fee, what to bring, languages, minimum age,
 * the mode's own notes and the agenda. Covers creating an event with all of
 * them, what the event page then shows, editing and clearing them, and the
 * form's own checks. See docs/specs/events.md.
 *
 * Each test signs up its own organization with a unique stamp (spec files run
 * in parallel against one database).
 */

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  await page.setViewportSize({ width: 1280, height: 900 });
}

/** The basics an in-person event needs, filled through the real form. */
async function fillInPersonBasics(page: Page, name: string) {
  await page.getByLabel("Event name").fill(name);
  await page
    .getByLabel("About this event")
    .fill("A morning of practical help for the neighbourhood, open to all.");
  await chooseKind(page);
  await page.locator("#coverImage").setInputFiles({
    name: "event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await page.getByLabel("Street address").fill("12 River Road");
  await page.getByLabel("City").fill("Guwahati");
  await page.getByLabel("State or region").fill("Assam");
}

async function readEvent(page: Page, uid: string) {
  const response = await page.request.get(
    `${E2E_API_URL}/events?uid=${encodeURIComponent(uid)}`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test("an organization publishes an event with every optional detail and the event page shows them", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await fillInPersonBasics(page, name);

  await page
    .getByLabel("Full write-up")
    .fill("We meet at the gate at nine.\n\nGloves and bags are provided.");
  await page.getByLabel("Contact email").fill("volunteers@riverbend.example");
  await page.getByLabel("Minimum age").fill("12");
  await page.getByLabel("Fee", { exact: true }).fill("250");
  await page.getByLabel("What the fee covers").fill("Snacks and gloves");
  await page.getByLabel("What to bring").fill("Water bottle\nSun hat");
  await page.getByLabel("Languages").fill("English, Hindi");
  await page
    .getByLabel("Getting there")
    .fill("Take the road behind the temple and follow the signs.");

  await page.getByRole("button", { name: "Add a row" }).click();
  await page.getByLabel("Time for row 1").fill("9:00 am");
  await page.getByLabel("Title for row 1").fill("Welcome and briefing");
  await page.getByLabel("Detail for row 1 (optional)").fill("At the gate");
  await page.getByRole("button", { name: "Add a row" }).click();
  await page.getByLabel("Time for row 2").fill("10:00 am");
  await page.getByLabel("Title for row 2").fill("Beach clean-up");

  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });

  // The event page shows each piece.
  await expect(page.locator("#about")).toContainText(
    "We meet at the gate at nine.",
  );
  await expect(page.locator("#about")).toContainText(
    "Gloves and bags are provided.",
  );
  const facts = page.locator("#details");
  await expect(facts).toContainText("250");
  await expect(facts).toContainText("Snacks and gloves");
  await expect(facts).toContainText("English");
  await expect(facts).toContainText("12+");
  await expect(page.locator("#schedule")).toContainText("9:00 am");
  await expect(page.locator("#schedule")).toContainText("Welcome and briefing");
  await expect(page.locator("#schedule")).toContainText("At the gate");
  await expect(page.locator("#schedule")).toContainText("Beach clean-up");
  await expect(page.locator("#location")).toContainText(
    "Take the road behind the temple and follow the signs.",
  );
  await expect(page.locator("#bring")).toContainText("Water bottle");
  await expect(page.locator("#bring")).toContainText("Sun hat");
  await expect(page.getByRole("link", { name: "Ask" }).first()).toHaveAttribute(
    "href",
    /mailto:volunteers@riverbend\.example/,
  );

  // And the API stored exactly that.
  const stored = await readEvent(page, uid);
  expect(stored.about).toEqual([
    "We meet at the gate at nine.",
    "Gloves and bags are provided.",
  ]);
  expect(stored.cost).toEqual({
    amount: 250,
    currency: "INR",
    note: "Snacks and gloves",
  });
  expect(stored.bringAlong).toEqual(["Water bottle", "Sun hat"]);
  expect(stored.languages).toEqual(["English", "Hindi"]);
  expect(stored.minimumAge).toBe(12);
  expect(stored.agenda).toEqual([
    { time: "9:00 am", title: "Welcome and briefing", detail: "At the gate" },
    { time: "10:00 am", title: "Beach clean-up" },
  ]);
});

test("an event published without any details shows none of those sections", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await fillInPersonBasics(page, name);
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });

  await expect(page.locator("#about")).toHaveCount(0);
  await expect(page.locator("#schedule")).toHaveCount(0);
  await expect(page.locator("#bring")).toHaveCount(0);
  await expect(page.locator("#details")).toContainText("Free");
  const stored = await readEvent(page, uid);
  expect(stored.cost).toBeUndefined();
  expect(stored.minimumAge).toBeUndefined();
});

test("details can be edited and cleared from the edit form", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-details-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  // Add details to an event that has none.
  await page.goto(`/organization/events/${uid}/edit`);
  await openEditSection(page, "More details");
  await page.getByLabel("Full write-up").fill("A long and useful write-up.");
  await page.getByLabel("Fee", { exact: true }).fill("100");
  await page.getByLabel("Contact email").fill("hello@riverbend.example");
  await page.getByRole("button", { name: "Add a row" }).click();
  await page.getByLabel("Time for row 1").fill("9:00 am");
  await page.getByLabel("Title for row 1").fill("Welcome");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.locator("#about")).toContainText(
    "A long and useful write-up.",
  );
  await expect(page.locator("#details")).toContainText("100");
  await expect(page.locator("#schedule")).toContainText("Welcome");

  // The form opens filled in with them.
  await page.goto(`/organization/events/${uid}/edit`);
  await openEditSection(page, "More details");
  await expect(page.getByLabel("Full write-up")).toHaveValue(
    "A long and useful write-up.",
  );
  await expect(page.getByLabel("Fee", { exact: true })).toHaveValue("100");
  await expect(page.getByLabel("Time for row 1")).toHaveValue("9:00 am");

  // Clearing them removes them from the page and the record.
  await page.getByLabel("Full write-up").fill("");
  await page.getByLabel("Fee", { exact: true }).fill("");
  await page.getByLabel("Contact email").fill("");
  await page.getByRole("button", { name: "Remove row 1" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.locator("#about")).toHaveCount(0);
  await expect(page.locator("#schedule")).toHaveCount(0);
  await expect(page.locator("#details")).toContainText("Free");

  const stored = await readEvent(page, uid);
  expect(stored.cost).toBeUndefined();
  expect(stored.contactEmail).toBeUndefined();
  expect(stored.about ?? []).toEqual([]);
  expect(stored.agenda ?? []).toEqual([]);
});

test("the form checks the optional details before anything is sent", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await fillInPersonBasics(page, name);

  await page.getByLabel("Contact email").fill("not-an-email");
  await page.getByLabel("Fee", { exact: true }).fill("0");
  await page.getByLabel("Minimum age").fill("0");
  await page.getByRole("button", { name: "Add a row" }).click();
  await page.getByLabel("Detail for row 1 (optional)").fill("detail only");
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page.getByText("Enter a valid contact email")).toBeVisible();
  await expect(
    page.getByText("Enter a fee above zero, or clear it if the event is free"),
  ).toBeVisible();
  await expect(
    page.getByText("Enter a whole number from 1 to 120, or clear it"),
  ).toBeVisible();
  await expect(
    page.getByText("Give every row a time and a title, or remove it"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events\/new$/);
  const response = await page.request.get(`${E2E_API_URL}/events?uid=${uid}`);
  expect(response.status()).toBe(404);
});

test("an online event shows the link notes instead of directions", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Volunteer Town Hall ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await page.getByLabel("Event name").fill(name);
  await page
    .getByLabel("About this event")
    .fill("A live conversation for neighbours, held entirely over video.");
  await chooseKind(page);
  await page.locator("#coverImage").setInputFiles({
    name: "event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await page.getByRole("button", { name: /^Online/ }).click();
  await page
    .getByLabel("Meeting link")
    .fill("https://meet.example.com/town-hall");

  // Directions belong to in-person events only.
  await expect(page.getByLabel("Getting there")).toHaveCount(0);
  await page
    .getByLabel("When the join link arrives")
    .fill("Emailed the evening before");
  await page
    .getByLabel("Have ready before joining")
    .fill("A working microphone");
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });
  await expect(page.locator("#location")).toContainText(
    "Emailed the evening before",
  );
  await expect(page.locator("#location")).toContainText("A working microphone");
  const stored = await readEvent(page, uid);
  expect(stored.linkDelivery).toBe("Emailed the evening before");
  expect(stored.joinRequirements).toBe("A working microphone");
  expect(stored.gettingThere).toBeUndefined();
});

test("the write-up supports bold, italic, links and lists, shows a preview, and never runs markup", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await fillInPersonBasics(page, name);

  await page
    .getByLabel("Full write-up")
    .fill(
      [
        "We meet at **the river gate** at nine, rain or *shine*.",
        "Bring:\n- a water bottle\n- a hat\nSee our [route map](https://maps.example.org/route).",
        "1. Sign in\n2. Pick up gloves",
        "Not a link: [bad](javascript:alert(1)) and <script>window.__pwned = true</script>",
      ].join("\n\n"),
    );

  // A live preview shows how it will look before anything is published.
  const preview = page.getByRole("group", { name: "Preview of the write-up" });
  await expect(preview.locator("strong")).toHaveText("the river gate");
  await expect(preview.locator("em")).toHaveText("shine");
  await expect(preview.getByRole("listitem")).toHaveCount(4);

  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });

  const about = page.locator("#about");
  await expect(about.locator("strong")).toHaveText("the river gate");
  await expect(about.locator("em")).toHaveText("shine");
  await expect(about.locator("ul li")).toHaveText(["a water bottle", "a hat"]);
  await expect(about.locator("ol li")).toHaveText([
    "Sign in",
    "Pick up gloves",
  ]);

  const link = about.getByRole("link", { name: "route map" });
  await expect(link).toHaveAttribute("href", "https://maps.example.org/route");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  // The unsafe parts are just text: no link, no script, nothing executed.
  await expect(about).toContainText("[bad](javascript:alert(1))");
  await expect(about).toContainText("<script>window.__pwned = true</script>");
  await expect(about.locator("script")).toHaveCount(0);
  await expect(about.getByRole("link", { name: "bad" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { __pwned?: boolean }).__pwned,
    ),
  ).toBeUndefined();
});

test("a failed load says so and can be retried, instead of saying the event does not exist", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-load-error-${stamp}`;
  const name = `Load Retry ${stamp}`;
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name });

  let apiReachable = false;
  await page.route(
    (url) => url.pathname === "/events" && url.searchParams.get("uid") === uid,
    (route) => (apiReachable ? route.continue() : route.abort()),
  );

  await page.goto(`/events/${uid}`);
  await expect(
    page.getByRole("heading", { name: "Could not load this event" }),
  ).toBeVisible();
  await expect(page.getByText(/No event at/)).toHaveCount(0);

  apiReachable = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // An event the API does not know is still reported as not found.
  await page.goto(`/events/evt-e2e-missing-${stamp}`);
  await expect(page.getByText(/No event at/)).toBeVisible();
});
