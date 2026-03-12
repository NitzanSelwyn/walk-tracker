import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_areaId_coveragePercent", (q) => q.eq("areaId", args.areaId))
      .order("desc")
      .take(50);

    const enriched = await Promise.all(
      coverages.map(async (coverage, index) => {
        const user = await ctx.db.get(coverage.userId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", coverage.userId))
              .unique()
          : null;

        return {
          rank: index + 1,
          ...coverage,
          user: user ? { ...user, profile } : null,
        };
      })
    );

    return enriched;
  },
});
