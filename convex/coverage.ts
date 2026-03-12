"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import * as turf from "@turf/turf";

export const calculateCoverage = action({
  args: {
    areaId: v.id("areas"),
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    coveragePercent: number;
    coveredLengthKm: number;
    totalLengthKm: number;
  }> => {
    // Get road network
    const network: Doc<"roadNetworks"> | null = await ctx.runQuery(
      internal.roadNetworkHelpers.getCachedNetwork,
      { areaId: args.areaId }
    );
    if (!network) throw new Error("Road network not loaded. Fetch it first.");

    // Get user routes
    const routes: Doc<"routes">[] = await ctx.runQuery(
      internal.coverageHelpers.getUserRoutes,
      { userId: args.userId },
    );

    if (routes.length === 0) {
      await ctx.runMutation(internal.coverageHelpers.storeCoverage, {
        userId: args.userId,
        areaId: args.areaId,
        coveredLengthKm: 0,
        totalLengthKm: network.totalLengthKm,
        coveragePercent: 0,
        coveredRoadCount: 0,
        totalRoadCount: network.roadCount,
      });
      return {
        coveragePercent: 0,
        coveredLengthKm: 0,
        totalLengthKm: network.totalLengthKm,
      };
    }

    const roadCollection = JSON.parse(network.geojson);

    // Create buffer around all user routes (20m)
    const routeBuffers = [];
    for (const route of routes) {
      try {
        const geojson = JSON.parse(route.geojson);
        for (const feature of geojson.features) {
          if (
            feature.geometry.type === "LineString" ||
            feature.geometry.type === "MultiLineString"
          ) {
            const buffer = turf.buffer(feature, 0.02, { units: "kilometers" });
            if (buffer) routeBuffers.push(buffer);
          }
        }
      } catch {
        // Skip invalid routes
      }
    }

    if (routeBuffers.length === 0) {
      await ctx.runMutation(internal.coverageHelpers.storeCoverage, {
        userId: args.userId,
        areaId: args.areaId,
        coveredLengthKm: 0,
        totalLengthKm: network.totalLengthKm,
        coveragePercent: 0,
        coveredRoadCount: 0,
        totalRoadCount: network.roadCount,
      });
      return {
        coveragePercent: 0,
        coveredLengthKm: 0,
        totalLengthKm: network.totalLengthKm,
      };
    }

    // Merge all route buffers into one polygon
    let mergedBuffer = routeBuffers[0];
    for (let i = 1; i < routeBuffers.length; i++) {
      try {
        const result = turf.union(
          turf.featureCollection([mergedBuffer, routeBuffers[i]])
        );
        if (result) mergedBuffer = result;
      } catch {
        // Skip union errors
      }
    }

    // Check each road segment for intersection
    let coveredLengthKm = 0;
    let coveredRoadCount = 0;

    for (const road of roadCollection.features) {
      try {
        if (turf.booleanIntersects(road, mergedBuffer)) {
          coveredLengthKm += road.properties.lengthKm ?? 0;
          coveredRoadCount++;
        }
      } catch {
        // Skip invalid geometries
      }
    }

    const coveragePercent =
      network.totalLengthKm > 0
        ? Math.round((coveredLengthKm / network.totalLengthKm) * 10000) / 100
        : 0;

    await ctx.runMutation(internal.coverageHelpers.storeCoverage, {
      userId: args.userId,
      areaId: args.areaId,
      coveredLengthKm,
      totalLengthKm: network.totalLengthKm,
      coveragePercent,
      coveredRoadCount,
      totalRoadCount: network.roadCount,
    });

    return {
      coveragePercent,
      coveredLengthKm,
      totalLengthKm: network.totalLengthKm,
    };
  },
});
