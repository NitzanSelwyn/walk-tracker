import { createLazyFileRoute } from "@tanstack/react-router";
import MapPage from "../../pages/MapPage";

export const Route = createLazyFileRoute("/_authed/map")({
  component: MapPage,
});
