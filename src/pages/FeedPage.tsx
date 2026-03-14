import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function FeedPage() {
  const { t, i18n } = useTranslation();
  const [followingOnly, setFollowingOnly] = useState(false);
  const feed = useQuery(api.activities.getFeed, { followingOnly }) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("feed.title")}
        </h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          <button
            onClick={() => setFollowingOnly(false)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              !followingOnly
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("feed.everyone")}
          </button>
          <button
            onClick={() => setFollowingOnly(true)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              followingOnly
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("feed.following")}
          </button>
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            {followingOnly ? t("feed.emptyFollowing") : t("feed.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((activity) => (
            <ActivityCard
              key={activity._id}
              activity={activity}
              t={t}
              lang={i18n.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  t,
  lang,
}: {
  activity: {
    _id: string;
    type: "route_upload" | "coverage_milestone" | "area_started";
    createdAt: number;
    metadata?: string | null;
    user: {
      _id: string;
      name?: string;
      image?: string;
      profile?: { displayName: string } | null;
    } | null;
    route?: { name: string; distanceKm: number } | null;
    area?: { name: string; nameHe?: string } | null;
  };
  t: (key: string, opts?: Record<string, unknown>) => string;
  lang: string;
}) {
  const user = activity.user;
  const displayName = user?.profile?.displayName ?? user?.name ?? "User";
  const areaName =
    lang === "he"
      ? activity.area?.nameHe || activity.area?.name
      : activity.area?.name;

  let description = "";
  if (activity.type === "route_upload" && activity.route) {
    description = t("feed.routeUpload", { name: activity.route.name });
  } else if (activity.type === "coverage_milestone") {
    const meta = activity.metadata ? JSON.parse(activity.metadata) : {};
    description = t("feed.coverageMilestone", {
      percent: meta.percent ?? "?",
      area: areaName ?? "",
    });
  } else if (activity.type === "area_started") {
    description = t("feed.areaStarted", { area: areaName ?? "" });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link to={`/profile/${user?._id}`} className="shrink-0">
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800">
            <Link
              to={`/profile/${user?._id}`}
              className="font-semibold text-gray-900 hover:text-emerald-700"
            >
              {displayName}
            </Link>{" "}
            {description}
          </p>

          {/* Route distance badge */}
          {activity.type === "route_upload" && activity.route && (
            <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {activity.route.distanceKm.toFixed(1)} {t("common.km")}
            </span>
          )}

          {/* Timestamp */}
          <p className="mt-1 text-xs text-gray-400">
            {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
