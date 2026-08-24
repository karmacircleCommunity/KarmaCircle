import { Router } from "express";
import userRoutes from "../modules/users/user.routes";
import reportRoutes from "../modules/reports/report.routes";
import authRoutes from "../modules/auth/auth.routes";
import organizationRoutes from "../modules/organizations/organization.routes";
import directoryRoutes from "../modules/directory/directory.routes";
import paymentRoutes from "../modules/payments/payment.routes";
import productRoutes from "../modules/products/product.routes";
import eventRoutes from "../modules/events/event.routes";

const router = Router();

router.use("/user", userRoutes);
router.use("/user", reportRoutes);
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/display", directoryRoutes);
router.use("/payment", paymentRoutes);
router.use("/product", productRoutes);
router.use("/events", eventRoutes);

export default router;
