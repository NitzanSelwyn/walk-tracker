import { useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import MapContainer from "../components/map/MapContainer";
import RouteLayer from "../components/map/RouteLayer";
import { useIsMobile } from "../hooks/useIsMobile";
import type { LatLngBoundsExpression } from "leaflet";

export default function UserMapPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const targetUserId = userId as Id<"users">;

  const currentUser = useQuery(api.users.currentUser);
  const isOwnProfile = currentUser?._id === targetUserId;

  const profile = useQuery(
    api.users.getProfile,
    !isOwnProfile ? { userId: targetUserId } : "skip",
  );
  const routes =
    useQuery(api.routes.getRoutesByUserId, { userId: targetUserId }) ?? [];

  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [flyToBounds, setFlyToBounds] = useState<
    LatLngBoundsExpression | undefined
  >();
  const [typeFilter, setTypeFilter] = useState<"all" | "walk" | "bike">("all");

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

  const toggleVisibility = useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const filteredRoutes = typeFilter === "all"
    ? routes
    : routes.filter((r) => (r.routeType ?? "walk") === typeFilter);

  const isLimited =
    !isOwnProfile && profile && "isLimited" in profile && profile.isLimited;
  const isMapPublic =
    !isOwnProfile && profile && profile.profile?.isMapPublic;

  const displayName = isOwnProfile
    ? currentUser?.profile?.displayName ?? currentUser?.name
    : profile
      ? profile.profile?.displayName ?? profile.name
      : undefined;

  // Private profile notice (skip if map is public)
  if (isLimited && !isMapPublic) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-md bg-amber-50 px-6 py-4 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            {t("profile.privateNotice")}
          </div>
        </div>
        <Link
          to={`/profile/${userId}`}
          className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          &larr; {t("profile.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className={`flex shrink-0 flex-col border-e border-gray-200 bg-white ${isMobile ? "absolute inset-y-0 start-0 z-[1001] w-72 shadow-xl" : "w-80"}`}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${userId}`}
                className="text-gray-400 transition-colors hover:text-gray-600"
                title={t("profile.title")}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </Link>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                {displayName
                  ? t("map.routes") + " — " + displayName
                  : t("map.routes")}
              </h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <SidebarCloseIcon />
            </button>
          </div>

          {/* Route list */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Type filter */}
            <div className="mb-3 flex gap-1">
              {(["all", "walk", "bike"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    typeFilter === type
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t(`map.${type}`)}
                </button>
              ))}
            </div>

            {filteredRoutes.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                {t("map.noRoutes")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredRoutes.map((route) => (
                  <div
                    key={route._id}
                    className="group rounded-lg border border-gray-100 bg-white p-2.5 transition-colors hover:border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      {/* Color swatch */}
                      <div
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: route.color }}
                      />

                      {/* Name — click to zoom */}
                      <button
                        onClick={() => handleZoomTo(route)}
                        className="flex-1 truncate text-start text-sm font-medium text-gray-800 hover:text-emerald-700"
                      >
                        {route.name}
                      </button>

                      {/* Visibility toggle */}
                      <button
                        onClick={() => toggleVisibility(route._id)}
                        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title={t("map.visibility")}
                      >
                        {visibleIds.has(route._id) ? (
                          <EyeIcon />
                        ) : (
                          <EyeOffIcon />
                        )}
                      </button>
                    </div>

                    {/* Meta row */}
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        {(route.routeType ?? "walk") === "bike" ? <SmallBikeIcon /> : <SmallWalkIcon />}
                        {t("map.distance", {
                          km: route.distanceKm.toFixed(1),
                        })}
                      </span>
                      <span>
                        {route.startedAt
                          ? new Date(route.startedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          <RouteLayer routes={filteredRoutes} visibleIds={visibleIds} />
        </MapContainer>
      </div>
    </div>
  );
}

function SmallWalkIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M10 22l4-12m-4 0l-2 8m6-8l2 8M10 10l-2-4" />
    </svg>
  );
}

function SmallBikeIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
    </svg>
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

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
