import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUserCoverage = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userCoverage")
      .withIndex("by_userId_areaId", (q) =>
        q.eq("userId", userId).eq("areaId", args.areaId)
      )
      .unique();
  },
});

export const getUserCoverages = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_userId_areaId", (q) => q.eq("userId", args.userId))
      .collect();

    const enriched = await Promise.all(
      coverages.map(async (c) => {
        const area = await ctx.db.get(c.areaId);
        return {
          ...c,
          areaName: area?.name ?? "Unknown",
          areaNameHe: area?.nameHe,
        };
      })
    );

    return enriched.sort((a, b) => b.coveragePercent - a.coveragePercent);
  },
});

export const getCachedRoadNetwork = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roadNetworks")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .unique();
  },
});
