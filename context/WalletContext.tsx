"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrowserProvider, ethers, Contract, formatUnits } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

type TokenBalance = {
  raw: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
  name: string;
};

type WalletContextType = {
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getTokenBalance: (tokenAddress: string) => Promise<TokenBalance>;
  getETHBalance: () => Promise<string>;
};

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  getTokenBalance: async () => ({
    raw: 0n,
    formatted: "0",
    decimals: 18,
    symbol: "",
    name: "",
  }),
  getETHBalance: async () => "0",
});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // Initialize provider and signer when Privy wallet is available
  useEffect(() => {
    const initializePrivyWallet = async () => {
      console.log('🔍 WalletContext: Initialize check', { authenticated, walletsCount: wallets.length, user });

      if (authenticated && wallets.length > 0) {
        try {
          const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

          if (!embeddedWallet) {
            console.warn('⚠️ WalletContext: No Privy embedded wallet found');
            console.log('Available wallets:', wallets.map(w => ({ type: w.walletClientType, address: w.address })));
            return;
          }

          console.log('🔍 WalletContext: Found Privy wallet:', embeddedWallet);
          console.log('🔍 WalletContext: Wallet address:', embeddedWallet.address);

          // Switch to Base Sepolia (chain ID 84532)
          console.log('🔍 WalletContext: Switching to Base Sepolia (84532)...');
          await embeddedWallet.switchChain(84532);

          console.log('🔍 WalletContext: Getting Ethers provider from Privy wallet...');
          // Use the wallet's getEthereumProvider method
          const ethereumProvider = await embeddedWallet.getEthereumProvider();
          const _provider = new BrowserProvider(ethereumProvider);
          const _signer = await _provider.getSigner();
          const _address = await _signer.getAddress();

          console.log('✅ WalletContext: Privy wallet initialized', { address: _address });
          setProvider(_provider);
          setSigner(_signer);
          setAddress(_address);
        } catch (error) {
          console.error("❌ WalletContext: Failed to initialize Privy wallet:", error);
          console.error("Error details:", error);
        }
      } else {
        // Clear state if not authenticated
        console.log('⚠️ WalletContext: Clearing wallet state');
        setProvider(null);
        setSigner(null);
        setAddress(null);
      }
    };

    initializePrivyWallet();
  }, [authenticated, wallets, user]);

  const connect = async () => {
    try {
      setIsConnecting(true);
      await login();
    } catch (error) {
      console.error("Failed to connect with Privy:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
  };

  const getTokenBalance = async (
    tokenAddress: string
  ): Promise<TokenBalance> => {
    if (!provider || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

      const [balance, decimals, symbol, name] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.name(),
      ]);

      const formattedBalance = formatUnits(balance, decimals);

      return {
        raw: balance,
        formatted: formattedBalance,
        decimals,
        symbol,
        name,
      };
    } catch (error) {
      console.error("Error fetching token balance:", error);
      throw error;
    }
  };

  const getETHBalance = async (): Promise<string> => {
    console.log('🔍 getETHBalance called', { provider: !!provider, address });

    if (!provider || !address) {
      console.error('❌ getETHBalance: Wallet not connected', { provider: !!provider, address });
      throw new Error("Wallet not connected");
    }

    try {
      console.log('🔍 getETHBalance: Fetching balance for address:', address);
      const balance = await provider.getBalance(address);
      console.log('🔍 getETHBalance: Raw balance:', balance.toString());
      const formatted = formatUnits(balance, 18);
      console.log('✅ getETHBalance: Formatted balance:', formatted);
      return formatted;
    } catch (error) {
      console.error("❌ getETHBalance: Error fetching balance:", error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        isConnecting,
        connect,
        disconnect,
        getTokenBalance,
        getETHBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => useContext(WalletContext);
