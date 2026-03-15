import { createLazyFileRoute } from "@tanstack/react-router";
import CoveragePage from "../../pages/CoveragePage";

export const Route = createLazyFileRoute("/_authed/coverage")({
  component: CoveragePage,
});
