import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Route {
  _id: Id<"routes">;
  name: string;
  distanceKm: number;
  color: string;
  startedAt?: number;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

interface Props {
  routes: Route[];
  visibleIds: Set<string>;
  onToggleVisibility: (id: string) => void;
  onZoomTo: (route: Route) => void;
}

export default function RouteList({
  routes,
  visibleIds,
  onToggleVisibility,
  onZoomTo,
}: Props) {
  const { t } = useTranslation();
  const deleteRoute = useMutation(api.routes.deleteRoute);
  const renameRoute = useMutation(api.routes.renameRoute);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (routes.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        {t("map.noRoutes")}
      </p>
    );
  }

  const handleRename = async (routeId: Id<"routes">) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    await renameRoute({ routeId, name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (routeId: Id<"routes">) => {
    await deleteRoute({ routeId });
    setDeletingId(null);
  };

  return (
    <div className="space-y-1.5">
      {routes.map((route) => (
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

            {/* Name / Inline edit */}
            {editingId === route._id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(route._id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleRename(route._id)}
                autoFocus
                className="flex-1 rounded border border-emerald-300 px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-emerald-400"
              />
            ) : (
              <button
                onClick={() => onZoomTo(route)}
                className="flex-1 truncate text-start text-sm font-medium text-gray-800 hover:text-emerald-700"
              >
                {route.name}
              </button>
            )}

            {/* Visibility toggle */}
            <button
              onClick={() => onToggleVisibility(route._id)}
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title={t("map.visibility")}
            >
              {visibleIds.has(route._id) ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
            <span>
              {t("map.distance", { km: route.distanceKm.toFixed(1) })}
            </span>
            <span>
              {route.startedAt
                ? new Date(route.startedAt).toLocaleDateString()
                : ""}
            </span>
          </div>

          {/* Delete confirmation */}
          {deletingId === route._id ? (
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => handleDelete(route._id)}
                className="flex-1 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
              >
                {t("map.confirmDelete")}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
              >
                {t("map.cancel")}
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => {
                  setEditingId(route._id);
                  setEditName(route.name);
                }}
                className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                {t("map.rename")}
              </button>
              <button
                onClick={() => setDeletingId(route._id)}
                className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
              >
                {t("map.delete")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
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
