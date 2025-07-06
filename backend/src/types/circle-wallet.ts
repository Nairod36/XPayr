/**
 * Types pour Circle Developer Controlled Wallets
 */

export interface CircleWalletConfig {
  apiKey: string;
  entitySecret: string;
  baseUrl: string;
  walletSetId?: string;
  isTestnet?: boolean;
}

export interface CircleWalletSet {
  id: string;
  name: string;
  custodyType: 'DEVELOPER';
  updateDate: string;
  createDate: string;
}

export interface CircleWallet {
  id: string;
  state: 'LIVE' | 'FROZEN';
  walletSetId: string;
  custodyType: 'DEVELOPER';
  address: string;
  blockchain: string;
  accountType: 'SCA' | 'EOA';
  updateDate: string;
  createDate: string;
  metadata?: Array<{
    name: string;
    refId: string;
  }>;
}

export interface CircleWalletBalance {
  token: {
    id: string;
    blockchain: string;
    tokenAddress?: string;
    standard: string;
    name: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
  };
  amount: string;
  updateDate: string;
}

export interface CircleTransferRequest {
  walletId: string;
  blockchain: string;
  destinationAddress: string;
  tokenId: string;
  amount: string;
  fee?: {
    type: 'level' | 'unit';
    config: {
      feeLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
      maxFee?: string;
      priorityFee?: string;
    };
  };
  metadata?: {
    name?: string;
    refId?: string;
  };
}

export interface CircleTransaction {
  id: string;
  blockchain: string;
  tokenId: string;
  walletId: string;
  sourceAddress: string;
  destinationAddress: string;
  transactionType: 'OUTBOUND' | 'INBOUND';
  custodyType: 'DEVELOPER';
  state: 'QUEUED' | 'SENT' | 'CONFIRMED' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  amounts: Array<{
    amount: string;
    currency: string;
  }>;
  nfts?: any[];
  txHash?: string;
  blockHash?: string;
  blockHeight?: number;
  networkFee?: string;
  firstConfirmDate?: string;
  operation: 'TRANSFER';
  abiParameters?: any;
  createDate: string;
  updateDate: string;
  metadata?: {
    name?: string;
    refId?: string;
  };
}

export interface CircleTransactionState {
  QUEUED: 'Transaction is queued for processing';
  SENT: 'Transaction has been sent to the blockchain';
  CONFIRMED: 'Transaction has received initial confirmation';
  COMPLETE: 'Transaction is complete and finalized';
  FAILED: 'Transaction failed';
  CANCELLED: 'Transaction was cancelled';
}

export interface CircleBlockchain {
  name: string;
  displayName: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface CircleToken {
  id: string;
  blockchain: string;
  tokenAddress?: string;
  standard: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  updateDate: string;
  createDate: string;
}

// Mapping des chaînes CCTP vers les blockchains Circle
export const CCTP_TO_CIRCLE_BLOCKCHAIN = {
  ETH: {
    testnet: 'ETH-SEPOLIA',
    mainnet: 'ETH'
  },
  BASE: {
    testnet: 'BASE-SEPOLIA',
    mainnet: 'BASE'
  },
  ARB: {
    testnet: 'ARB-SEPOLIA',
    mainnet: 'ARB'
  },
  POLYGON: {
    testnet: 'MATIC-AMOY',
    mainnet: 'MATIC'
  }
} as const;

// Token IDs USDC pour chaque blockchain
export const USDC_TOKEN_IDS = {
  'ETH-SEPOLIA': '36b1737c-dda6-56b1-aa59-7c518a4d1315',
  'BASE-SEPOLIA': 'base-sepolia-usdc-token-id', // À obtenir depuis Circle Console
  'ARB-SEPOLIA': 'arbitrum-sepolia-usdc-token-id', // À obtenir depuis Circle Console
  'MATIC-AMOY': 'polygon-amoy-usdc-token-id', // À obtenir depuis Circle Console
  // Mainnet
  'ETH': 'eth-mainnet-usdc-token-id',
  'BASE': 'base-mainnet-usdc-token-id',
  'ARB': 'arbitrum-mainnet-usdc-token-id',
  'MATIC': 'polygon-mainnet-usdc-token-id',
} as const;

export type CircleBlockchainName = keyof typeof USDC_TOKEN_IDS;
