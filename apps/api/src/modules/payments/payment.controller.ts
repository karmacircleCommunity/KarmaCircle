import { Request, Response } from "express";
import { STATUS_CODE } from "../../constants/http-status";
import * as paymentService from "./payment.service";
import { CreateOrderInput } from "./payment.validation";

export async function createOrder(req: Request, res: Response) {
  const { amount } = req.body as CreateOrderInput;
  const order = await paymentService.createOrder(amount);
  res.status(STATUS_CODE.OK).json(order);
}
