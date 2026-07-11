import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/query";
import {
  Dashboard,
  HistoryTab,
  Layout,
  NewOffer,
  QueueTab,
  SettingsTab,
} from "@/routes";
import "@/styles/globals.css";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "new", Component: NewOffer },
      { path: "queue", Component: QueueTab },
      { path: "history", Component: HistoryTab },
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
