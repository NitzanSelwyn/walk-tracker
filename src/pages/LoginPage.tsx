import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-full overflow-x-hidden" style={{ background: "#fafaf8" }}>
      {/* ── Top Nav ── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-stone-200/60 px-5 py-3 backdrop-blur-md" style={{ background: "rgba(250,250,248,0.85)" }}>
        <span className="font-display text-xl text-emerald-800">
          {t("app.title")}
        </span>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/NitzanSelwyn/walk-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            title="GitHub"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <button
            onClick={toggleLanguage}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            {i18n.language === "he" ? "English" : "עברית"}
          </button>
          <button
            onClick={() => signIn("google")}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            {t("auth.signIn")}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pb-20 pt-32 sm:pb-28 sm:pt-40">
        {/* Decorative contour lines */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.035]">
          <svg className="h-full w-full" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M-50 350 Q150 250 350 300 T750 260 T1100 320" />
            <path d="M-80 420 Q200 340 400 380 T800 330 T1150 400" />
            <path d="M-30 500 Q180 440 380 460 T780 420 T1100 480" />
            <path d="M-60 560 Q160 510 360 530 T820 490 T1150 550" />
            <path d="M-40 250 Q200 190 400 220 T750 180 T1050 240" />
            <path d="M-20 160 Q180 120 380 140 T780 110 T1080 150" />
          </svg>
        </div>

        {/* Floating decorative dots */}
        <div className="animate-float pointer-events-none absolute start-[12%] top-[20%] h-2 w-2 rounded-full bg-emerald-400 opacity-40" />
        <div className="animate-float-delayed pointer-events-none absolute end-[18%] top-[30%] h-1.5 w-1.5 rounded-full bg-teal-400 opacity-30" />
        <div className="animate-float pointer-events-none absolute end-[10%] top-[65%] h-2.5 w-2.5 rounded-full bg-emerald-300 opacity-25" />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Free badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {t("landing.freeBadge")}
            </span>
          </div>

          <h1 className="font-display text-5xl leading-[1.1] text-stone-900 sm:text-6xl md:text-7xl">
            {t("landing.heroTitle")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-500 sm:text-xl">
            {t("landing.heroSubtitle")}
          </p>

          {/* Hero CTA */}
          <div className="mt-10">
            <button
              onClick={() => signIn("google")}
              className="group inline-flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 shadow-md transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("landing.getStarted")}
              <svg className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-stone-200/60 bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-center text-3xl text-stone-900 sm:text-4xl">
            {t("landing.featuresTitle")}
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            <FeatureCard
              icon={<UploadIcon />}
              title={t("landing.featureUpload")}
              desc={t("landing.featureUploadDesc")}
            />
            <FeatureCard
              icon={<CoverageIcon />}
              title={t("landing.featureCoverage")}
              desc={t("landing.featureCoverageDesc")}
            />
            <FeatureCard
              icon={<SocialIcon />}
              title={t("landing.featureSocial")}
              desc={t("landing.featureSocialDesc")}
            />
            <FeatureCard
              icon={<LeaderboardIcon />}
              title={t("landing.featureLeaderboard")}
              desc={t("landing.featureLeaderboardDesc")}
            />
          </div>
        </div>
      </section>

      {/* ── Community / Free ── */}
      <section className="border-t border-stone-200/60 px-6 py-20 sm:py-24" style={{ background: "#f5f5f0" }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="font-display text-3xl text-stone-900 sm:text-4xl">
            {t("landing.communityTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-500 sm:text-lg">
            {t("landing.communityDesc")}
          </p>
        </div>
      </section>

      {/* ── Strava Export Guide ── */}
      <section className="border-t border-stone-200/60 bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <h2 className="font-display text-3xl text-stone-900 sm:text-4xl">
              {t("landing.stravaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-stone-500">
              {t("landing.stravaSubtitle")}
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="relative rounded-xl border border-stone-150 bg-stone-50/80 p-5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <span className="font-display text-3xl text-emerald-300">
                  {n}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-stone-800">
                  {t(`landing.stravaStep${n}`)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {t(`landing.stravaStep${n}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-stone-200/60 px-6 py-20 sm:py-24" style={{ background: "linear-gradient(to bottom, #f0fdf4, #fafaf8)" }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-stone-900 sm:text-4xl">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mt-3 text-base text-stone-500">
            {t("landing.ctaSubtitle")}
          </p>

          <div className="mt-8">
            <button
              onClick={() => signIn("google")}
              className="inline-flex items-center gap-3 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/25"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="rgba(255,255,255,0.8)" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.9)" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="rgba(255,255,255,0.7)" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.85)" />
              </svg>
              {t("landing.getStarted")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200/60 px-6 py-6">
        <div className="flex items-center justify-center gap-3 text-xs text-stone-400">
          <span>{t("app.title")} &middot; {t("landing.freeBadge")}</span>
          <span>&middot;</span>
          <a
            href="https://github.com/NitzanSelwyn/walk-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-stone-500 transition-colors hover:text-stone-700"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-xl border border-stone-100 bg-stone-50/50 p-6 transition-all hover:border-emerald-200 hover:bg-emerald-50/30">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200/70">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{desc}</p>
    </div>
  );
}

/* ── Icons ── */
function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CoverageIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" />
    </svg>
  );
}
