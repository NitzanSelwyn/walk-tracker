import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface Props {
  roadNetworkGeojson: string;
  coveredSegments: GeoJSON.FeatureCollection | null;
}

export default function RoadNetworkLayer({
  roadNetworkGeojson,
  coveredSegments,
}: Props) {
  const map = useMap();
  const baseLayerRef = useRef<L.GeoJSON | null>(null);
  const coverageLayerRef = useRef<L.GeoJSON | null>(null);

  // Base layer: all roads in gray
  useEffect(() => {
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }

    let geojson: GeoJSON.FeatureCollection;
    try {
      geojson = JSON.parse(roadNetworkGeojson);
    } catch {
      return;
    }

    const layer = L.geoJSON(geojson, {
      style: () => ({ color: "#9ca3af", weight: 1, opacity: 0.3 }),
      onEachFeature: (feature, featureLayer) => {
        if (feature.properties?.name) {
          featureLayer.bindPopup(feature.properties.name);
        }
      },
    });

    layer.addTo(map);
    baseLayerRef.current = layer;

    return () => {
      if (baseLayerRef.current) {
        map.removeLayer(baseLayerRef.current);
        baseLayerRef.current = null;
      }
    };
  }, [map, roadNetworkGeojson]);

  // Coverage overlay: covered segments in green
  useEffect(() => {
    if (coverageLayerRef.current) {
      map.removeLayer(coverageLayerRef.current);
      coverageLayerRef.current = null;
    }

    if (!coveredSegments || coveredSegments.features.length === 0) return;

    const layer = L.geoJSON(coveredSegments, {
      style: () => ({ color: "#22c55e", weight: 3, opacity: 0.9 }),
      interactive: false,
    });

    layer.addTo(map);
    coverageLayerRef.current = layer;

    return () => {
      if (coverageLayerRef.current) {
        map.removeLayer(coverageLayerRef.current);
        coverageLayerRef.current = null;
      }
    };
  }, [map, coveredSegments]);

  return null;
}
