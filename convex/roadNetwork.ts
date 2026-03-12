"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
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
    if (!area) throw new Error("Area not found");

    // Check cache (30-day TTL)
    const cached: Doc<"roadNetworks"> | null = await ctx.runQuery(
      internal.roadNetworkHelpers.getCachedNetwork,
      { areaId: args.areaId }
    );
    if (cached && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
      return {
        geojson: cached.geojson,
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

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    // Build node lookup — round coords to 5 decimal places (~1.1m accuracy)
    const nodes: Record<string, [number, number]> = {};
    for (const el of data.elements) {
      if (el.type === "node") {
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
      if (el.type !== "way") continue;
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

    // Store in cache
    if (cached) {
      await ctx.runMutation(
        internal.roadNetworkHelpers.updateCachedNetwork,
        {
          networkId: cached._id,
          geojson,
          totalLengthKm,
          roadCount: features.length,
        }
      );
    } else {
      await ctx.runMutation(
        internal.roadNetworkHelpers.storeCachedNetwork,
        {
          areaId: args.areaId,
          geojson,
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
