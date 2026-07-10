import { QueryClient, queryOptions } from "@tanstack/react-query";
import { fetchSession } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export const sessionQuery = queryOptions({
  queryKey: ["wa-session"],
  queryFn: fetchSession,
  refetchInterval: (q) => (q.state.data?.connection === "open" ? 20000 : 3000),
});
