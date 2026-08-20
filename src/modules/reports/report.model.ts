import mongoose, { Document, Schema } from "mongoose";

export interface IReportProblem extends Document {
  firstName: string;
  lastName: string;
  email: string;
  reportmessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportProblemSchema = new Schema<IReportProblem>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    reportmessage: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// Backs hasReportedRecently's `{ email, createdAt: { $gte: cutoff } }` query
// (report.service.ts) — without this, that lookup is a full collection scan.
reportProblemSchema.index({ email: 1, createdAt: 1 });

export const ReportProblem = mongoose.model<IReportProblem>(
  "report",
  reportProblemSchema,
);
