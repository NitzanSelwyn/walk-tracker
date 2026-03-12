import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";

export default function UserMenu() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700"
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-10 z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.name ?? user.email}
            </p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t("nav.profile")}
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-gray-50"
          >
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
