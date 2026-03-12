import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function GpxUploader({ onFileSelected, disabled }: Props) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith(".gpx")) {
        onFileSelected(file);
      }
    },
    [onFileSelected, disabled],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = "";
    }
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-all duration-200 ${
        dragging
          ? "border-emerald-400 bg-emerald-50 scale-[1.02]"
          : disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <svg
        className="mx-auto mb-2 h-8 w-8 text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p className="text-sm font-medium text-gray-700">{t("map.uploadGpx")}</p>
      <p className="mt-1 text-xs text-gray-400">{t("map.dropGpx")}</p>
    </div>
  );
}
