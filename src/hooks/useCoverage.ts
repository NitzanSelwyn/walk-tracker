import { useMemo } from "react";

interface Route {
  geojson: string;
}

/**
 * Computes which road segments are covered by user routes using a fast
 * grid-based spatial index. Returns a GeoJSON FeatureCollection containing
 * only the covered sub-LineStrings (with run-length merging for performance).
 */
export function useCoveredSegments(
  roadNetworkGeojson: string | undefined,
  routes: Route[],
): GeoJSON.FeatureCollection | null {
  return useMemo(() => {
    if (!roadNetworkGeojson || routes.length === 0) return null;

    // ~20m in degrees at mid-latitudes
    const cellSize = 0.0002;

    // Build grid index of all route coordinates
    const grid = new Set<string>();
    for (const route of routes) {
      try {
        const geojson = JSON.parse(route.geojson);
        for (const feature of geojson.features) {
          const coords = extractCoords(feature.geometry);
          for (const [lng, lat] of coords) {
            const cx = Math.floor(lng / cellSize);
            const cy = Math.floor(lat / cellSize);
            grid.add(`${cx},${cy}`);
          }
        }
      } catch {
        // Skip invalid routes
      }
    }

    if (grid.size === 0) return null;

    // Check each road's segments against the grid
    const roadNetwork = JSON.parse(roadNetworkGeojson);
    const features: GeoJSON.Feature[] = [];

    for (const road of roadNetwork.features) {
      const coords: [number, number][] = extractCoords(road.geometry);
      if (coords.length < 2) continue;

      // Walk segments, collecting runs of covered consecutive segments
      let runStart: number | null = null;

      for (let i = 0; i < coords.length - 1; i++) {
        const midLng = (coords[i][0] + coords[i + 1][0]) / 2;
        const midLat = (coords[i][1] + coords[i + 1][1]) / 2;
        const cx = Math.floor(midLng / cellSize);
        const cy = Math.floor(midLat / cellSize);

        let covered = false;
        for (let dx = -1; dx <= 1 && !covered; dx++) {
          for (let dy = -1; dy <= 1 && !covered; dy++) {
            if (grid.has(`${cx + dx},${cy + dy}`)) {
              covered = true;
            }
          }
        }

        if (covered) {
          if (runStart === null) runStart = i;
        } else {
          // End of a covered run — flush it
          if (runStart !== null) {
            features.push(makeLineFeature(coords, runStart, i));
            runStart = null;
          }
        }
      }

      // Flush final run
      if (runStart !== null) {
        features.push(makeLineFeature(coords, runStart, coords.length - 1));
      }
    }

    if (features.length === 0) return null;

    return { type: "FeatureCollection" as const, features };
  }, [roadNetworkGeojson, routes]);
}

/** Build a LineString feature from coords[startIdx] through coords[endIdx]. */
function makeLineFeature(
  coords: [number, number][],
  startIdx: number,
  endIdx: number,
): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: coords.slice(startIdx, endIdx + 1),
    },
  };
}

function extractCoords(
  geometry: { type: string; coordinates: unknown },
): [number, number][] {
  if (geometry.type === "LineString") {
    return geometry.coordinates as [number, number][];
  }
  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates as [number, number][][]).flat();
  }
  return [];
}
