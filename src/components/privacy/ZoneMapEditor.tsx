import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Circle,
  Polygon,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import "../../lib/leafletSetup";
import type { Doc } from "../../../convex/_generated/dataModel";
import PrivacyZoneOverlay from "./PrivacyZoneOverlay";

type ZoneType = "circle" | "polygon";

interface Props {
  existingZones: Doc<"privacyZones">[];
  editingZone?: Doc<"privacyZones">;
  onSave: (data: {
    name: string;
    zoneType: ZoneType;
    center?: { lat: number; lng: number };
    radiusMeters?: number;
    vertices?: { lat: number; lng: number }[];
  }) => void;
  onCancel: () => void;
  saving: boolean;
}

const DEFAULT_CENTER: [number, number] = [31.5, 34.8];
const DEFAULT_ZOOM = 13;
const RADIUS_OPTIONS = [200, 500, 1000];

function CirclePlacer({
  onPlace,
}: {
  onPlace: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PolygonDrawer({
  onDraw,
}: {
  onDraw: (vertices: { lat: number; lng: number }[]) => void;
}) {
  const map = useMap();
  const handlerRef = useRef<L.Draw.Polygon | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = new L.Draw.Polygon(map as any, {
      shapeOptions: {
        color: "#4f46e5",
        weight: 2,
        fillOpacity: 0.1,
        dashArray: "8 6",
      },
    });
    handler.enable();
    handlerRef.current = handler;

    const onCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer as L.Polygon;
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      onDraw(latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng })));
      map.removeLayer(layer);
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      handler.disable();
      map.off(L.Draw.Event.CREATED, onCreated);
    };
  }, [map, onDraw]);

  return null;
}

export default function ZoneMapEditor({
  existingZones,
  editingZone,
  onSave,
  onCancel,
  saving,
}: Props) {
  const { t } = useTranslation();

  // Shape picker state
  const [zoneType, setZoneType] = useState<ZoneType | null>(
    editingZone?.zoneType ?? null,
  );

  const [name, setName] = useState(editingZone?.name ?? "");
  const [radius, setRadius] = useState(editingZone?.radiusMeters ?? 500);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    editingZone?.center ?? null,
  );
  const [vertices, setVertices] = useState<{ lat: number; lng: number }[]>(
    editingZone?.vertices ?? [],
  );

  const handleCirclePlace = useCallback((lat: number, lng: number) => {
    setCenter({ lat, lng });
  }, []);

  const handlePolygonDraw = useCallback(
    (verts: { lat: number; lng: number }[]) => {
      setVertices(verts);
    },
    [],
  );

  const handleSave = () => {
    if (!name.trim()) return;
    if (zoneType === "circle") {
      if (!center) return;
      onSave({ name: name.trim(), zoneType: "circle", center, radiusMeters: radius });
    } else if (zoneType === "polygon") {
      if (vertices.length < 3) return;
      onSave({ name: name.trim(), zoneType: "polygon", vertices });
    }
  };

  const handleClearPolygon = () => {
    setVertices([]);
  };

  const canSave =
    name.trim() &&
    ((zoneType === "circle" && center) ||
      (zoneType === "polygon" && vertices.length >= 3));

  // Shape picker (before choosing type)
  if (!zoneType) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">
          {t("settings.chooseShape")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setZoneType("circle")}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-200 p-4 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
          >
            <svg
              className="h-8 w-8 text-indigo-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {t("settings.circle")}
            </span>
            <span className="text-xs text-gray-500">
              {t("settings.circleDesc")}
            </span>
          </button>
          <button
            onClick={() => setZoneType("polygon")}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-200 p-4 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
          >
            <svg
              className="h-8 w-8 text-indigo-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="12,2 22,8 18,22 6,22 2,8" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {t("settings.polygon")}
            </span>
            <span className="text-xs text-gray-500">
              {t("settings.polygonDesc")}
            </span>
          </button>
        </div>
        <button
          onClick={onCancel}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t("common.cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name input */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t("settings.zoneName")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("settings.zoneNamePlaceholder")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Radius selector for circles */}
      {zoneType === "circle" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t("settings.radius")}
          </label>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  radius === r
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r >= 1000 ? `${r / 1000} km` : `${r}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-gray-500">
        {zoneType === "circle"
          ? t("settings.clickToPlace")
          : vertices.length >= 3
            ? `${t("settings.polygonVertices")}: ${vertices.length}`
            : t("settings.drawPolygon")}
      </p>

      {/* Map */}
      <div className="h-72 overflow-hidden rounded-lg border border-gray-200">
        <LeafletMapContainer
          center={center ? [center.lat, center.lng] : DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full z-0"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Existing zones (dimmed) */}
          <PrivacyZoneOverlay
            zones={existingZones.filter(
              (z) => z._id !== editingZone?._id,
            )}
          />

          {/* Circle mode */}
          {zoneType === "circle" && (
            <>
              <CirclePlacer onPlace={handleCirclePlace} />
              {center && (
                <>
                  <Marker
                    position={[center.lat, center.lng]}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target as L.Marker;
                        const ll = marker.getLatLng();
                        setCenter({ lat: ll.lat, lng: ll.lng });
                      },
                    }}
                  />
                  <Circle
                    center={[center.lat, center.lng]}
                    radius={radius}
                    pathOptions={{
                      color: "#4f46e5",
                      weight: 2,
                      fillOpacity: 0.15,
                      dashArray: "8 6",
                    }}
                  />
                </>
              )}
            </>
          )}

          {/* Polygon mode */}
          {zoneType === "polygon" && vertices.length === 0 && (
            <PolygonDrawer onDraw={handlePolygonDraw} />
          )}
          {zoneType === "polygon" && vertices.length >= 3 && (
            <Polygon
              positions={vertices.map((v) => [v.lat, v.lng] as [number, number])}
              pathOptions={{
                color: "#4f46e5",
                weight: 2,
                fillOpacity: 0.15,
                dashArray: "8 6",
              }}
            />
          )}
        </LeafletMapContainer>
      </div>

      {/* Clear polygon button */}
      {zoneType === "polygon" && vertices.length >= 3 && (
        <button
          onClick={handleClearPolygon}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          {t("settings.polygonClearRedraw")}
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? t("settings.saving") : t("common.save")}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
