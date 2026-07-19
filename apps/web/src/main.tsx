import { ThemeProvider } from "@dealflow/ui/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
} from "react-router";
import { RouterProvider } from "react-router/dom";
import { authClient, safeRedirect } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import {
  AcceptInvite,
  Dashboard,
  HistoryTab,
  Layout,
  Login,
  NewOffer,
  Onboarding,
  QueueTab,
  SettingsTab,
  Signup,
  Team,
} from "@/routes";
import "@dealflow/ui/styles.css";

async function protectedLoader() {
  const { data, error } = await authClient.getSession();
  if (error && error.status !== 401) return null;
  if (!data) throw redirect("/login");
  if (!data.session.activeOrganizationId) throw redirect("/onboarding");
  return data;
}

async function guestLoader({ request }: LoaderFunctionArgs) {
  const { data } = await authClient.getSession();
  if (!data) return null;
  throw redirect(
    safeRedirect(new URL(request.url).searchParams.get("redirect")),
  );
}

const router = createBrowserRouter([
  { path: "/login", Component: Login, loader: guestLoader },
  { path: "/signup", Component: Signup, loader: guestLoader },
  { path: "/onboarding", Component: Onboarding },
  { path: "/accept-invite/:id", Component: AcceptInvite },
  {
    path: "/",
    Component: Layout,
    loader: protectedLoader,
    children: [
      { index: true, Component: Dashboard },
      { path: "new", Component: NewOffer },
      { path: "queue", Component: QueueTab },
      { path: "history", Component: HistoryTab },
      { path: "team", Component: Team },
      { path: "settings", Component: SettingsTab },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
