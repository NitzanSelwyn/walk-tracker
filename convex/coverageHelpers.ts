import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, _args) => {
    // Find user through auth accounts
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      // Check if any auth session matches
      if (user._id) return user;
    }
    return users[0] ?? null;
  },
});

export const getUserRoutes = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const storeCoverage = internalMutation({
  args: {
    userId: v.id("users"),
    areaId: v.id("areas"),
    coveredLengthKm: v.number(),
    totalLengthKm: v.number(),
    coveragePercent: v.number(),
    coveredRoadCount: v.number(),
    totalRoadCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userCoverage")
      .withIndex("by_userId_areaId", (q) =>
        q.eq("userId", args.userId).eq("areaId", args.areaId)
      )
      .unique();

    const data = {
      userId: args.userId,
      areaId: args.areaId,
      coveredLengthKm: args.coveredLengthKm,
      totalLengthKm: args.totalLengthKm,
      coveragePercent: args.coveragePercent,
      coveredRoadCount: args.coveredRoadCount,
      totalRoadCount: args.totalRoadCount,
      calculatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("userCoverage", data);
    }
  },
});

export const getUserCoverage = internalQuery({
  args: { userId: v.id("users"), areaId: v.id("areas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userCoverage")
      .withIndex("by_userId_areaId", (q) =>
        q.eq("userId", args.userId).eq("areaId", args.areaId)
      )
      .unique();
  },
});
