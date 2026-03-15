import { createLazyFileRoute } from "@tanstack/react-router";
import ProfilePage from "../../../pages/ProfilePage";

export const Route = createLazyFileRoute("/_authed/profile/")({
  component: ProfilePage,
});
