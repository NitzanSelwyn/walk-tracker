import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import LoginPage from "../pages/LoginPage";

function RootComponent() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.dir = i18n.language === "he" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            fontSize: "0.875rem",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#f9fafb" },
          },
        }}
      />
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>

      <Authenticated>
        <Outlet />
      </Authenticated>
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
