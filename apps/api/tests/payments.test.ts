import crypto from "crypto";
import request from "supertest";
import Razorpay from "razorpay";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

/**
 * The real Razorpay SDK makes a network call from its constructor's first
 * `.orders.create`, and env.setup.ts's RAZORPAY_KEY_ID/SECRET are
 * placeholders, not real credentials — mock the SDK the same way
 * auth.test.ts mocks the mailer, rather than hitting Razorpay's API (or a
 * timeout) from a test run.
 *
 * payment.service.ts constructs and caches the client as a module-level
 * singleton on first use, so the mock constructor only ever runs once
 * across this whole file — `ordersCreate` has to be one stable jest.fn()
 * set up before any test runs, not something re-created (or read back off
 * `MockedRazorpay.mock.results`) per test, or later tests would be
 * asserting against a mock instance the service never actually called.
 */
jest.mock("razorpay");

const MockedRazorpay = Razorpay as jest.MockedClass<typeof Razorpay>;
const ordersCreate = jest.fn().mockResolvedValue({
  id: "order_test123",
  currency: "INR",
  amount: 50000,
});
MockedRazorpay.mockImplementation(
  () => ({ orders: { create: ordersCreate } }) as unknown as Razorpay,
);

describe("Payments", () => {
  describe("POST /payment/razorpay", () => {
    it("creates an order and returns id/currency/amount", async () => {
      const res = await request(app).post("/payment/razorpay").send({ amount: 500 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: "order_test123",
        currency: "INR",
        amount: 50000,
      });
    });

    it("converts rupees to paise before calling Razorpay", async () => {
      await request(app).post("/payment/razorpay").send({ amount: 500 });

      expect(ordersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50000, currency: "INR" }),
      );
    });

    it("rejects a missing amount with 400", async () => {
      const res = await request(app).post("/payment/razorpay").send({});
      expect(res.status).toBe(400);
    });

    it("rejects a zero or negative amount with 400", async () => {
      const res = await request(app).post("/payment/razorpay").send({ amount: -10 });
      expect(res.status).toBe(400);
    });
  });

  describe("organization sponsorship", () => {
    const completeProfile = {
      description: "We run weekend food drives across the city.",
      tag: "NGO",
      domains: ["Food and hunger"],
      teamSize: 12,
      city: "Kolkata",
    };

    async function signUpLiveOrganization(sponsorshipEnabled: boolean) {
      const signup = await request(app).post("/auth/signup").send({
        email: `sponsor-org-${sponsorshipEnabled}@example.com`,
        password: "hunter2",
        name: "Sponsor Test Org",
        userType: "organization",
      });
      const cookie = signup.headers["set-cookie"][0];

      await request(app)
        .patch("/organizations/me")
        .set("Cookie", cookie)
        .send({ ...completeProfile, sponsorship: { enabled: sponsorshipEnabled } });

      return signup.body.user.userName as string;
    }

    describe("POST /payment/organizations/:handle/order", () => {
      it("creates and persists an order for a live org with sponsorship on", async () => {
        const handle = await signUpLiveOrganization(true);

        const res = await request(app)
          .post(`/payment/organizations/${handle}/order`)
          .send({ amount: 500, supporterName: "A Friend" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({ id: "order_test123", currency: "INR", amount: 50000 }),
        );
      });

      it("refuses an org that hasn't turned sponsorship on", async () => {
        const handle = await signUpLiveOrganization(false);

        const res = await request(app)
          .post(`/payment/organizations/${handle}/order`)
          .send({ amount: 500 });

        expect(res.status).toBe(403);
      });

      it("404s for an unknown handle", async () => {
        const res = await request(app)
          .post("/payment/organizations/does-not-exist/order")
          .send({ amount: 500 });

        expect(res.status).toBe(404);
      });
    });

    describe("POST /payment/organizations/:handle/verify", () => {
      it("credits the organization on a correctly-signed payment, and is idempotent", async () => {
        const handle = await signUpLiveOrganization(true);
        await request(app)
          .post(`/payment/organizations/${handle}/order`)
          .send({ amount: 500 });

        const razorpay_order_id = "order_test123";
        const razorpay_payment_id = "pay_test456";
        const razorpay_signature = crypto
          .createHmac("sha256", "test-razorpay-key-secret")
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        const first = await request(app)
          .post(`/payment/organizations/${handle}/verify`)
          .send({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

        expect(first.status).toBe(200);
        expect(first.body).toEqual({ status: "paid", raisedViaPlatform: 500 });

        // Re-verifying the same order (e.g. a retried client callback) must
        // not double-credit the organization.
        const second = await request(app)
          .post(`/payment/organizations/${handle}/verify`)
          .send({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

        expect(second.status).toBe(200);
        expect(second.body).toEqual({ status: "paid", raisedViaPlatform: 500 });

        const profile = await request(app).get(`/organizations/${handle}`);
        expect(profile.body.raisedViaPlatform).toBe(500);
      });

      it("rejects a tampered signature with 400 and does not credit the organization", async () => {
        const handle = await signUpLiveOrganization(true);
        await request(app)
          .post(`/payment/organizations/${handle}/order`)
          .send({ amount: 500 });

        const res = await request(app)
          .post(`/payment/organizations/${handle}/verify`)
          .send({
            razorpay_order_id: "order_test123",
            razorpay_payment_id: "pay_test456",
            razorpay_signature: "not-a-real-signature",
          });

        expect(res.status).toBe(400);

        const profile = await request(app).get(`/organizations/${handle}`);
        expect(profile.body.raisedViaPlatform).toBe(0);
      });

      it("404s for an order that doesn't belong to this handle", async () => {
        const handleA = await signUpLiveOrganization(true);
        await request(app)
          .post(`/payment/organizations/${handleA}/order`)
          .send({ amount: 500 });

        const res = await request(app)
          .post("/payment/organizations/some-other-handle/verify")
          .send({
            razorpay_order_id: "order_test123",
            razorpay_payment_id: "pay_test456",
            razorpay_signature: "irrelevant",
          });

        expect(res.status).toBe(404);
      });
    });
  });
});
