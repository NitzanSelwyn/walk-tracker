import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParsedRoute } from "../../lib/gpx";

interface Props {
  parsedRoute: ParsedRoute;
  onSave: (name: string, routeType: "walk" | "bike") => void;
  onCancel: () => void;
  saving: boolean;
}

export default function GpxPreview({
  parsedRoute,
  onSave,
  onCancel,
  saving,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(parsedRoute.name);
  const [routeType, setRouteType] = useState<"walk" | "bike">("walk");

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-emerald-800">
        {t("map.preview")}
      </h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name.trim(), routeType);
        }}
      />

      {/* Route type toggle */}
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => setRouteType("walk")}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            routeType === "walk"
              ? "bg-emerald-600 text-white"
              : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          }`}
        >
          <WalkIcon />
          {t("map.walk")}
        </button>
        <button
          type="button"
          onClick={() => setRouteType("bike")}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            routeType === "bike"
              ? "bg-emerald-600 text-white"
              : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          }`}
        >
          <BikeIcon />
          {t("map.bike")}
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {t("map.distance", { km: parsedRoute.distanceKm.toFixed(2) })}
      </p>
      {parsedRoute.startedAt && (
        <p className="mt-0.5 text-xs text-gray-400">
          {new Date(parsedRoute.startedAt).toLocaleDateString()}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onSave(name.trim(), routeType)}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("map.save")}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {t("map.cancel")}
        </button>
      </div>
    </div>
  );
}

function WalkIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M10 22l4-12m-4 0l-2 8m6-8l2 8M10 10l-2-4" />
    </svg>
  );
}

function BikeIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
    </svg>
  );
}
