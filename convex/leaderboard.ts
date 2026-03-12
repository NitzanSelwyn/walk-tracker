import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_areaId_coveragePercent", (q) => q.eq("areaId", args.areaId))
      .order("desc")
      .take(200);

    const enriched = [];
    for (const coverage of coverages) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", coverage.userId))
        .unique();

      if (profile && !profile.isPublic) continue;

      const user = await ctx.db.get(coverage.userId);

      enriched.push({
        rank: enriched.length + 1,
        ...coverage,
        user: user ? { ...user, profile } : null,
      });
    }

    return enriched.slice(0, 50);
  },
});
