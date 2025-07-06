import "@walletconnect/react-native-compat";
import { createContext, ReactNode, useContext, useState } from "react";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // For demo purposes, simulate wallet connection
      // In a real app, you would use WalletConnect here
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockAddress = "0x742d35Cc6635C0532925a3b8D6b6C0532e26D1e5";
      const mockChainId = 1; // Ethereum mainnet

      setAddress(mockAddress);
      setChainId(mockChainId);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      setError(null);
      setAddress(null);
      setChainId(null);
      setIsConnected(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect wallet"
      );
    }
  };

  const value: WalletContextType = {
    isConnected,
    address,
    chainId,
    connect,
    disconnect,
    isConnecting,
    error,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}