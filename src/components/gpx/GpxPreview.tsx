import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParsedRoute } from "../../lib/gpx";

interface Props {
  parsedRoute: ParsedRoute;
  onSave: (name: string) => void;
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
          if (e.key === "Enter" && name.trim()) onSave(name.trim());
        }}
      />
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
          onClick={() => onSave(name.trim())}
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
