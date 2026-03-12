import { useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import MapContainer from "../components/map/MapContainer";
import RouteLayer from "../components/map/RouteLayer";
import GpxUploader from "../components/gpx/GpxUploader";
import GpxPreview from "../components/gpx/GpxPreview";
import RouteList from "../components/gpx/RouteList";
import { useGpxParser } from "../hooks/useGpxParser";
import { useFileUpload } from "../hooks/useFileUpload";
import type { LatLngBoundsExpression } from "leaflet";

export default function MapPage() {
  const { t } = useTranslation();
  const routes = useQuery(api.routes.getUserRoutes) ?? [];
  const { parsedRoute, parsing, error, parseFile, reset } = useGpxParser();
  const { upload, uploading } = useFileUpload();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [flyToBounds, setFlyToBounds] = useState<
    LatLngBoundsExpression | undefined
  >();
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  // Add newly loaded routes to the visible set
  useEffect(() => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const route of routes) {
        if (!next.has(route._id)) {
          next.add(route._id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [routes]);

  // Fly to parsed route when preview appears
  useEffect(() => {
    if (parsedRoute) {
      const { minLat, maxLat, minLng, maxLng } = parsedRoute.boundingBox;
      setFlyToBounds([
        [minLat, minLng],
        [maxLat, maxLng],
      ]);
    }
  }, [parsedRoute]);

  const toggleVisibility = useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFileSelected = (file: File) => {
    setGpxFile(file);
    parseFile(file);
  };

  const handleSave = async (name: string) => {
    if (!gpxFile || !parsedRoute) return;
    await upload(gpxFile, parsedRoute, name);
    reset();
    setGpxFile(null);
  };

  const handleCancel = () => {
    reset();
    setGpxFile(null);
  };

  const handleZoomTo = useCallback(
    (route: {
      boundingBox: {
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
      };
    }) => {
      const { minLat, maxLat, minLng, maxLng } = route.boundingBox;
      setFlyToBounds([
        [minLat, minLng],
        [maxLat, maxLng],
      ]);
    },
    [],
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex w-80 shrink-0 flex-col border-e border-gray-200 bg-white">
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
              {t("map.routes")}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <SidebarCloseIcon />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Upload or preview */}
            {parsedRoute ? (
              <GpxPreview
                parsedRoute={parsedRoute}
                onSave={handleSave}
                onCancel={handleCancel}
                saving={uploading}
              />
            ) : (
              <GpxUploader
                onFileSelected={handleFileSelected}
                disabled={parsing}
              />
            )}

            {/* Parse error */}
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            {/* Parsing spinner */}
            {parsing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                {t("common.loading")}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Route list */}
            <RouteList
              routes={routes}
              visibleIds={visibleIds}
              onToggleVisibility={toggleVisibility}
              onZoomTo={handleZoomTo}
            />
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="relative flex-1">
        {/* Sidebar toggle (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute start-3 top-3 z-[1000] rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-600 shadow-md transition-colors hover:bg-gray-50"
          >
            <SidebarOpenIcon />
          </button>
        )}

        <MapContainer flyToBounds={flyToBounds}>
          {/* Saved routes */}
          <RouteLayer routes={routes} visibleIds={visibleIds} />

          {/* Preview route (dashed) */}
          {parsedRoute && (
            <RouteLayer
              routes={[
                {
                  _id: "__preview__",
                  geojson: JSON.stringify(parsedRoute.geojson),
                  color: "#059669",
                  name: parsedRoute.name,
                },
              ]}
              visibleIds={new Set(["__preview__"])}
              styleOverride={{
                color: "#059669",
                weight: 4,
                opacity: 0.9,
                dashArray: "10 6",
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

function SidebarCloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="14 9 11 12 14 15" />
    </svg>
  );
}

function SidebarOpenIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="13 9 16 12 13 15" />
    </svg>
  );
}
