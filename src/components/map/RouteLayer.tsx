import { GeoJSON } from "react-leaflet";
import type { FeatureCollection } from "geojson";
import type { PathOptions } from "leaflet";

export interface RouteData {
  _id: string;
  geojson: string;
  color: string;
  name: string;
}

interface Props {
  routes: RouteData[];
  visibleIds: Set<string>;
  styleOverride?: PathOptions;
}

export default function RouteLayer({ routes, visibleIds, styleOverride }: Props) {
  return (
    <>
      {routes
        .filter((r) => visibleIds.has(r._id))
        .map((route) => {
          let geojson: FeatureCollection;
          try {
            geojson = JSON.parse(route.geojson);
          } catch {
            return null;
          }
          return (
            <GeoJSON
              key={route._id + route.color}
              data={geojson}
              style={() =>
                styleOverride ?? {
                  color: route.color,
                  weight: 3,
                  opacity: 0.85,
                }
              }
              onEachFeature={(_, layer) => {
                layer.bindPopup(
                  `<strong>${route.name}</strong>`,
                );
              }}
            />
          );
        })}
    </>
  );
}
