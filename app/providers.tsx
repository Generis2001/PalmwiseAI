"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ritualChain } from "@/lib/ritual/chain";
import { ChainGuard } from "@/components/ChainGuard";

const config = getDefaultConfig({
  appName: "PalmWise AI",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "palmwise",
  chains: [ritualChain],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#19D184",
            accentColorForeground: "black",
            borderRadius: "medium",
          })}
        >
          {children}
          <ChainGuard />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
