import { createLazyFileRoute } from "@tanstack/react-router";
import FeedPage from "../../pages/FeedPage";

export const Route = createLazyFileRoute("/_authed/feed")({
  component: FeedPage,
});
