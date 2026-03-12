import { useTranslation } from "react-i18next";

export default function MapPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-gray-500">{t("map.title")} — {t("common.loading")}</p>
    </div>
  );
}
