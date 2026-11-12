import { QueryClient } from "@tanstack/react-query";

/** SQLite is local and authoritative; this cache is disposable. */
export function createWorkoutQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "always",
        staleTime: Infinity,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      },
      mutations: { networkMode: "always", retry: false },
    },
  });
}
