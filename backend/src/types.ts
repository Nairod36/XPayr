// Types pour XPayr
export interface Chain {
  id: number;
  name: string;
  rpcUrl: string;
  usdcAddress: string;
}

export interface BackendWallet {
  address: string;
  privateKey: string; // Simplifié pour commencer
  chainId: number;
}

export interface BalanceInfo {
  chainId: number;
  chainName: string;
  balance: string;
  address: string;
}

export interface TransferRequest {
  toAddress: string;
  amount: string;
  chainId: number;
}
