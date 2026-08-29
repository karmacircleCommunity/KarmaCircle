/// <reference types="cypress" />

const apiUrl = Cypress.env("apiUrl");

describe("Backend reachability", () => {
  it("serves the organizations directory", () => {
    cy.request(`${apiUrl}/organizations`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("data");
    });
  });

  it("serves the tag and domain taxonomy the setup form renders", () => {
    cy.request(`${apiUrl}/organizations/taxonomy`).then((response) => {
      expect(response.body.tags).to.include("NGO");
      expect(response.body.domains).to.include("Animal welfare");
    });
  });
});

describe("Navigation", () => {
  it("reaches the organizations directory from the navbar", () => {
    cy.visit("/");
    cy.get("nav").contains("Organizations").click();
    cy.url().should("include", "/organizations");
  });

  it("reaches the events directory from the navbar", () => {
    cy.visit("/");
    cy.get("nav").contains("Events").click();
    cy.url().should("include", "/events");
  });
});
