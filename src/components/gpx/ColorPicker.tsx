import { ROUTE_COLORS } from "../../lib/gpx";

interface Props {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export default function ColorPicker({ value, onChange, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {ROUTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
            value === color
              ? "ring-2 ring-emerald-500 ring-offset-2"
              : "ring-1 ring-black/10"
          }`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
    </div>
  );
}
