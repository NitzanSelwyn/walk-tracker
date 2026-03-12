"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const fetchRoadNetwork = action({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    // Get area bounding box
    const area = await ctx.runQuery(api.areas.get, { areaId: args.areaId });
    if (!area) throw new Error("Area not found");

    // Check cache (30-day TTL)
    const cached = await ctx.runQuery(
      internal.roadNetworkHelpers.getCachedNetwork,
      { areaId: args.areaId }
    );
    if (cached && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
      return cached;
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

    // Build node lookup
    const nodes: Record<string, [number, number]> = {};
    for (const el of data.elements) {
      if (el.type === "node") {
        nodes[el.id] = [el.lon, el.lat];
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
      totalLengthKm += length;

      features.push({
        type: "Feature" as const,
        properties: {
          id: el.id,
          highway: el.tags?.highway ?? "unknown",
          name: el.tags?.name ?? "",
          lengthKm: length,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
      });
    }

    const geojson = JSON.stringify({
      type: "FeatureCollection",
      features,
    });

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
