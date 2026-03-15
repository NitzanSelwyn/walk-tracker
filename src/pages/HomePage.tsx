import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
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
  const platformStats = useQuery(api.platformStatsCron.getPlatformStats);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t("home.welcome", { name: profile?.displayName ?? user?.name ?? "" })}
      </h1>

      {platformStats && (
        <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 shadow-lg shadow-emerald-900/20">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-2xl" />

          <h2 className="font-display relative mb-5 text-lg tracking-wide text-emerald-100/80">
            {t("home.platformTitle")}
          </h2>

          <div className="relative grid gap-4 sm:grid-cols-3">
            <PlatformKpiCard
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
              label={t("home.platformUsers")}
              value={String(platformStats.totalUsers)}
            />
            <PlatformKpiCard
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
              }
              label={t("home.platformRoutes")}
              value={String(platformStats.totalRoutes)}
            />
            <PlatformKpiCard
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />
                </svg>
              }
              label={t("home.platformDistance")}
              value={`${platformStats.totalDistanceKm.toFixed(1)} ${t("common.km")}`}
            />
          </div>
        </div>
      )}

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

function PlatformKpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/15">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-emerald-100">
        {icon}
      </div>
      <p className="text-xs font-medium tracking-wide text-emerald-200/70 uppercase">
        {label}
      </p>
      <p className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
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
