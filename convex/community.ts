import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getAreaStats = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_areaId_coveragePercent", (q) =>
        q.eq("areaId", args.areaId),
      )
      .collect();

    if (coverages.length === 0) {
      return {
        walkerCount: 0,
        communityCoveragePercent: 0,
        totalCoveredKm: 0,
        totalRoadKm: 0,
        topContributors: [],
      };
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

    if (publicCoverages.length === 0) {
      return {
        walkerCount: 0,
        communityCoveragePercent: 0,
        totalCoveredKm: 0,
        totalRoadKm: coverages[0].totalLengthKm,
        topContributors: [],
      };
    }

    // Aggregate stats
    const totalRoadKm = publicCoverages[0].totalLengthKm;
    let totalCoveredKm = 0;
    for (const c of publicCoverages) {
      totalCoveredKm += c.coveredLengthKm;
    }
    const maxCoverage = Math.max(
      ...publicCoverages.map((c) => c.coveragePercent),
    );

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

    return {
      walkerCount: publicCoverages.length,
      communityCoveragePercent: maxCoverage,
      totalCoveredKm: Math.min(totalCoveredKm, totalRoadKm),
      totalRoadKm,
      topContributors,
    };
  },
});

export const getAreaStatsCached = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("areaCoverageStats")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .unique();

    if (!cached) return null;

    return {
      walkerCount: cached.walkerCount,
      communityCoveragePercent: cached.communityCoveragePercent,
      totalCoveredKm: cached.totalCoveredKm,
      totalRoadKm: cached.totalRoadKm,
      topContributors: cached.topContributors,
      calculatedAt: cached.calculatedAt,
    };
  },
});

export const getAllPublicRoutes = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const area = await ctx.db.get(args.areaId);
    if (!area) return [];

    const bb = area.boundingBox;

    // Get all coverage entries for this area to find active users
    const coverages = await ctx.db
      .query("userCoverage")
      .withIndex("by_areaId_coveragePercent", (q) =>
        q.eq("areaId", args.areaId),
      )
      .collect();

    const userIds = coverages.map((c) => c.userId);

    // Build set of public user IDs
    const publicUserIds = new Set<Id<"users">>();
    for (const uid of userIds) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", uid))
        .unique();
      if (!profile || profile.isPublic) {
        publicUserIds.add(uid);
      }
    }

    // Fetch routes for each public user that overlap with this area's bounding box
    const allRoutes: Array<{
      userId: string;
      geojson: string;
      color: string;
    }> = [];

    for (const userId of publicUserIds) {
      const routes = await ctx.db
        .query("routes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      for (const route of routes) {
        if (!route.isPublic) continue;
        const rbb = route.boundingBox;
        const overlaps =
          rbb.maxLat >= bb.minLat &&
          rbb.minLat <= bb.maxLat &&
          rbb.maxLng >= bb.minLng &&
          rbb.minLng <= bb.maxLng;
        if (overlaps) {
          allRoutes.push({
            userId: route.userId,
            geojson: route.geojson,
            color: route.color,
          });
        }
      }
    }

    return allRoutes;
  },
});
