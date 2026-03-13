import { useTranslation } from "react-i18next";

interface CoverageData {
  coveredLengthKm: number;
  totalLengthKm: number;
  coveragePercent: number;
  coveredRoadCount: number;
  totalRoadCount: number;
  calculatedAt?: number;
}

interface Props {
  coverage: CoverageData | null;
  onRecalculate: () => void;
  calculating: boolean;
}

export default function CoverageStats({
  coverage,
  onRecalculate,
  calculating,
}: Props) {
  const { t } = useTranslation();
  const percent = coverage?.coveragePercent ?? 0;

  return (
    <div>
      {/* Large percentage display */}
      <div className="text-center">
        <span className="text-5xl font-extrabold tabular-nums text-emerald-600">
          {percent.toFixed(1)}
        </span>
        <span className="text-2xl font-bold text-emerald-600/70">%</span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Stats grid */}
      {coverage && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatItem
            label={t("coverage.covered")}
            value={`${coverage.coveredLengthKm.toFixed(1)} ${t("common.km")}`}
          />
          <StatItem
            label={t("coverage.distance")}
            value={`${coverage.totalLengthKm.toFixed(1)} ${t("common.km")}`}
          />
          <StatItem
            label={t("coverage.roads")}
            value={`${coverage.coveredRoadCount} / ${coverage.totalRoadCount}`}
          />
        </div>
      )}

      {/* Last updated + recalculate */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        {coverage?.calculatedAt ? (
          <span>
            {t("coverage.lastUpdated", {
              time: new Date(coverage.calculatedAt).toLocaleDateString(),
            })}
          </span>
        ) : (
          <span>{t("coverage.pendingCalculation")}</span>
        )}
        <button
          onClick={onRecalculate}
          disabled={calculating}
          className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
        >
          {calculating ? (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              {t("common.loading")}
            </span>
          ) : (
            t("coverage.recalculate")
          )}
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
