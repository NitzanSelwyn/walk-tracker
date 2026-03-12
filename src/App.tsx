import { Routes, Route } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import CoveragePage from "./pages/CoveragePage";
import FeedPage from "./pages/FeedPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CommunityPage from "./pages/CommunityPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";

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
        </Layout>
      </Authenticated>
    </>
  );
}

export default App;
