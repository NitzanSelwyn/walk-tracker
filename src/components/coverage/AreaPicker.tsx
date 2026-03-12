import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../../convex/_generated/dataModel";

interface Area {
  _id: Id<"areas">;
  name: string;
  nameHe?: string;
}

interface Props {
  areas: Area[];
  selectedId: Id<"areas"> | null;
  onSelect: (areaId: Id<"areas">) => void;
}

export default function AreaPicker({ areas, selectedId, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const getDisplayName = (area: Area) =>
    i18n.language === "he" ? area.nameHe || area.name : area.name;

  const selectedArea = areas.find((a) => a._id === selectedId);

  const filtered = areas.filter((a) =>
    getDisplayName(a).toLowerCase().includes(search.toLowerCase()),
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:border-emerald-400"
      >
        <span className={selectedArea ? "text-gray-800" : "text-gray-400"}>
          {selectedArea ? getDisplayName(selectedArea) : t("coverage.selectArea")}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-2 pb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("coverage.searchAreas")}
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No areas found</p>
            ) : (
              filtered.map((area) => (
                <button
                  key={area._id}
                  onClick={() => {
                    onSelect(area._id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-1.5 text-start text-sm transition-colors hover:bg-emerald-50 ${
                    area._id === selectedId
                      ? "bg-emerald-50 font-medium text-emerald-700"
                      : "text-gray-700"
                  }`}
                >
                  {getDisplayName(area)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
