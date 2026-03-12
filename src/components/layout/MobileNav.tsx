import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const navItems = [
  { path: "/", key: "home", icon: "🏠" },
  { path: "/map", key: "map", icon: "🗺️" },
  { path: "/coverage", key: "coverage", icon: "📊" },
  { path: "/feed", key: "feed", icon: "📰" },
  { path: "/profile", key: "profile", icon: "👤" },
] as const;

export default function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-gray-200 bg-white py-2 md:hidden">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center gap-0.5 text-xs ${
            location.pathname === item.path
              ? "text-emerald-600"
              : "text-gray-500"
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span>{t(`nav.${item.key}`)}</span>
        </Link>
      ))}
    </nav>
  );
}
