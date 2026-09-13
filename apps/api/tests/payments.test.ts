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
});
