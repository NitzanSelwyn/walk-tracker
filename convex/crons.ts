import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily coverage recalculation at 2:00 AM UTC (4-5 AM Israel time)
crons.cron(
  "recalculate all coverage",
  "0 2 * * *",
  internal.coverageCron.recalculateAllCoverage,
  {},
);

export default crons;
