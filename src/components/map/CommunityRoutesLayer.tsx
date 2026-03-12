import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface CommunityRoute {
  userId: string;
  geojson: string;
  color: string;
}

interface Props {
  routes: CommunityRoute[];
}

export default function CommunityRoutesLayer({ routes }: Props) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (routes.length === 0) return;

    const group = L.layerGroup();

    for (const route of routes) {
      try {
        const geojson = JSON.parse(route.geojson);
        L.geoJSON(geojson, {
          style: {
            color: route.color,
            weight: 2,
            opacity: 0.6,
          },
        }).addTo(group);
      } catch {
        // Skip invalid GeoJSON
      }
    }

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, routes]);

  return null;
}
