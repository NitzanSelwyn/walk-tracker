import { createLazyFileRoute } from "@tanstack/react-router";
import CommunityPage from "../../pages/CommunityPage";

export const Route = createLazyFileRoute("/_authed/community")({
  component: CommunityPage,
});
