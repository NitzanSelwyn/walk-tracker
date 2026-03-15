import { createFileRoute, Outlet } from "@tanstack/react-router";
import Layout from "../components/layout/Layout";

function AuthedLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});
