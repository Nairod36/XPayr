import { CCTPChain, SupportedChainId } from '../constants/cctp';
import type { CCTPChainConfig } from '../types/cctp';
import {
  CHAIN_TO_CHAIN_ID,
  CHAIN_TO_CHAIN_NAME,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES,
  CHAIN_IDS_TO_EXPLORER_URLS,
  CHAIN_TO_DESTINATION_DOMAIN,
  getRpcUrl,
} from '../constants/cctp';

/**
 * Utility functions for CCTP integration
 */

/**
 * Get chain configuration for a CCTP chain
 */
export function getChainConfig(chain: CCTPChain): CCTPChainConfig {
  const chainId = CHAIN_TO_CHAIN_ID[chain];
  
  if (!chainId) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return {
    chain,
    chainId,
    destinationDomain: CHAIN_TO_DESTINATION_DOMAIN[chain],
    name: CHAIN_TO_CHAIN_NAME[chain],
    nativeCurrency: getNativeCurrency(chain),
    rpcUrl: getRpcUrl(chainId),
    explorerUrl: CHAIN_IDS_TO_EXPLORER_URLS[chainId],
    contracts: {
      usdc: CHAIN_IDS_TO_USDC_ADDRESSES[chainId],
      tokenMessenger: CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES[chainId],
      messageTransmitter: CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES[chainId],
    },
  };
}

/**
 * Get native currency info for a chain
 */
export function getNativeCurrency(chain: CCTPChain): { name: string; symbol: string; decimals: number } {
  switch (chain) {
    case CCTPChain.ETH:
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    case CCTPChain.BASE:
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    case CCTPChain.ARB:
      return { name: 'Ether', symbol: 'ETH', decimals: 18 };
    case CCTPChain.POLYGON:
      return { name: 'Matic', symbol: 'MATIC', decimals: 18 };
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Get all supported chains
 */
export function getSupportedChains(): CCTPChain[] {
  return Object.values(CCTPChain);
}

/**
 * Get all supported chain configs
 */
export function getAllChainConfigs(): CCTPChainConfig[] {
  return getSupportedChains().map(getChainConfig);
}

/**
 * Validate if a chain is supported
 */
export function isChainSupported(chain: string): chain is CCTPChain {
  return Object.values(CCTPChain).includes(chain as CCTPChain);
}

/**
 * Get chain by chain ID
 */
export function getChainByChainId(chainId: number): CCTPChain | null {
  for (const [chain, id] of Object.entries(CHAIN_TO_CHAIN_ID)) {
    if (id === chainId) {
      return chain as CCTPChain;
    }
  }
  return null;
}

/**
 * Format USDC amount for display
 */
export function formatUSDCAmount(amount: string | number, decimals = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Parse USDC amount to units
 */
export function parseUSDCAmount(amount: string, decimals = 6): bigint {
  // Handle scientific notation and large numbers
  const [integer, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedDecimal);
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, length = 8): string {
  if (hash.length <= length * 2 + 2) return hash;
  return `${hash.slice(0, length + 2)}...${hash.slice(-length)}`;
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerTxUrl(chain: CCTPChain, txHash: string): string {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for address
 */
export function getExplorerAddressUrl(chain: CCTPChain, address: string): string {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}/address/${address}`;
}

/**
 * Estimate time for cross-chain transfer
 */
export function estimateTransferTime(fromChain: CCTPChain, toChain: CCTPChain): number {
  // Base time for CCTP is around 3-10 minutes
  // Factors that affect time:
  // - Source chain block time
  // - Network congestion
  // - Attestation service load
  
  const baseTime = 180; // 3 minutes base
  
  // Add extra time for certain chains
  let extraTime = 0;
  if (fromChain === CCTPChain.POLYGON || toChain === CCTPChain.POLYGON) {
    extraTime += 30; // Polygon checkpoint delays
  }
  
  return baseTime + extraTime;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  try {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * Validate USDC amount
 */
export function isValidUSDCAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M USDC
}

/**
 * Get minimum bridge amount for a chain
 */
export function getMinimumBridgeAmount(chain: CCTPChain): string {
  // Most chains have a minimum of 0.000001 USDC
  return '0.000001';
}

/**
 * Get maximum bridge amount for a chain
 */
export function getMaximumBridgeAmount(chain: CCTPChain): string {
  // Most chains support up to 1M USDC per transaction
  return '1000000';
}

/**
 * Calculate bridge fees (CCTP is typically free except for gas)
 */
export function calculateBridgeFees(fromChain: CCTPChain, toChain: CCTPChain, amount: string): {
  bridgeFee: string;
  estimatedGasFee: string;
} {
  // CCTP bridge is free, only gas costs
  const bridgeFee = '0';
  
  // Estimate gas fee based on chain
  let estimatedGasFee = '0.01'; // Default 0.01 ETH equivalent
  
  switch (fromChain) {
    case CCTPChain.ETH:
      estimatedGasFee = '0.02'; // Higher on mainnet
      break;
    case CCTPChain.BASE:
      estimatedGasFee = '0.001'; // Lower on L2
      break;
    case CCTPChain.ARB:
      estimatedGasFee = '0.001'; // Lower on L2
      break;
    case CCTPChain.POLYGON:
      estimatedGasFee = '0.005'; // MATIC is cheaper
      break;
  }
  
  return {
    bridgeFee,
    estimatedGasFee,
  };
}
