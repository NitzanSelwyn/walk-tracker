"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon, Position } from "geojson";

interface ClipResult {
  publicGeojson: string | undefined;
  publicBoundingBox:
    | { minLat: number; maxLat: number; minLng: number; maxLng: number }
    | undefined;
  isHiddenByZone: boolean;
}

function zoneToTurfPolygon(
  zone: Doc<"privacyZones">,
): Feature<Polygon | MultiPolygon> | null {
  if (zone.zoneType === "circle" && zone.center && zone.radiusMeters) {
    return turf.circle(
      [zone.center.lng, zone.center.lat],
      zone.radiusMeters / 1000,
      { units: "kilometers", steps: 64 },
    );
  }
  if (zone.zoneType === "polygon" && zone.vertices && zone.vertices.length >= 3) {
    const coords = zone.vertices.map((v) => [v.lng, v.lat] as Position);
    coords.push([zone.vertices[0].lng, zone.vertices[0].lat]);
    return turf.polygon([coords]);
  }
  return null;
}

function clipRouteWithZones(
  geojsonStr: string,
  zones: Doc<"privacyZones">[],
  autoTrim: boolean,
): ClipResult {
  let fc: GeoJSON.FeatureCollection;
  try {
    fc = JSON.parse(geojsonStr);
  } catch {
    return { publicGeojson: undefined, publicBoundingBox: undefined, isHiddenByZone: false };
  }

  // Convert zones to turf polygons
  const zonePolygons: Feature<Polygon | MultiPolygon>[] = [];
  for (const zone of zones) {
    const poly = zoneToTurfPolygon(zone);
    if (poly) zonePolygons.push(poly);
  }

  // Auto-trim: if enabled and no zones, create 200m buffer at first/last coords
  if (autoTrim && zonePolygons.length === 0) {
    for (const feature of fc.features) {
      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates;
        if (coords.length >= 2) {
          const startBuf = turf.circle(coords[0], 0.2, { units: "kilometers", steps: 32 });
          const endBuf = turf.circle(coords[coords.length - 1], 0.2, { units: "kilometers", steps: 32 });
          zonePolygons.push(startBuf, endBuf);
        }
      }
    }
  }

  // No zones to clip — clear any previous clipping
  if (zonePolygons.length === 0) {
    return { publicGeojson: undefined, publicBoundingBox: undefined, isHiddenByZone: false };
  }

  // Union all zone polygons
  let unionPoly: Feature<Polygon | MultiPolygon>;
  if (zonePolygons.length === 1) {
    unionPoly = zonePolygons[0];
  } else {
    const result = turf.union(turf.featureCollection(zonePolygons));
    if (!result) {
      return { publicGeojson: undefined, publicBoundingBox: undefined, isHiddenByZone: false };
    }
    unionPoly = result;
  }

  // Clip each LineString feature
  const outsideFeatures: GeoJSON.Feature[] = [];

  for (const feature of fc.features) {
    if (feature.geometry.type !== "LineString") {
      outsideFeatures.push(feature);
      continue;
    }

    const coords = feature.geometry.coordinates;
    if (coords.length < 2) continue;

    // Walk coordinates, collect segments outside the zone
    const segments: Position[][] = [];
    let currentSegment: Position[] = [];

    for (let i = 0; i < coords.length; i++) {
      const pt = turf.point(coords[i]);
      const inside = turf.booleanPointInPolygon(pt, unionPoly);

      if (!inside) {
        // Point is outside the zone — add to current segment
        if (currentSegment.length === 0 && i > 0) {
          // Transition from inside→outside: find approximate boundary point
          const boundary = findBoundaryPoint(coords[i - 1], coords[i], unionPoly, false);
          if (boundary) currentSegment.push(boundary);
        }
        currentSegment.push(coords[i]);
      } else {
        // Point is inside the zone
        if (currentSegment.length > 0) {
          // Transition from outside→inside: find approximate boundary point
          const boundary = findBoundaryPoint(coords[i - 1], coords[i], unionPoly, true);
          if (boundary) currentSegment.push(boundary);
          if (currentSegment.length >= 2) {
            segments.push(currentSegment);
          }
          currentSegment = [];
        }
      }
    }
    // Flush remaining segment
    if (currentSegment.length >= 2) {
      segments.push(currentSegment);
    }

    // Convert segments to features
    for (const seg of segments) {
      outsideFeatures.push({
        type: "Feature",
        properties: feature.properties,
        geometry: { type: "LineString", coordinates: seg },
      });
    }
  }

  // All segments hidden
  if (outsideFeatures.length === 0) {
    return { publicGeojson: undefined, publicBoundingBox: undefined, isHiddenByZone: true };
  }

  // Build result FeatureCollection
  const resultFc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: outsideFeatures,
  };

  // Compute bounding box
  const bbox = turf.bbox(resultFc);
  const publicBoundingBox = {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3],
  };

  return {
    publicGeojson: JSON.stringify(resultFc),
    publicBoundingBox,
    isHiddenByZone: false,
  };
}

/**
 * Binary search for the approximate boundary crossing point between two coordinates.
 * `enteringZone` = true means we're going from outside to inside.
 */
function findBoundaryPoint(
  from: Position,
  to: Position,
  zone: Feature<Polygon | MultiPolygon>,
  enteringZone: boolean,
): Position | null {
  let a = from;
  let b = to;

  for (let i = 0; i < 8; i++) {
    const mid: Position = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const midInside = turf.booleanPointInPolygon(turf.point(mid), zone);

    if (enteringZone) {
      // from=outside, to=inside — we want the last outside point
      if (midInside) {
        b = mid;
      } else {
        a = mid;
      }
    } else {
      // from=inside, to=outside — we want the first outside point
      if (midInside) {
        a = mid;
      } else {
        b = mid;
      }
    }
  }

  // Return midpoint as the boundary approximation
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export const recomputeAllUserRoutes = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<void> => {
    const zones: Doc<"privacyZones">[] = await ctx.runQuery(
      internal.privacyZoneHelpers.getUserZones,
      { userId: args.userId },
    );

    const profile = await ctx.runQuery(
      internal.privacyZoneHelpers.getUserProfile,
      { userId: args.userId },
    );
    const autoTrim = profile?.autoTrimEnabled ?? false;

    const routes: Doc<"routes">[] = await ctx.runQuery(
      internal.privacyZoneHelpers.getUserRoutes,
      { userId: args.userId },
    );

    for (const route of routes) {
      const result = clipRouteWithZones(route.geojson, zones, autoTrim);
      await ctx.runMutation(internal.privacyZoneHelpers.updateRouteClipping, {
        routeId: route._id,
        publicGeojson: result.publicGeojson,
        publicBoundingBox: result.publicBoundingBox,
        isHiddenByZone: result.isHiddenByZone,
      });
    }
  },
});

export const clipSingleRoute = internalAction({
  args: {
    routeId: v.id("routes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<void> => {
    const zones: Doc<"privacyZones">[] = await ctx.runQuery(
      internal.privacyZoneHelpers.getUserZones,
      { userId: args.userId },
    );

    const profile = await ctx.runQuery(
      internal.privacyZoneHelpers.getUserProfile,
      { userId: args.userId },
    );
    const autoTrim = profile?.autoTrimEnabled ?? false;

    const route: Doc<"routes"> | null = await ctx.runQuery(
      internal.privacyZoneHelpers.getRoute,
      { routeId: args.routeId },
    );
    if (!route) return;

    const result = clipRouteWithZones(route.geojson, zones, autoTrim);
    await ctx.runMutation(internal.privacyZoneHelpers.updateRouteClipping, {
      routeId: args.routeId,
      publicGeojson: result.publicGeojson,
      publicBoundingBox: result.publicBoundingBox,
      isHiddenByZone: result.isHiddenByZone,
    });
  },
});
