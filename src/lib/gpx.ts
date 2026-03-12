import { gpx } from "@mapbox/togeojson";
import * as turf from "@turf/turf";
import type { FeatureCollection } from "geojson";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ParsedRoute {
  geojson: FeatureCollection;
  name: string;
  distanceKm: number;
  boundingBox: BoundingBox;
  startedAt: number | undefined;
}

const ROUTE_COLORS = [
  "#e63946",
  "#457b9d",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#264653",
  "#6d6875",
  "#b5838d",
  "#e07a5f",
  "#81b29a",
  "#3d405b",
  "#f2cc8f",
  "#023047",
  "#fb8500",
  "#9b2226",
];

export function generateRouteColor(): string {
  return ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)];
}

export function parseGpx(gpxText: string): ParsedRoute {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file");
  }

  const geojson = gpx(doc);

  if (!geojson.features || geojson.features.length === 0) {
    throw new Error("No tracks found in GPX file");
  }

  const distanceKm = calculateTotalDistance(geojson);

  const bbox = turf.bbox(geojson);
  const boundingBox: BoundingBox = {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3],
  };

  const name = extractName(geojson, doc);
  const startedAt = extractStartTime(geojson);

  return { geojson, name, distanceKm, boundingBox, startedAt };
}

function calculateTotalDistance(geojson: FeatureCollection): number {
  let totalKm = 0;
  for (const feature of geojson.features) {
    if (
      feature.geometry.type === "LineString" ||
      feature.geometry.type === "MultiLineString"
    ) {
      totalKm += turf.length(feature, { units: "kilometers" });
    }
  }
  return Math.round(totalKm * 100) / 100;
}

function extractName(geojson: FeatureCollection, doc: Document): string {
  for (const feature of geojson.features) {
    if (feature.properties?.name) return feature.properties.name;
  }
  const nameEl =
    doc.querySelector("metadata > name") || doc.querySelector("trk > name");
  if (nameEl?.textContent) return nameEl.textContent;

  return `Route ${new Date().toLocaleDateString()}`;
}

function extractStartTime(geojson: FeatureCollection): number | undefined {
  for (const feature of geojson.features) {
    if (feature.properties?.coordTimes) {
      const times = feature.properties.coordTimes;
      if (Array.isArray(times) && times.length > 0) {
        const ts = new Date(times[0]).getTime();
        if (!isNaN(ts)) return ts;
      }
    }
    if (feature.properties?.time) {
      const ts = new Date(feature.properties.time).getTime();
      if (!isNaN(ts)) return ts;
    }
  }
  return undefined;
}
