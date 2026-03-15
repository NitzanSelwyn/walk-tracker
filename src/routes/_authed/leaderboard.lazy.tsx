import { createLazyFileRoute } from "@tanstack/react-router";
import LeaderboardPage from "../../pages/LeaderboardPage";

export const Route = createLazyFileRoute("/_authed/leaderboard")({
  component: LeaderboardPage,
});
