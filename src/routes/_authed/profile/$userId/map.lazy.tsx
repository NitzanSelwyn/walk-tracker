import { createLazyFileRoute } from "@tanstack/react-router";
import UserMapPage from "../../../../pages/UserMapPage";

export const Route = createLazyFileRoute("/_authed/profile/$userId/map")({
  component: UserMapPage,
});
