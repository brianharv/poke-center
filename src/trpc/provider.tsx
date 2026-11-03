"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/server/router";
import { leaveProtectedView } from "@/lib/auth-navigation";
import { signInDestination } from "@/lib/return-destination";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    function onError(error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        leaveProtectedView(
          client,
          signInDestination(window.location.pathname + window.location.search),
        );
      }
    }
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return client;
  });
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
