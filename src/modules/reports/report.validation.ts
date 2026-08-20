import { z } from "zod";

export const createReportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  reportmessage: z.string().min(1),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
