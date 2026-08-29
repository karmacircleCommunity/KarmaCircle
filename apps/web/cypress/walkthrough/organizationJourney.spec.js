/// <reference types="cypress" />
/* eslint-disable cypress/no-unnecessary-waiting -- the deliberate pauses
   below are what makes this a watchable recording; see the note under. */

/**
 * The organization journey, paced for a human watching it.
 *
 * This is a **demo recording, not a test** — the assertions here exist only
 * to keep the recording honest (if the flow breaks, the video should fail
 * rather than quietly record a broken app). The real regression coverage is
 * `cypress/e2e/organizationSetup.spec.js`, which does the same journey in
 * about twelve seconds with no waiting around.
 *
 * It lives outside `cypress/e2e/` so a normal `cypress run` never picks it
 * up. Run it with `npm run cypress:walkthrough`.
 */

const BEAT = 2000;
const READ = 3200;
const TYPE = { delay: 45 };

const stamp = Date.now();

// The organization-name field strips anything that isn't a letter or a
// space as you type (Auth.tsx), so the run's unique suffix has to be
// letters — a timestamp typed in here would silently vanish.
const suffix = String(stamp)
  .slice(-5)
  .split("")
  .map((digit) => "ABCDEFGHIJ"[Number(digit)])
  .join("");

const org = {
  name: `Riverbank Relief ${suffix}`,
  email: `riverbank-${stamp}@example.com`,
  password: `Testing${stamp}a`,
};

const CAPTION_ID = "kc-walkthrough-caption";

/**
 * Draws the narration bar along the bottom of the recorded viewport.
 *
 * `pointer-events: none` is load-bearing: a fixed bar overlapping a button
 * would make Cypress refuse the click ("element is covered by another
 * element"), which would break the very flow it is narrating. The caption
 * is re-created after every `cy.visit()` because a page load wipes it.
 */
function caption(title, detail) {
  cy.document().then((doc) => {
    let bar = doc.getElementById(CAPTION_ID);

    if (!bar) {
      bar = doc.createElement("div");
      bar.id = CAPTION_ID;
      bar.setAttribute(
        "style",
        [
          "position:fixed",
          "left:0",
          "right:0",
          "bottom:0",
          "z-index:2147483647",
          "pointer-events:none",
          "background:rgba(28,25,23,0.94)",
          "color:#fff",
          "padding:20px 32px",
          "display:flex",
          "gap:16px",
          "align-items:baseline",
          "font-family:system-ui,-apple-system,sans-serif",
          "box-shadow:0 -8px 24px rgba(0,0,0,0.18)",
        ].join(";"),
      );
      doc.body.appendChild(bar);
    }

    bar.innerHTML =
      `<span style="font-size:21px;font-weight:600;letter-spacing:-0.01em">${title}</span>` +
      (detail
        ? `<span style="font-size:17px;opacity:0.62">${detail}</span>`
        : "");
  });

  cy.wait(BEAT);
}

/** Slow pass down a page and back up, so the layout is actually visible. */
function lookAround(down = 5000, up = 2500) {
  cy.scrollTo("bottom", { duration: down });
  cy.wait(BEAT);
  cy.scrollTo("top", { duration: up });
  cy.wait(BEAT);
}

describe("The organization journey, start to finish", () => {
  it("signs up, sits invisible in draft, fills its profile, and goes live", () => {
    // ---------------------------------------------------------------
    // 1. Signing up
    // ---------------------------------------------------------------
    cy.visit("/auth/signup");
    caption("Step 1", "A new organization arrives at the sign-up page");
    cy.wait(READ);

    caption("Choosing the account type", "Organization, not individual");
    cy.contains("button", "Organization").click();
    cy.wait(BEAT);

    caption("This choice is permanent", "An account cannot change type later");
    cy.wait(READ);

    caption("Just an email to start", "No professional domain required");
    cy.get('input[name="email"]').type(org.email, TYPE);
    cy.wait(BEAT);
    cy.contains("button", "Continue").click();

    caption("The name and a password", "That is the whole sign-up");
    cy.get('input[name="name"]', { timeout: 10000 }).type(org.name, TYPE);
    cy.wait(BEAT);
    cy.get('input[name="new-password"]').type(org.password, TYPE);
    cy.wait(BEAT);
    cy.contains("button", "Sign Up").click();

    // ---------------------------------------------------------------
    // 2. Landing in draft
    // ---------------------------------------------------------------
    cy.url({ timeout: 15000 }).should("include", "/organization/setup");
    caption("Step 2", "Signed up — and offered the setup, not forced into it");
    cy.wait(READ);

    caption("The account exists, the profile does not", "Status: draft");
    cy.contains("Draft — not visible yet").should("be.visible");
    cy.wait(READ);

    caption("Setting it up is a choice", "Two steps, or come back later");
    cy.get('[data-cy="setup-start"]').should("be.visible");
    cy.get('[data-cy="setup-later"]').should("be.visible");
    cy.wait(READ);

    caption("Taking the offer", "");
    lookAround();

    // ---------------------------------------------------------------
    // 3. Invisible to everyone else
    // ---------------------------------------------------------------
    caption("Step 3", "Meanwhile, what does the public see?");
    cy.wait(BEAT);

    cy.visit("/organizations");
    caption("The public directory", "The new organization is not in it");
    cy.contains(org.name).should("not.exist");
    cy.wait(READ);

    cy.visit(`/organization/${org.email.split("@")[0]}`);
    caption(
      "Its public profile",
      "Not found — a draft is invisible, not half-shown",
    );
    cy.wait(READ);

    // ---------------------------------------------------------------
    // 4. Filling the profile in
    // ---------------------------------------------------------------
    cy.visit("/organization/setup");
    caption("Step 4", "Back inside, filling the profile in");
    cy.get('[data-cy="setup-start"]').click();
    cy.wait(READ);

    caption("One question at a time", "Not thirteen boxes on one page");
    cy.wait(READ);

    cy.get('[data-cy="org-save"]').click();

    caption("What the organization actually does", "");
    cy.get('[data-cy="org-description"]').type(
      "We clear and rebuild riverbank homes after the monsoon, and run a year-round flood-readiness drive with local schools.",
      { delay: 12 },
    );
    cy.wait(READ);
    cy.get('[data-cy="org-save"]').click();

    caption("What kind of organization it is", "Answer it, and it moves on");
    cy.wait(BEAT);
    cy.get('[data-cy="org-tag-NGO"]').click();
    cy.url({ timeout: 10000 }).should("include", "q=4");
    cy.wait(BEAT);

    caption(
      "The causes it works on",
      "Picked from one shared list, so filters work",
    );
    cy.get('[data-cy="org-domain-Disaster relief"]').click();
    cy.wait(BEAT);
    cy.get('[data-cy="org-domain-Shelter"]').click();
    cy.wait(READ);

    caption("Step one saves on its own", "Stopping here would lose nothing");
    cy.get('[data-cy="org-save"]').click();
    cy.url({ timeout: 15000 }).should("include", "step=reach");
    cy.wait(READ);

    caption("How many people are behind it", "");
    cy.get('[data-cy="org-teamsize"]').type("34", TYPE);
    cy.wait(BEAT);
    cy.get('[data-cy="org-save"]').click();

    caption("Where it works", "Three boxes, because it is one thought");
    cy.get('[data-cy="org-city"]').type("Guwahati", TYPE);
    cy.get('[data-cy="org-state"]').type("Assam", TYPE);
    cy.get('[data-cy="org-country"]').type("India", TYPE);
    cy.wait(READ);
    cy.get('[data-cy="org-save"]').click();

    caption("How to reach it", "Optional — none of this blocks going live");
    cy.get('[data-cy="org-website"]').type("riverbank.example.org", {
      delay: 20,
    });
    cy.get('[data-cy="org-contact-email"]').type(org.email, { delay: 20 });
    cy.get('[data-cy="org-contact-phone"]').type("+91 98300 00000", TYPE);
    cy.wait(BEAT);
    cy.get('[data-cy="org-save"]').click();

    caption("Money", "Their own figure, and shown as their own claim");
    cy.get('[data-cy="org-funds-raised"]').type("450000", TYPE);
    cy.get('[data-cy="org-funds-goal"]').type("1200000", TYPE);
    cy.wait(READ);

    caption("Saving", "The server decides whether that was enough to publish");
    cy.get('[data-cy="org-save"]').click();

    // ---------------------------------------------------------------
    // 5. Live
    // ---------------------------------------------------------------
    cy.url({ timeout: 15000 }).should("include", "/organization/");
    cy.contains("h1", org.name).should("be.visible");
    caption("Step 5", "Published — and handed straight to the new profile");
    cy.wait(READ);

    caption(
      "Both steps' answers, on one page",
      "Saved separately, published together",
    );
    cy.contains("Guwahati, India").should("be.visible");
    cy.wait(READ);

    // ---------------------------------------------------------------
    // 6. What everyone else sees now
    // ---------------------------------------------------------------
    cy.visit("/organizations");
    caption("Step 6", "The same directory that was empty a minute ago");
    cy.contains(org.name, { timeout: 15000 }).should("be.visible");
    cy.wait(READ);

    caption(
      "No cover photo yet",
      "So it gets its own colour and monogram, not a stock banner",
    );
    cy.wait(READ);

    caption("Filtering by cause", "Done by the server, not in the browser");
    cy.contains("button", "Disaster relief").click();
    cy.wait(READ);
    cy.contains(org.name).should("be.visible");

    caption("Searching by city", "");
    cy.contains("button", "All").click();
    cy.get('input[type="text"], input[type="search"]')
      .first()
      .type("Guwahati", TYPE);
    cy.wait(READ);

    // ---------------------------------------------------------------
    // 7. The public profile
    // ---------------------------------------------------------------
    caption("Step 7", "A visitor opens the profile");
    cy.contains(org.name).click();
    cy.url().should("include", "/organization/");
    cy.wait(BEAT);

    cy.contains("h1", org.name).should("be.visible");
    caption(
      "The public profile",
      "Everything they filled in, and nothing they did not",
    );
    cy.wait(READ);

    caption(
      "Sections with no data do not render",
      "No fake drives, no invented milestones",
    );
    lookAround(6000, 3000);

    caption(
      "That is the whole journey",
      "Sign up, stay hidden, fill it in, go live",
    );
    cy.wait(READ);
  });
});
