import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { handleMutationError, showSuccessToast } from "../lib/errorHandling";
import MapContainer from "../components/map/MapContainer";
import RoadNetworkLayer from "../components/map/RoadNetworkLayer";
import AreaPicker from "../components/coverage/AreaPicker";
import CoverageStats from "../components/coverage/CoverageStats";
import { useCoveredRoadIds } from "../hooks/useCoverage";
import { useIsMobile } from "../hooks/useIsMobile";
import type { LatLngBoundsExpression } from "leaflet";

export default function CoveragePage() {
  const { t } = useTranslation();
  const areas = useQuery(api.areas.list) ?? [];
  const seedAreas = useMutation(api.areas.seed);
  const fetchRoadNetwork = useAction(api.roadNetwork.fetchRoadNetwork);
  const calculateCoverage = useAction(api.coverage.calculateCoverage);
  const user = useQuery(api.users.currentUser);

  const [selectedAreaId, setSelectedAreaId] = useState<Id<"areas"> | null>(
    null,
  );
  const [fetching, setFetching] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Seed areas if empty
  useEffect(() => {
    if (areas.length === 0) {
      seedAreas();
    }
  }, [areas.length, seedAreas]);

  const [geojsonString, setGeojsonString] = useState<string | undefined>();

  // Reactive queries for selected area
  const roadNetwork = useQuery(
    api.coverageQueries.getCachedRoadNetwork,
    selectedAreaId ? { areaId: selectedAreaId } : "skip",
  );
  const coverage = useQuery(
    api.coverageQueries.getUserCoverage,
    selectedAreaId ? { areaId: selectedAreaId } : "skip",
  );
  const routes = useQuery(api.routes.getUserRoutes) ?? [];

  // Fetch geojson from file storage URL
  useEffect(() => {
    if (!roadNetwork?.geojsonUrl) {
      setGeojsonString(undefined);
      return;
    }
    let cancelled = false;
    fetch(roadNetwork.geojsonUrl)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setGeojsonString(text);
      })
      .catch(() => {
        if (!cancelled) setGeojsonString(undefined);
      });
    return () => { cancelled = true; };
  }, [roadNetwork?.geojsonUrl]);

  // Coverage visualization (grid-based spatial index)
  const coveredRoadIds = useCoveredRoadIds(geojsonString, routes);

  // Fly to area bounds when selected
  const selectedArea = areas.find((a) => a._id === selectedAreaId);
  const flyToBounds: LatLngBoundsExpression | undefined = selectedArea
    ? [
        [selectedArea.boundingBox.minLat, selectedArea.boundingBox.minLng],
        [selectedArea.boundingBox.maxLat, selectedArea.boundingBox.maxLng],
      ]
    : undefined;

  // Auto-fetch road network when area selected and not cached
  useEffect(() => {
    if (selectedAreaId && roadNetwork === null && !fetching) {
      setFetching(true);
      fetchRoadNetwork({ areaId: selectedAreaId })
        .catch((err) => handleMutationError(err, t))
        .finally(() => setFetching(false));
    }
  }, [selectedAreaId, roadNetwork, fetching, fetchRoadNetwork, t]);

  const handleRecalculate = useCallback(() => {
    if (!selectedAreaId || !user?._id || calculating) return;
    setCalculating(true);
    calculateCoverage({ areaId: selectedAreaId, userId: user._id })
      .then(() => showSuccessToast(t("success.coverageCalculated")))
      .catch((err) => handleMutationError(err, t))
      .finally(() => setCalculating(false));
  }, [selectedAreaId, user, calculating, calculateCoverage, t]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className={`flex shrink-0 flex-col border-e border-gray-200 bg-white ${isMobile ? "absolute inset-y-0 start-0 z-[1001] w-72 shadow-xl" : "w-80"}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
              {t("coverage.title")}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <SidebarCloseIcon />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {/* Area picker */}
            <AreaPicker
              areas={areas}
              selectedId={selectedAreaId}
              onSelect={setSelectedAreaId}
            />

            {/* Loading states */}
            {fetching && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                {t("coverage.loading")}
              </div>
            )}

            {/* Coverage stats */}
            {selectedAreaId && roadNetwork && (
              <>
                <div className="border-t border-gray-100" />
                <CoverageStats
                  coverage={coverage ?? null}
                  onRecalculate={handleRecalculate}
                  calculating={calculating}
                  isAdmin={user?.profile?.role === "admin"}
                />
              </>
            )}

            {/* Empty state */}
            {!selectedAreaId && (
              <p className="py-8 text-center text-sm text-gray-400">
                {t("coverage.noArea")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative flex-1">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute start-3 top-3 z-[1000] rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-600 shadow-md transition-colors hover:bg-gray-50"
          >
            <SidebarOpenIcon />
          </button>
        )}

        <MapContainer flyToBounds={flyToBounds}>
          {geojsonString && (
            <RoadNetworkLayer
              roadNetworkGeojson={geojsonString}
              coveredRoadIds={coveredRoadIds}
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
