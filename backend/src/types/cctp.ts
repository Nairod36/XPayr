import { CCTPChain, SupportedChainId, DestinationDomain } from '../constants/cctp';
export { CCTPChain, SupportedChainId, DestinationDomain } from '../constants/cctp';

/**
 * CCTP Bridge Request Interface
 */
export interface CCTPBridgeRequest {
  fromChain: CCTPChain;
  toChain: CCTPChain;
  amount: string; // Amount in USDC (human readable, e.g., "100.5")
  recipientAddress: string;
  senderPrivateKey?: string; // Optional for quote-only requests
  options?: CCTPBridgeOptions;
  dryRun?: boolean; // For simulation mode
}

/**
 * CCTP Bridge Options
 */
export interface CCTPBridgeOptions {
  gasLimit?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  deadline?: number; // Unix timestamp
  slippageTolerance?: number; // Percentage (e.g., 0.5 for 0.5%)
}

/**
 * CCTP Bridge Response
 */
export interface CCTPBridgeResponse {
  success: boolean;
  transactionHash?: string;
  messageId?: string;
  attestationHash?: string;
  status: CCTPBridgeStatus;
  message?: string;
  error?: string;
  estimatedTime?: number; // Estimated completion time in seconds
  fees?: {
    gasFee: string;
    bridgeFee?: string;
    totalFee: string;
  };
}

/**
 * CCTP Bridge Status
 */
export enum CCTPBridgeStatus {
  PENDING = 'PENDING',
  CONFIRMING = 'CONFIRMING',
  ATTESTING = 'ATTESTING',
  READY_TO_MINT = 'READY_TO_MINT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

/**
 * CCTP Message Information
 */
export interface CCTPMessage {
  messageId: string;
  sourceChain: CCTPChain;
  destinationChain: CCTPChain;
  sender: string;
  recipient: string;
  amount: string;
  nonce: string;
  status: CCTPBridgeStatus;
  createdAt: string;
  completedAt?: string;
  transactionHash: string;
  destinationTransactionHash?: string;
  attestation?: string;
}

/**
 * CCTP Fee Estimation
 */
export interface CCTPFeeEstimation {
  gasFee: string; // In native currency (ETH, AVAX, etc.)
  bridgeFee: string; // Usually 0 for CCTP
  totalFee: string;
  estimatedTime: number; // In seconds
}

/**
 * CCTP Chain Configuration
 */
export interface CCTPChainConfig {
  chain: CCTPChain;
  chainId: SupportedChainId;
  destinationDomain: DestinationDomain;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    usdc: string;
    tokenMessenger: string;
    messageTransmitter: string;
  };
}

/**
 * CCTP Attestation Response from Circle API
 */
export interface CCTPAttestationResponse {
  attestation: string;
  status: 'pending' | 'complete' | 'failed';
}

/**
 * CCTP Service Configuration
 */
export interface CCTPServiceConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  isTestnet?: boolean;
  defaultGasLimit?: number;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Transaction Receipt with CCTP Events
 */
export interface CCTPTransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  status: number;
  events: {
    messageSent?: {
      nonce: string;
      sender: string;
      recipient: string;
      destinationDomain: number;
      messageBody: string;
    };
    messageReceived?: {
      caller: string;
      sourceDomain: number;
      nonce: string;
      sender: string;
      messageBody: string;
    };
  };
}

/**
 * CCTP Quote Request
 */
export interface CCTPQuoteRequest {
  fromChain: CCTPChain;
  toChain: CCTPChain;
  amount: string;
  recipient?: string;
}

/**
 * CCTP Quote Response
 */
export interface CCTPQuoteResponse {
  fromChain: CCTPChain;
  toChain: CCTPChain;
  amount: string;
  fees: CCTPFeeEstimation;
  route: {
    sourceContract: string;
    destinationContract: string;
    messageTransmitter: string;
  };
  estimatedTime: number;
  minimumAmount: string;
  maximumAmount: string;
}
