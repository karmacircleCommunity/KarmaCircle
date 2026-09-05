import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

const organization = {
  email: "helping-hands@example.com",
  password: "hunter2",
  name: "Helping Hands",
  userType: "organization",
};

// Everything on REQUIRED_FIELDS (organization.service.ts) in one go — the
// setup form can save any subset, but a test that publishes needs all of it.
const completeProfile = {
  description: "We run weekend food drives across the city.",
  tag: "NGO",
  domains: ["Food and hunger"],
  teamSize: 12,
  city: "Kolkata",
};

async function signUpOrganization() {
  const res = await request(app).post("/auth/signup").send(organization);
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"][0], userName: res.body.user.userName };
}

describe("Organizations", () => {
  describe("GET /organizations/me", () => {
    it("returns the draft record created at signup, listing what is still missing", async () => {
      const { cookie } = await signUpOrganization();

      const res = await request(app).get("/organizations/me").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(organization.name);
      expect(res.body.status).toBe("draft");
      expect(res.body.isLive).toBe(false);
      expect(res.body.missingFields).toEqual(
        expect.arrayContaining(["description", "tag", "domains", "teamSize", "city"]),
      );
    });

    it("rejects an anonymous caller with 401", async () => {
      const res = await request(app).get("/organizations/me");
      expect(res.status).toBe(401);
    });

    it("rejects an individual account with 403", async () => {
      const signup = await request(app)
        .post("/auth/signup")
        .send({ email: "solo@example.com", password: "hunter2" });

      const res = await request(app)
        .get("/organizations/me")
        .set("Cookie", signup.headers["set-cookie"][0]);

      expect(res.status).toBe(403);
    });
  });

  describe("staying hidden until the profile is complete", () => {
    it("keeps a draft organization out of the directory and 404s its public profile", async () => {
      const { userName } = await signUpOrganization();

      const list = await request(app).get("/organizations");
      expect(list.body.data).toHaveLength(0);

      const profile = await request(app).get(`/organizations/${userName}`);
      expect(profile.status).toBe(404);
    });

    it("publishes the organization as soon as the last required field lands", async () => {
      const { cookie, userName } = await signUpOrganization();

      // A partial save keeps it in draft — the form is allowed to save
      // progress without going live.
      const partial = await request(app)
        .patch("/organizations/me")
        .set("Cookie", cookie)
        .send({ description: completeProfile.description, city: "Kolkata" });
      expect(partial.status).toBe(200);
      expect(partial.body.organization.status).toBe("draft");
      const stillEmpty = await request(app).get("/organizations");
      expect(stillEmpty.body.data).toHaveLength(0);

      const complete = await request(app)
        .patch("/organizations/me")
        .set("Cookie", cookie)
        .send(completeProfile);
      expect(complete.status).toBe(200);
      expect(complete.body.organization.status).toBe("live");
      expect(complete.body.organization.missingFields).toEqual([]);

      const list = await request(app).get("/organizations");
      expect(list.body.data.map((o: { name: string }) => o.name)).toContain(
        organization.name,
      );

      const profile = await request(app).get(`/organizations/${userName}`);
      expect(profile.status).toBe(200);
      expect(profile.body.handle).toBe(userName);
    });
  });

  describe("the public shape", () => {
    it("never exposes the owner's email or the member list", async () => {
      const { cookie, userName } = await signUpOrganization();
      await request(app).patch("/organizations/me").set("Cookie", cookie).send(completeProfile);

      const res = await request(app).get(`/organizations/${userName}`);

      expect(res.status).toBe(200);
      expect(res.body.ownerEmail).toBeUndefined();
      expect(res.body.members).toBeUndefined();
      expect(res.body.status).toBeUndefined();
    });
  });

  describe("filters", () => {
    it("narrows the directory by search term and by domain", async () => {
      const { cookie } = await signUpOrganization();
      await request(app).patch("/organizations/me").set("Cookie", cookie).send(completeProfile);

      const byCity = await request(app).get("/organizations").query({ search: "kolk" });
      expect(byCity.body.data).toHaveLength(1);

      const byDomain = await request(app)
        .get("/organizations")
        .query({ domain: "Animal welfare" });
      expect(byDomain.body.data).toHaveLength(0);
    });
  });

  describe("what an organization may not set about itself", () => {
    it("rejects an attempt to write status or verified with 400", async () => {
      const { cookie } = await signUpOrganization();

      const res = await request(app)
        .patch("/organizations/me")
        .set("Cookie", cookie)
        .send({ ...completeProfile, verified: true, status: "live" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /organizations/taxonomy", () => {
    it("serves the tag and domain lists the setup form renders", async () => {
      const res = await request(app).get("/organizations/taxonomy");

      expect(res.status).toBe(200);
      expect(res.body.tags).toContain("NGO");
      expect(res.body.domains).toContain("Animal welfare");
    });
  });
});
