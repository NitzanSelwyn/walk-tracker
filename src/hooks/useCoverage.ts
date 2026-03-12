import { useMemo } from "react";

interface Route {
  geojson: string;
}

/**
 * Computes which roads are covered by user routes using a fast
 * grid-based spatial index. Each route coordinate is bucketed into
 * a grid cell (~20m). A road is "covered" if any of its coordinates
 * falls in or near a cell containing a route coordinate.
 */
export function useCoveredRoadIds(
  roadNetworkGeojson: string | undefined,
  routes: Route[],
): Set<number> {
  return useMemo(() => {
    if (!roadNetworkGeojson || routes.length === 0) return new Set<number>();

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

    if (grid.size === 0) return new Set<number>();

    // Check each road against the grid
    const roadNetwork = JSON.parse(roadNetworkGeojson);
    const covered = new Set<number>();

    for (const road of roadNetwork.features) {
      const coords = extractCoords(road.geometry);
      let found = false;
      for (const [lng, lat] of coords) {
        if (found) break;
        const cx = Math.floor(lng / cellSize);
        const cy = Math.floor(lat / cellSize);
        // Check this cell and 8 adjacent cells
        for (let dx = -1; dx <= 1 && !found; dx++) {
          for (let dy = -1; dy <= 1 && !found; dy++) {
            if (grid.has(`${cx + dx},${cy + dy}`)) {
              found = true;
            }
          }
        }
      }
      if (found) {
        covered.add(road.properties?.id);
      }
    }

    return covered;
  }, [roadNetworkGeojson, routes]);
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
