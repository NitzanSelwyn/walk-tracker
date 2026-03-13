import { Circle, Polygon } from "react-leaflet";
import type { Doc } from "../../../convex/_generated/dataModel";

interface Props {
  zones: Doc<"privacyZones">[];
}

const zoneStyle = {
  color: "#4f46e5",
  weight: 2,
  opacity: 0.6,
  fillColor: "#4f46e5",
  fillOpacity: 0.08,
  dashArray: "8 6",
};

export default function PrivacyZoneOverlay({ zones }: Props) {
  return (
    <>
      {zones.map((zone) => {
        if (zone.zoneType === "circle" && zone.center && zone.radiusMeters) {
          return (
            <Circle
              key={zone._id}
              center={[zone.center.lat, zone.center.lng]}
              radius={zone.radiusMeters}
              pathOptions={zoneStyle}
            />
          );
        }
        if (zone.zoneType === "polygon" && zone.vertices && zone.vertices.length >= 3) {
          return (
            <Polygon
              key={zone._id}
              positions={zone.vertices.map((v) => [v.lat, v.lng] as [number, number])}
              pathOptions={zoneStyle}
            />
          );
        }
        return null;
      })}
    </>
  );
}
