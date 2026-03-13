import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getAllAreas = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("areas").collect();
  },
});

export const getActiveUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("routes").collect();
    const userIdSet = new Set<string>();
    for (const route of routes) {
      userIdSet.add(route.userId);
    }
    return [...userIdSet] as Id<"users">[];
  },
});

export const aggregateAreaStats = internalMutation({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_areaId_coveragePercent", (q) =>
        q.eq("areaId", args.areaId),
      )
      .collect();

    if (coverages.length === 0) {
      // Upsert empty stats
      const existing = await ctx.db
        .query("areaCoverageStats")
        .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
        .unique();

      const data = {
        areaId: args.areaId,
        walkerCount: 0,
        communityCoveragePercent: 0,
        totalCoveredKm: 0,
        totalRoadKm: 0,
        topContributors: [],
        calculatedAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("areaCoverageStats", data);
      }
      return;
    }

    // Filter out private users
    const publicCoverages = [];
    for (const c of coverages) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", c.userId))
        .unique();
      if (!profile || profile.isPublic) {
        publicCoverages.push(c);
      }
    }

    const totalRoadKm =
      publicCoverages.length > 0
        ? publicCoverages[0].totalLengthKm
        : coverages[0].totalLengthKm;

    let totalCoveredKm = 0;
    for (const c of publicCoverages) {
      totalCoveredKm += c.coveredLengthKm;
    }
    const maxCoverage =
      publicCoverages.length > 0
        ? Math.max(...publicCoverages.map((c) => c.coveragePercent))
        : 0;

    // Top 5 contributors
    const sorted = publicCoverages.sort(
      (a, b) => b.coveragePercent - a.coveragePercent,
    );
    const top5 = sorted.slice(0, 5);

    const topContributors = await Promise.all(
      top5.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", c.userId))
              .unique()
          : null;
        return {
          userId: c.userId,
          coveragePercent: c.coveragePercent,
          coveredKm: c.coveredLengthKm,
          displayName: profile?.displayName ?? user?.name ?? "User",
          image: user?.image ?? null,
        };
      }),
    );

    // Upsert into areaCoverageStats
    const existing = await ctx.db
      .query("areaCoverageStats")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .unique();

    const data = {
      areaId: args.areaId,
      walkerCount: publicCoverages.length,
      communityCoveragePercent: maxCoverage,
      totalCoveredKm: Math.min(totalCoveredKm, totalRoadKm),
      totalRoadKm,
      topContributors,
      calculatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("areaCoverageStats", data);
    }
  },
});
