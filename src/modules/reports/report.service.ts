import { IReportProblem, ReportProblem } from "./report.model";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;

export async function hasReportedRecently(email: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_MS);
  const recentReport = await ReportProblem.findOne({
    email,
    createdAt: { $gte: cutoff },
  });

  return recentReport !== null;
}

export async function createReport(data: {
  firstName: string;
  lastName: string;
  email: string;
  reportmessage: string;
}): Promise<IReportProblem> {
  const report = new ReportProblem(data);
  return report.save();
}
