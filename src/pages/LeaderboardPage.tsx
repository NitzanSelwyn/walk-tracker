import { useTranslation } from "react-i18next";

export default function LeaderboardPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t("leaderboard.title")}
      </h1>
      <p className="text-gray-500">{t("coverage.selectArea")}</p>
    </div>
  );
}
