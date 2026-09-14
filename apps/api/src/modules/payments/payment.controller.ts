import { Request, Response } from "express";
import { STATUS_CODE } from "../../constants/http-status";
import * as paymentService from "./payment.service";
import {
  CreateOrderInput,
  CreateSponsorshipOrderInput,
  OrganizationOrderParam,
  VerifySponsorshipPaymentInput,
} from "./payment.validation";

export async function createOrder(req: Request, res: Response) {
  const { amount } = req.body as CreateOrderInput;
  const order = await paymentService.createOrder(amount);
  res.status(STATUS_CODE.OK).json(order);
}

export async function createSponsorshipOrder(req: Request, res: Response) {
  const { handle } = req.params as unknown as OrganizationOrderParam;
  const { amount, supporterName, supporterEmail } =
    req.body as CreateSponsorshipOrderInput;

  const order = await paymentService.createSponsorshipOrder(handle, amount, {
    name: supporterName,
    email: supporterEmail,
  });

  res.status(STATUS_CODE.OK).json(order);
}

export async function verifySponsorshipPayment(req: Request, res: Response) {
  const { handle } = req.params as unknown as OrganizationOrderParam;
  const result = await paymentService.verifySponsorshipPayment(
    handle,
    req.body as VerifySponsorshipPaymentInput,
  );
  res.status(STATUS_CODE.OK).json(result);
}
