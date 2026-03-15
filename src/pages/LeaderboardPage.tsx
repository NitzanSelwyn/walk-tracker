import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import AreaPicker from "../components/coverage/AreaPicker";

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const areas = useQuery(api.areas.list) ?? [];
  const currentUser = useQuery(api.users.currentUser);
  const [selectedAreaId, setSelectedAreaId] = useState<Id<"areas"> | null>(
    null,
  );

  const leaderboard = useQuery(
    api.leaderboard.getByArea,
    selectedAreaId ? { areaId: selectedAreaId } : "skip",
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t("leaderboard.title")}
      </h1>

      <div className="mb-6">
        <AreaPicker
          areas={areas}
          selectedId={selectedAreaId}
          onSelect={setSelectedAreaId}
        />
      </div>

      {!selectedAreaId ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">{t("coverage.noArea")}</p>
        </div>
      ) : leaderboard === undefined ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : leaderboard.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No coverage data yet
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === currentUser?._id;
            const displayName =
              entry.user?.profile?.displayName ??
              entry.user?.name ??
              "User";

            return (
              <div
                key={entry._id}
                className={`flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
                  isCurrentUser ? "bg-emerald-50" : "bg-white"
                }`}
              >
                {/* Rank */}
                <span
                  className={`w-8 text-center text-sm font-bold ${
                    entry.rank <= 3 ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {t("leaderboard.rank", { rank: entry.rank })}
                </span>

                {/* Avatar */}
                <Link to="/profile/$userId" params={{ userId: entry.userId }} className="shrink-0">
                  {entry.user?.image ? (
                    <img
                      src={entry.user.image}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>

                {/* Name */}
                <Link
                  to="/profile/$userId" params={{ userId: entry.userId }}
                  className="flex-1 truncate text-sm font-medium text-gray-800 hover:text-emerald-700"
                >
                  {displayName}
                  {isCurrentUser && (
                    <span className="ms-1 text-xs text-emerald-600">
                      {t("leaderboard.you")}
                    </span>
                  )}
                </Link>

                {/* Coverage % */}
                <div className="text-end">
                  <span className="text-sm font-bold text-emerald-600">
                    {entry.coveragePercent.toFixed(1)}%
                  </span>
                  <span className="ms-1 text-xs text-gray-400">
                    {entry.coveredLengthKm.toFixed(1)} {t("common.km")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
