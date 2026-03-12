import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserMenu from "../auth/UserMenu";

const navLinks = [
  { path: "/", key: "home" },
  { path: "/map", key: "map" },
  { path: "/coverage", key: "coverage" },
  { path: "/feed", key: "feed" },
  { path: "/leaderboard", key: "leaderboard" },
  { path: "/community", key: "community" },
] as const;

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const toggleLanguage = () => {
    const next = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(next);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-emerald-600">
          {t("app.title")}
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          {i18n.language === "he" ? "EN" : "עב"}
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
