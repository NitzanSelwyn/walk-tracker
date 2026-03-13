"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

export const recalculateAllCoverage = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const areas: Doc<"areas">[] = await ctx.runQuery(
      internal.coverageCronHelpers.getAllAreas,
      {},
    );

    for (const area of areas) {
      await ctx.runAction(internal.coverageCron.recalculateAreaCoverage, {
        areaId: area._id,
      });
    }
  },
});

export const recalculateAreaCoverage = internalAction({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args): Promise<void> => {
    // Check if road network exists for this area
    const network: Doc<"roadNetworks"> | null = await ctx.runQuery(
      internal.roadNetworkHelpers.getCachedNetwork,
      { areaId: args.areaId },
    );
    if (!network) {
      // No road network fetched yet, skip this area
      return;
    }

    // Get all users who have routes
    const userIds = await ctx.runQuery(
      internal.coverageCronHelpers.getActiveUserIds,
      {},
    );

    // Calculate coverage for each user in this area
    for (const userId of userIds) {
      try {
        await ctx.runAction(internal.coverage.calculateCoverageInternal, {
          areaId: args.areaId,
          userId,
        });
      } catch (e) {
        console.error(
          `Failed to calculate coverage for user ${userId} in area ${args.areaId}:`,
          e,
        );
      }
    }

    // Aggregate community stats for this area
    await ctx.runMutation(internal.coverageCronHelpers.aggregateAreaStats, {
      areaId: args.areaId,
    });
  },
});
