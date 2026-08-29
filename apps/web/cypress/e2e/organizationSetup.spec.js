/// <reference types="cypress" />

const apiUrl = Cypress.env("apiUrl");

/**
 * Off by default: the flow is a regression test first, and a screenshot on
 * every CI run is noise. Run with `CYPRESS_captureTour=1` to also save the
 * screens of the journey into cypress/screenshots.
 */
const tour = (name) => {
  if (Cypress.env("captureTour")) {
    cy.screenshot(name, { capture: "viewport", overwrite: true });
  }
};

/**
 * The organization lifecycle, end to end, exactly as an organization hits
 * it: sign up, be invisible, fill the required details, appear.
 *
 * A fresh email per run — signup is a real write against the API this
 * frontend is pointed at, and a fixed address would 409 on the second run.
 * No credentials are hardcoded: the password is generated here and never
 * reused anywhere else.
 */
const stamp = Date.now();

// The organization-name field strips anything that isn't a letter or a
// space as you type (Auth.tsx), so the run's unique suffix has to be
// letters — a timestamp typed in here would silently vanish and every run
// would share one name.
const suffix = String(stamp)
  .split("")
  .map((digit) => "ABCDEFGHIJ"[Number(digit)])
  .join("");

const org = {
  name: `Riverbank Relief ${suffix}`,
  email: `riverbank-${stamp}@example.com`,
  password: `Testing${stamp}a`,
};

describe("An organization signing up and going live", () => {
  it("signs up, stays hidden, then appears once its profile is complete", () => {
    // ---------- Sign up ----------
    cy.visit("/auth/signup");
    cy.contains("button", "Organization").click();
    cy.get('input[name="email"]').type(org.email);
    cy.contains("button", "Continue").click();

    cy.get('input[name="name"]', { timeout: 10000 }).type(org.name);
    cy.get('input[name="new-password"]').type(org.password);
    cy.contains("button", "Sign Up").click();

    // Signup drops a new organization on its setup page — but the page
    // *asks* rather than assumes: setting the profile up is optional, and
    // "Maybe later" is a real answer that leaves for the home page.
    cy.url({ timeout: 15000 }).should("include", "/organization/setup");
    cy.contains("Draft — not visible yet").should("be.visible");
    tour("1-setup-intro");

    cy.get('[data-cy="setup-later"]').click();
    cy.location("pathname").should("eq", "/");

    // ---------- Invisible while in draft ----------
    cy.request(`${apiUrl}/organizations`).then((response) => {
      const names = response.body.data.map((item) => item.name);
      expect(names).to.not.include(org.name);
    });

    cy.visit("/organizations");
    cy.contains(org.name).should("not.exist");
    tour("2-directory-without-the-draft");

    // ---------- Every way back in ----------
    // The dashboard doesn't pretend to work for a draft: it says what is
    // missing and links back into setup.
    cy.visit("/dashboard");
    cy.get('[data-cy="gate-step-about"]').should(
      "have.attr",
      "data-done",
      "false",
    );
    cy.get('[data-cy="gate-resume"]').click();
    cy.url().should("include", "step=about");

    // ---------- Step one: four questions, one screen each ----------
    // Q1 — the name, already filled in at signup.
    cy.get('[data-cy="org-name"]').should("have.value", org.name);
    cy.get('[data-cy="org-save"]').click();

    // Q2 — what they do. Continue refuses to leave a required question
    // blank: the flow can be *left* at any time, but not walked past.
    cy.url().should("include", "q=2");
    cy.get('[data-cy="org-save"]').click();
    cy.url().should("include", "q=2");
    cy.get('[data-cy="setup-required-note"]').should("be.visible");

    cy.get('[data-cy="org-description"]').type(
      "We clear and rebuild riverbank homes after the monsoon, and run a year-round flood-readiness drive with local schools.",
    );
    tour("3-setup-question");
    cy.get('[data-cy="org-save"]').click();

    // Q3 — a single-choice question, which advances on its own once
    // answered rather than waiting for a second click on Continue.
    cy.url().should("include", "q=3");
    cy.get('[data-cy="org-tag-NGO"]').click();
    cy.url({ timeout: 10000 }).should("include", "q=4");

    // Q4 — the causes, and the last question of the step: this Continue is
    // the one that saves.
    cy.get('[data-cy="org-domain-Disaster relief"]').click();
    cy.get('[data-cy="org-save"]').click();

    // Crossing into step two is what wrote step one — leaving now would
    // keep every answer above.
    cy.url({ timeout: 15000 }).should("include", "step=reach");
    cy.reload();
    cy.get('[data-cy="org-teamsize"]').should("be.visible");

    // ---------- Step two, and live ----------
    cy.get('[data-cy="org-teamsize"]').type("34");
    cy.get('[data-cy="org-save"]').click();

    cy.get('[data-cy="org-city"]').type("Guwahati");
    cy.get('[data-cy="org-country"]').type("India");
    tour("4-setup-grouped-question");
    cy.get('[data-cy="org-save"]').click();

    // Typed without a scheme on purpose — the form normalizes it rather
    // than 400ing on the backend's URL validation.
    cy.get('[data-cy="org-website"]').type("riverbank.example.org");
    cy.get('[data-cy="org-contact-email"]').type(org.email);
    cy.get('[data-cy="org-save"]').click();

    cy.get('[data-cy="org-funds-raised"]').type("450000");
    cy.get('[data-cy="org-save"]').click();

    // Completing the required list publishes the organization, and the
    // page hands the owner straight to the profile it just created.
    cy.url({ timeout: 15000 }).should("include", "/organization/");
    cy.contains("h1", org.name).should("be.visible");
    tour("5-public-profile");

    // Step one's answers survived the two separate saves.
    cy.contains("Disaster relief").should("be.visible");
    cy.contains("Guwahati, India").should("be.visible");

    // ---------- In the directory ----------
    cy.visit("/organizations");
    cy.contains(org.name, { timeout: 15000 }).should("be.visible");
    tour("6-directory-with-the-organization");

    // The directory's own filters find it, server-side.
    cy.get('input[type="search"], input[type="text"]').first().type("Guwahati");
    cy.contains(org.name).should("be.visible");

    // The resume link now skips the step that is already done.
    cy.visit("/organization/events");
    cy.contains("Your events").should("be.visible");

    // ---------- Coming back to edit ----------
    // A live organization skips the intro and lands on the first question.
    cy.visit("/organization/setup");
    cy.contains("Live", { timeout: 15000 }).should("be.visible");
    cy.get('[data-cy="org-name"]').should("have.value", org.name);

    // Back from the first question goes to the intro, not out of the app.
    cy.get('[data-cy="setup-back"]').click();
    cy.get('[data-cy="setup-start"]', { timeout: 10000 }).should("be.visible");
  });
});
