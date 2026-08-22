/// <reference types="cypress" />

Cypress.config("viewportWidth", 1280);
Cypress.config("viewportHeight", 720);

Cypress.env("CI", false);

describe("Checking if the backend is working properly or not", () => {
  it("GET request for users", () => {
    cy.request("https://api.ngoworld.org/display/users").then((response) => {
      expect(response.body.length).to.be.greaterThan(100);
    });
  });
});

describe("Auth checks", () => {
  it("Checking Login", () => {
    cy.visit("/auth/login");
    cy.get('[data-cy="email"]').type("gyansujan69@gmail.com", {
      force: true,
    });
    cy.get('[data-cy="password"]').type("tamaldas69", {
      force: true,
    });
    cy.get('[data-cy="loginbutton"]').scrollIntoView();
    cy.get('[data-cy="loginbutton"]').click({ force: true });
    cy.getCookie("isLoggedIn");
    cy.visit("/");
  });
});

describe("Navigation to other pages", () => {
  it("Checking Navigation to Home", () => {
    cy.visit("/");
    cy.get("nav").contains("Home").click();
    cy.url().should("include", "/");
  });

  // it("Checking Navigation to Clubs", () => {
  //   cy.visit("/");
  //   cy.get("nav").contains("Clubs").click();
  //   cy.url().should("include", "/clubs");
  // });

  // it("Checking Navigation to Events", () => {
  //   cy.visit("/");
  //   cy.get("nav").contains("Events").click();
  //   cy.url().should("include", "/events");
  // });

  it("Checking Navigation to Shop", () => {
    cy.visit("/");
    cy.get("nav").contains("Shop").click();
    cy.url().should("include", "/shop");
  });
});
