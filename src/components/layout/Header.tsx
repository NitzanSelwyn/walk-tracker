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
        <a
          href="https://github.com/NitzanSelwyn/walk-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
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
