import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { LatLngBoundsExpression } from "leaflet";
import MapContainer from "../components/map/MapContainer";
import CommunityRoutesLayer from "../components/map/CommunityRoutesLayer";
import AreaPicker from "../components/coverage/AreaPicker";
import { useIsMobile } from "../hooks/useIsMobile";

export default function CommunityPage() {
  const { t } = useTranslation();
  const areas = useQuery(api.areas.list) ?? [];
  const [selectedAreaId, setSelectedAreaId] = useState<Id<"areas"> | null>(
    null,
  );
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const stats = useQuery(
    api.community.getAreaStats,
    selectedAreaId ? { areaId: selectedAreaId } : "skip",
  );
  const communityRoutes = useQuery(
    api.community.getAllPublicRoutes,
    selectedAreaId ? { areaId: selectedAreaId } : "skip",
  );

  const selectedArea = areas.find((a) => a._id === selectedAreaId);
  const flyToBounds: LatLngBoundsExpression | undefined = selectedArea
    ? [
        [selectedArea.boundingBox.minLat, selectedArea.boundingBox.minLng],
        [selectedArea.boundingBox.maxLat, selectedArea.boundingBox.maxLng],
      ]
    : undefined;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className={`flex shrink-0 flex-col border-e border-gray-200 bg-white ${isMobile ? "absolute inset-y-0 start-0 z-[1001] w-72 shadow-xl" : "w-80"}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
              {t("community.title")}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <SidebarCloseIcon />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <AreaPicker
              areas={areas}
              selectedId={selectedAreaId}
              onSelect={setSelectedAreaId}
            />

            {!selectedAreaId && (
              <p className="py-8 text-center text-sm text-gray-400">
                {t("community.selectArea")}
              </p>
            )}

            {selectedAreaId && stats === undefined && (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {stats && (
              <>
                {/* Community stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    value={String(stats.walkerCount)}
                    label={t("community.walkers")}
                  />
                  <StatCard
                    value={`${stats.communityCoveragePercent.toFixed(1)}%`}
                    label={t("community.totalCoverage")}
                  />
                  <StatCard
                    value={`${stats.totalCoveredKm.toFixed(1)}`}
                    label={t("community.coveredKm")}
                  />
                  <StatCard
                    value={`${stats.totalRoadKm.toFixed(1)}`}
                    label={t("community.totalKm")}
                  />
                </div>

                {/* Top contributors */}
                {stats.topContributors.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("community.topContributors")}
                    </h3>
                    <div className="space-y-2">
                      {stats.topContributors.map((contributor, i) => (
                        <Link
                          key={contributor.userId}
                          to={`/profile/${contributor.userId}`}
                          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                        >
                          <span className="w-5 text-center text-xs font-bold text-emerald-600">
                            {i + 1}
                          </span>
                          {contributor.image ? (
                            <img
                              src={contributor.image}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                              {contributor.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="flex-1 truncate text-sm font-medium text-gray-700">
                            {contributor.displayName}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">
                            {contributor.coveragePercent.toFixed(1)}%
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route count */}
                {communityRoutes && (
                  <p className="text-center text-xs text-gray-400">
                    {t("community.routeCount", {
                      count: communityRoutes.length,
                    })}
                  </p>
                )}
              </>
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
          {communityRoutes && communityRoutes.length > 0 && (
            <CommunityRoutesLayer routes={communityRoutes} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
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
