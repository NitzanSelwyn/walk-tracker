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

// Daily platform stats computation at 2:05 AM UTC (after coverage recalc)
crons.cron(
  "compute platform stats",
  "5 2 * * *",
  internal.platformStatsCron.computePlatformStats,
  {},
);

export default crons;
