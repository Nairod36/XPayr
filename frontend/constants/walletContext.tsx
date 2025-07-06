import { createContext, ReactNode, useContext, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

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
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      setError(null);
      const connector = connectors[0];
      await connectAsync({ connector });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const disconnectWallet = async () => {
    try {
      setError(null);
      disconnect();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect wallet'
      );
    }
  };

  const value: WalletContextType = {
    isConnected,
    address,
    chainId,
    connect,
    disconnect: disconnectWallet,
    isConnecting: isPending,
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