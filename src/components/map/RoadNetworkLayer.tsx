import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface Props {
  roadNetworkGeojson: string;
  coveredRoadIds: Set<number>;
}

export default function RoadNetworkLayer({
  roadNetworkGeojson,
  coveredRoadIds,
}: Props) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    // Remove previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    let geojson: GeoJSON.FeatureCollection;
    try {
      geojson = JSON.parse(roadNetworkGeojson);
    } catch {
      return;
    }

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const isCovered = coveredRoadIds.has(feature?.properties?.id);
        return isCovered
          ? { color: "#22c55e", weight: 3, opacity: 0.9 }
          : { color: "#9ca3af", weight: 1, opacity: 0.3 };
      },
      onEachFeature: (feature, featureLayer) => {
        if (feature.properties?.name) {
          featureLayer.bindPopup(feature.properties.name);
        }
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, roadNetworkGeojson, coveredRoadIds]);

  return null;
}
