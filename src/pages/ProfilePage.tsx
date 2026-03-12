import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";

export default function ProfilePage() {
  const user = useQuery(api.users.currentUser);
  const { t } = useTranslation();

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const profile = user.profile;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t("profile.title")}
      </h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
              {(profile?.displayName ?? user.name ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile?.displayName ?? user.name}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {profile?.bio && (
              <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {profile?.totalRoutes ?? 0}
            </p>
            <p className="text-sm text-gray-500">{t("home.totalRoutes")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {(profile?.totalDistanceKm ?? 0).toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">{t("common.km")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">{t("profile.followers")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
