import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FollowButton from "../components/social/FollowButton";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userId: paramUserId } = useParams<{ userId: string }>();

  const currentUser = useQuery(api.users.currentUser);
  const isOwnProfile = !paramUserId;
  const targetUserId = paramUserId
    ? (paramUserId as Id<"users">)
    : currentUser?._id;

  const otherUser = useQuery(
    api.users.getProfile,
    targetUserId && !isOwnProfile ? { userId: targetUserId } : "skip",
  );

  const followerCount = useQuery(
    api.follows.getFollowerCount,
    targetUserId ? { userId: targetUserId } : "skip",
  );
  const followingCount = useQuery(
    api.follows.getFollowingCount,
    targetUserId ? { userId: targetUserId } : "skip",
  );

  const user = isOwnProfile ? currentUser : otherUser;
  const profile = user?.profile;

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                {(profile?.displayName ?? user.name ?? "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {profile?.displayName ?? user.name}
              </h2>
              {user.email && (
                <p className="text-sm text-gray-500">{user.email}</p>
              )}
              {profile?.bio && (
                <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
              )}
            </div>
          </div>
          {!isOwnProfile && targetUserId && (
            <FollowButton userId={targetUserId} />
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t border-gray-100 pt-6">
          <StatBlock
            value={String(profile?.totalRoutes ?? 0)}
            label={t("home.totalRoutes")}
          />
          <StatBlock
            value={`${(profile?.totalDistanceKm ?? 0).toFixed(1)}`}
            label={t("common.km")}
          />
          <StatBlock
            value={String(followerCount ?? 0)}
            label={t("profile.followers")}
          />
          <StatBlock
            value={String(followingCount ?? 0)}
            label={t("profile.following")}
          />
        </div>
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
