"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { ErrorCode, throwAppError } from "./errorCodes";
import type { Doc } from "./_generated/dataModel";
import * as turf from "@turf/turf";

export const fetchRoadNetwork = action({
  args: { areaId: v.id("areas") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    geojson: string;
    totalLengthKm: number;
    roadCount: number;
  }> => {
    // Get area bounding box
    const area: Doc<"areas"> | null = await ctx.runQuery(api.areas.get, {
      areaId: args.areaId,
    });
    if (!area) throwAppError(ErrorCode.NOT_FOUND_AREA);

    // Check cache (30-day TTL)
    const cached: Doc<"roadNetworks"> | null = await ctx.runQuery(
      internal.roadNetworkHelpers.getCachedNetwork,
      { areaId: args.areaId }
    );
    if (cached && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
      const blob = await ctx.storage.get(cached.geojsonStorageId);
      if (!blob) throwAppError(ErrorCode.NOT_FOUND_ROAD_NETWORK);
      const geojson = await blob.text();
      return {
        geojson,
        totalLengthKm: cached.totalLengthKm,
        roadCount: cached.roadCount,
      };
    }

    const { minLat, minLng, maxLat, maxLng } = area.boundingBox;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    const query = `
      [out:json][timeout:60];
      (
        way["highway"~"^(residential|footway|path|pedestrian|living_street|tertiary|secondary|primary|trunk|unclassified|service|track|cycleway|steps)$"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;

    let data: { elements: Array<{ type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }> };
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      if (response.status >= 500 && attempt < maxRetries - 1) {
        // Wait 5s, 15s before retrying on server errors
        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }

      throwAppError(ErrorCode.EXTERNAL_OVERPASS_API);
    }
    // TypeScript: data is guaranteed assigned since loop either breaks or throws
    data = data!;

    // Build node lookup — round coords to 5 decimal places (~1.1m accuracy)
    const nodes: Record<string, [number, number]> = {};
    for (const el of data.elements) {
      if (el.type === "node" && el.lon !== undefined && el.lat !== undefined) {
        nodes[el.id] = [
          Math.round(el.lon * 1e5) / 1e5,
          Math.round(el.lat * 1e5) / 1e5,
        ];
      }
    }

    // Convert ways to GeoJSON
    const features = [];
    let totalLengthKm = 0;

    for (const el of data.elements) {
      if (el.type !== "way" || !el.nodes) continue;
      const coords = el.nodes
        .map((nid: number) => nodes[nid])
        .filter(Boolean);
      if (coords.length < 2) continue;

      // Calculate length using Haversine
      let length = 0;
      for (let i = 1; i < coords.length; i++) {
        length += haversine(coords[i - 1], coords[i]);
      }
      // Skip very short segments (< 5m) as noise
      if (length < 0.005) continue;
      totalLengthKm += length;

      // Build compact properties — omit empty name
      const props: Record<string, unknown> = {
        id: el.id,
        highway: el.tags?.highway ?? "unknown",
        lengthKm: Math.round(length * 1000) / 1000,
      };
      if (el.tags?.name) props.name = el.tags.name;

      features.push({
        type: "Feature" as const,
        properties: props,
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
      });
    }

    // Simplify geometries if the collection is too large (> 800KB target)
    let fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: features as GeoJSON.Feature[],
    };
    let geojson = JSON.stringify(fc);

    if (geojson.length > 800_000) {
      fc = turf.simplify(fc, {
        tolerance: 0.00005,
        highQuality: true,
      }) as GeoJSON.FeatureCollection;
      geojson = JSON.stringify(fc);
    }

    // Store geojson in file storage
    const blob = new Blob([geojson], { type: "application/json" });
    const storageId = await ctx.storage.store(blob);

    // Store/update cache record
    if (cached) {
      await ctx.runMutation(
        internal.roadNetworkHelpers.updateCachedNetwork,
        {
          networkId: cached._id,
          geojsonStorageId: storageId,
          oldStorageId: cached.geojsonStorageId,
          totalLengthKm,
          roadCount: features.length,
        }
      );
    } else {
      await ctx.runMutation(
        internal.roadNetworkHelpers.storeCachedNetwork,
        {
          areaId: args.areaId,
          geojsonStorageId: storageId,
          totalLengthKm,
          roadCount: features.length,
        }
      );
    }

    // Update area total road length
    await ctx.runMutation(
      internal.roadNetworkHelpers.updateAreaRoadLength,
      {
        areaId: args.areaId,
        totalRoadLengthKm: totalLengthKm,
      }
    );

    return { geojson, totalLengthKm, roadCount: features.length };
  },
});

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
