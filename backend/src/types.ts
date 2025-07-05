// Types pour XPayr
export interface Chain {
  id: number;
  name: string;
  rpcUrl: string;
  usdcAddress: string;
  envPrivateKey: string; // Nom de la variable d'env contenant la clé privée
  tokenMessenger: string; // Adresse du TokenMessenger Circle
  usdcDecimals: number; // Décimales du token USDC sur cette chaîne
  domainId: number; // Domain ID Circle CCTP pour la chaîne
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
