import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export default function HomePage() {
  const user = useQuery(api.users.currentUser);
  const ensureProfile = useMutation(api.users.ensureProfile);
  const { t } = useTranslation();

  useEffect(() => {
    if (user && !user.profile) {
      ensureProfile();
    }
  }, [user, ensureProfile]);

  const profile = user?.profile;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t("home.welcome", { name: profile?.displayName ?? user?.name ?? "" })}
      </h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("home.totalDistance")}
          value={`${(profile?.totalDistanceKm ?? 0).toFixed(1)} ${t("common.km")}`}
        />
        <StatCard
          label={t("home.totalRoutes")}
          value={String(profile?.totalRoutes ?? 0)}
        />
        <StatCard label={t("home.topCoverage")} value="--" />
      </div>

      {(profile?.totalRoutes ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="mb-2 text-gray-600">{t("home.noRoutes")}</p>
          <p className="mb-4 text-sm text-gray-400">{t("home.getStarted")}</p>
          <Link
            to="/map"
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("home.goToMap")}
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600">
            {t("home.welcome", {
              name: profile?.displayName ?? user?.name ?? "",
            })}
          </p>
          <Link
            to="/map"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("home.goToMap")}
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
