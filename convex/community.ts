import { query } from "./_generated/server";
import { v } from "convex/values";

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

    // Aggregate stats
    const totalRoadKm = coverages[0].totalLengthKm;
    let totalCoveredKm = 0;
    for (const c of coverages) {
      totalCoveredKm += c.coveredLengthKm;
    }
    // Community coverage is capped at 100% since different users may cover the same roads
    // We use max coverage as a rough proxy (union would require geo computation)
    const maxCoverage = Math.max(...coverages.map((c) => c.coveragePercent));

    // Top 5 contributors
    const sorted = coverages.sort(
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
      walkerCount: coverages.length,
      communityCoveragePercent: maxCoverage,
      totalCoveredKm: Math.min(totalCoveredKm, totalRoadKm),
      totalRoadKm,
      topContributors,
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

    // Fetch routes for each user that overlap with this area's bounding box
    const allRoutes: Array<{
      userId: string;
      geojson: string;
      color: string;
    }> = [];

    for (const userId of userIds) {
      const routes = await ctx.db
        .query("routes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      for (const route of routes) {
        if (!route.isPublic) continue;
        // Check rough bounding box overlap
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
