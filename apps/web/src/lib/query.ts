import { QueryClient, queryOptions } from "@tanstack/react-query";
import { apiGet } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export const sessionQuery = queryOptions({
  queryKey: ["wa-session"],
  queryFn: (): Promise<{ connection: string; qr: string | null }> =>
    apiGet("/wa/session"),
  refetchInterval: (q) => (q.state.data?.connection === "open" ? 20000 : 3000),
});
