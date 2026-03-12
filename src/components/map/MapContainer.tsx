import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect, type ReactNode } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import "../../lib/leafletSetup";

// Default center: roughly center of Israel
const DEFAULT_CENTER: [number, number] = [31.5, 34.8];
const DEFAULT_ZOOM = 8;

interface Props {
  flyToBounds?: LatLngBoundsExpression;
  children?: ReactNode;
}

function FlyToHandler({ bounds }: { bounds?: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, bounds]);
  return null;
}

export default function MapContainer({ flyToBounds, children }: Props) {
  return (
    <LeafletMapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full z-0"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToHandler bounds={flyToBounds} />
      {children}
    </LeafletMapContainer>
  );
}
