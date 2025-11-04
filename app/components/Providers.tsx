"use client";

import { SessionProvider } from "next-auth/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { Provider as ReduxProvider } from "react-redux";
import { baseSepolia } from "viem/chains";
import { ApiProvider } from "../Context/ApiProvider";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import { WalletProvider } from "@/context/WalletContext";
import { AuthInitializer } from "./AuthInitializer";
import { store } from "../store/store";

interface ProvidersProps {
  children: React.ReactNode;
}

// NOTE: SessionProvider is kept for backward compatibility with existing credential-based logins.
// All new authentication should use Privy (PrivyProvider below).

export default function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider
        session={undefined}
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={true}
      >
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#6e54ff',
            },
            embeddedWallets: {
              ethereum: {
                createOnLogin: 'users-without-wallets',
              },
            },
            defaultChain: baseSepolia,
            supportedChains: [baseSepolia],
            // Enable wallet connection for post token creation
            loginMethods: ['email', 'wallet', 'google'],
          }}
        >
          <AuthInitializer>
            <ApiProvider>
              <WalletProvider>
                <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
              </WalletProvider>
            </ApiProvider>
          </AuthInitializer>
        </PrivyProvider>
      </SessionProvider>
    </ReduxProvider>
  );
}
