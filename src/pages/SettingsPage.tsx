import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { handleMutationError, showSuccessToast } from "../lib/errorHandling";
import ZoneMapEditor from "../components/privacy/ZoneMapEditor";

export default function SettingsPage() {
  const { t } = useTranslation();

  const currentUser = useQuery(api.users.currentUser);
  const zones = useQuery(api.privacyZones.getMyZones) ?? [];

  const createZone = useMutation(api.privacyZones.createZone);
  const updateZone = useMutation(api.privacyZones.updateZone);
  const deleteZone = useMutation(api.privacyZones.deleteZone);
  const updateProfile = useMutation(api.users.updateProfile);

  const [editing, setEditing] = useState<"new" | Doc<"privacyZones"> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const autoTrimEnabled = currentUser?.profile?.autoTrimEnabled ?? false;

  const toggleAutoTrim = async () => {
    try {
      await updateProfile({ autoTrimEnabled: !autoTrimEnabled });
      showSuccessToast(t("success.profileUpdated"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleSaveZone = async (data: {
    name: string;
    zoneType: "circle" | "polygon";
    center?: { lat: number; lng: number };
    radiusMeters?: number;
    vertices?: { lat: number; lng: number }[];
  }) => {
    setSaving(true);
    try {
      if (editing && editing !== "new") {
        await updateZone({
          zoneId: editing._id,
          name: data.name,
          center: data.center,
          radiusMeters: data.radiusMeters,
          vertices: data.vertices,
        });
        showSuccessToast(t("success.zoneUpdated"));
      } else {
        await createZone(data);
        showSuccessToast(t("success.zoneCreated"));
      }
      setEditing(null);
    } catch (err) {
      handleMutationError(err, t);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: Doc<"privacyZones">["_id"]) => {
    if (!confirm(t("settings.confirmDeleteZone"))) return;
    setDeleting(zoneId);
    try {
      await deleteZone({ zoneId });
      showSuccessToast(t("success.zoneDeleted"));
    } catch (err) {
      handleMutationError(err, t);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-xl font-bold text-gray-900">
        {t("settings.title")}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {t("settings.privacyZonesDesc")}
      </p>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column: zones list + auto-trim */}
        <div className="flex-1 space-y-4">
          {/* Auto-trim toggle */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {t("settings.autoTrim")}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("settings.autoTrimDesc")}
                </p>
              </div>
              <button
                onClick={toggleAutoTrim}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  autoTrimEnabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    autoTrimEnabled ? "start-[1.375rem]" : "start-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Privacy zones header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              {t("settings.privacyZones")}
            </h2>
            {!editing && zones.length < 5 && (
              <button
                onClick={() => setEditing("new")}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
              >
                + {t("settings.addZone")}
              </button>
            )}
          </div>

          {/* Zone limit notice */}
          {zones.length >= 5 && !editing && (
            <p className="text-xs text-amber-600">{t("settings.zoneLimit")}</p>
          )}

          {/* Zone cards */}
          {zones.length === 0 && !editing && (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-400">{t("settings.noZones")}</p>
            </div>
          )}

          {zones.map((zone) => (
            <div
              key={zone._id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-500">
                    {zone.zoneType === "circle" ? (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polygon points="12,2 22,8 18,22 6,22 2,8" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {zone.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {zone.zoneType === "circle"
                        ? `${t("settings.circle")} · ${zone.radiusMeters}m`
                        : `${t("settings.polygon")} · ${zone.vertices?.length ?? 0} ${t("settings.polygonVertices").toLowerCase()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(zone)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title={t("settings.editZone")}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone._id)}
                    disabled={deleting === zone._id}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title={t("settings.deleteZone")}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right column: map editor */}
        {editing && (
          <div className="flex-1">
            <ZoneMapEditor
              existingZones={zones}
              editingZone={editing !== "new" ? editing : undefined}
              onSave={handleSaveZone}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
