import { createLazyFileRoute } from "@tanstack/react-router";
import SettingsPage from "../../pages/SettingsPage";

export const Route = createLazyFileRoute("/_authed/settings")({
  component: SettingsPage,
});
