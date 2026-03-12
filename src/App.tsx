import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

// Lazy-loaded pages for code splitting
const MapPage = lazy(() => import("./pages/MapPage"));
const CoveragePage = lazy(() => import("./pages/CoveragePage"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

function App() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.dir = i18n.language === "he" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>

      <Authenticated>
        <Layout>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/coverage" element={<CoveragePage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
            </Routes>
          </Suspense>
        </Layout>
      </Authenticated>
    </>
  );
}

export default App;
