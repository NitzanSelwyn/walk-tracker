import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FollowButton from "../components/social/FollowButton";
import FriendButton from "../components/social/FriendButton";
import { handleMutationError, showSuccessToast } from "../lib/errorHandling";

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { userId: paramUserId } = useParams({ strict: false }) as { userId?: string };

  const currentUser = useQuery(api.users.currentUser);
  const targetUserId = paramUserId
    ? (paramUserId as Id<"users">)
    : currentUser?._id;
  const isOwnProfile =
    !paramUserId || (currentUser && paramUserId === currentUser._id);

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
  const friendCount = useQuery(
    api.friends.getFriendCount,
    targetUserId ? { userId: targetUserId } : "skip",
  );

  const coverages = useQuery(
    api.coverageQueries.getUserCoverages,
    targetUserId ? { userId: targetUserId } : "skip",
  );

  const updateProfile = useMutation(api.users.updateProfile);

  const user = isOwnProfile ? currentUser : otherUser;
  const profile = user?.profile;
  const isLimited =
    !isOwnProfile &&
    otherUser &&
    "isLimited" in otherUser &&
    otherUser.isLimited;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const startEdit = () => {
    setEditName(profile?.displayName ?? user.name ?? "");
    setEditBio(profile?.bio ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      await updateProfile({ displayName: editName, bio: editBio });
      showSuccessToast(t("success.profileUpdated"));
      setEditing(false);
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const togglePrivacy = async () => {
    try {
      await updateProfile({ isPublic: !profile?.isPublic });
      showSuccessToast(t("success.profileUpdated"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const toggleMapPublic = async () => {
    try {
      await updateProfile({ isMapPublic: !profile?.isMapPublic });
      showSuccessToast(t("success.profileUpdated"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const isHebrew = i18n.language === "he";

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
              {editing ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-lg font-semibold"
                    placeholder={t("profile.displayName")}
                  />
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    rows={2}
                    placeholder={t("profile.bio")}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded bg-emerald-500 px-3 py-1 text-sm text-white hover:bg-emerald-600"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {profile?.displayName ?? user.name}
                  </h2>
                  {user.email && (
                    <p className="text-sm text-gray-500">{user.email}</p>
                  )}
                  {profile?.bio && (
                    <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwnProfile && !editing && (
              <>
                <button
                  onClick={togglePrivacy}
                  title={t("profile.privacyToggleHint")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    profile?.isPublic
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {profile?.isPublic ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.729-3.56" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  {profile?.isPublic ? t("profile.public") : t("profile.private")}
                </button>
                <button
                  onClick={toggleMapPublic}
                  title={t("profile.mapPublicToggleHint")}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    profile?.isMapPublic
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  {profile?.isMapPublic ? t("profile.mapPublic") : t("profile.mapPrivate")}
                </button>
                <button
                  onClick={startEdit}
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  {t("profile.edit")}
                </button>
              </>
            )}
            {!isOwnProfile && targetUserId && (
              <div className="flex items-center gap-2">
                <FriendButton userId={targetUserId} />
                <FollowButton userId={targetUserId} />
              </div>
            )}
          </div>
        </div>

        {/* Private profile notice */}
        {isLimited && (
          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              {t("profile.privateNotice")}
            </div>
          </div>
        )}

        {/* View Map link — shown for non-limited profiles or when map is public */}
        {(!isLimited || otherUser?.profile?.isMapPublic) && targetUserId && (
          <div className="mt-4 flex justify-center">
            <Link
              to="/profile/$userId/map"
              params={{ userId: targetUserId! }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              {t("profile.viewMap")}
            </Link>
          </div>
        )}

        {/* Stats — hidden for limited profiles */}
        {!isLimited && (
          <div className="mt-6 grid grid-cols-5 gap-4 border-t border-gray-100 pt-6">
            <StatBlock
              value={String(profile?.totalRoutes ?? 0)}
              label={t("home.totalRoutes")}
            />
            <StatBlock
              value={`${(profile?.totalDistanceKm ?? 0).toFixed(1)}`}
              label={t("common.km")}
            />
            <StatBlock
              value={String(friendCount ?? 0)}
              label={t("profile.friends")}
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
        )}

        {/* Coverage — shown for own profile or public profiles */}
        {!isLimited && coverages && coverages.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              {t("coverage.title")}
            </h3>
            <div className="space-y-2">
              {coverages.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-800">
                    {isHebrew && c.areaNameHe ? c.areaNameHe : c.areaName}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(c.coveragePercent, 100)}%` }}
                      />
                    </div>
                    <span className="min-w-[3rem] text-end text-sm font-medium text-gray-700">
                      {c.coveragePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
