"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { ErrorCode, throwAppError } from "./errorCodes";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import * as turf from "@turf/turf";

export async function computeCoverage(
  ctx: ActionCtx,
  args: { areaId: Id<"areas">; userId: Id<"users"> },
): Promise<{
  coveragePercent: number;
  coveredLengthKm: number;
  totalLengthKm: number;
}> {
  // Get road network
  const network: Doc<"roadNetworks"> | null = await ctx.runQuery(
    internal.roadNetworkHelpers.getCachedNetwork,
    { areaId: args.areaId }
  );
  if (!network) throwAppError(ErrorCode.NOT_FOUND_ROAD_NETWORK);

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

  // Fetch geojson from file storage
  const blob = await ctx.storage.get(network.geojsonStorageId);
  if (!blob) throwAppError(ErrorCode.NOT_FOUND_ROAD_NETWORK);
  const roadCollection = JSON.parse(await blob.text());

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

  // Simplify buffer if it has too many vertices (performance safeguard)
  let checkBuffer = mergedBuffer;
  try {
    const coords = turf.coordAll(mergedBuffer);
    if (coords.length > 5000) {
      const simplified = turf.simplify(mergedBuffer, { tolerance: 0.0001 });
      if (simplified) checkBuffer = simplified;
    }
  } catch {
    // Use unsimplified buffer
  }

  // Check each road's individual segments via midpoint-in-polygon
  let coveredLengthKm = 0;
  let coveredRoadCount = 0;

  for (const road of roadCollection.features) {
    try {
      const coords: [number, number][] =
        road.geometry.type === "MultiLineString"
          ? road.geometry.coordinates.flat()
          : road.geometry.coordinates;

      if (!coords || coords.length < 2) continue;

      let roadCoveredLength = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const midpoint = turf.midpoint(
          turf.point(coords[i]),
          turf.point(coords[i + 1]),
        );
        if (turf.booleanPointInPolygon(midpoint, checkBuffer)) {
          const segmentLength = turf.distance(
            turf.point(coords[i]),
            turf.point(coords[i + 1]),
            { units: "kilometers" },
          );
          roadCoveredLength += segmentLength;
        }
      }

      if (roadCoveredLength > 0) {
        coveredLengthKm += roadCoveredLength;
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
}

export const calculateCoverageInternal = internalAction({
  args: {
    areaId: v.id("areas"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await computeCoverage(ctx, args);
  },
});

export const calculateCoverage = action({
  args: {
    areaId: v.id("areas"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Only admins can trigger manual recalculation
    const role = await ctx.runQuery(internal.coverageHelpers.getUserRole, {
      userId: args.userId,
    });
    if (role !== "admin") throwAppError(ErrorCode.AUTH_NOT_ADMIN);

    const result = await computeCoverage(ctx, args);

    // Update community stats immediately
    await ctx.runMutation(internal.coverageCronHelpers.aggregateAreaStats, {
      areaId: args.areaId,
    });

    return result;
  },
});
