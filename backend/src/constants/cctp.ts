/**
 * CCTP Configuration Constants
 * Based on Circle's CCTP sample app structure
 */

/**
 * List of all the chains/networks supported for CCTP
 */
export enum CCTPChain {
  ETH = 'ETH',
  BASE = 'BASE',
  ARB = 'ARB',
  POLYGON = 'POLYGON',
}

/**
 * List of all the chain/network IDs supported for CCTP
 */
export enum SupportedChainId {
  // Mainnets
  ETH_MAINNET = 1,
  BASE_MAINNET = 8453,
  AVAX_MAINNET = 43114,
  ARB_MAINNET = 42161,
  POLYGON_MAINNET = 137,
  
  // Testnets
  ETH_SEPOLIA = 11155111,
  BASE_SEPOLIA = 84532,
  AVAX_FUJI = 43113,
  ARB_SEPOLIA = 421614,
  POLYGON_MUMBAI = 80001,
}

/**
 * Circle-defined domain IDs for CCTP
 */
export enum DestinationDomain {
  ETH = 0,
  AVAX = 1,
  ARB = 3,
  BASE = 6,
  POLYGON = 7,
}

/**
 * Maps chains to their chain IDs
 */
export const CHAIN_TO_CHAIN_ID = {
  [CCTPChain.ETH]: SupportedChainId.ETH_SEPOLIA, // Default to testnet
  [CCTPChain.BASE]: SupportedChainId.BASE_SEPOLIA,
  [CCTPChain.ARB]: SupportedChainId.ARB_SEPOLIA,
  [CCTPChain.POLYGON]: SupportedChainId.POLYGON_MUMBAI,
} as const

/**
 * Maps chains to their readable names
 */
export const CHAIN_TO_CHAIN_NAME = {
  [CCTPChain.ETH]: 'Ethereum',
  [CCTPChain.BASE]: 'Base',
  [CCTPChain.ARB]: 'Arbitrum',
  [CCTPChain.POLYGON]: 'Polygon',
}

/**
 * Maps chain IDs to USDC contract addresses (Testnet)
 */
export const CHAIN_IDS_TO_USDC_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [SupportedChainId.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [SupportedChainId.ARB_SEPOLIA]: '0x75faf114eafb1BDBe2F0316DF893fD58CE46AA4d',
  [SupportedChainId.POLYGON_MUMBAI]: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97',
} as const

/**
 * Maps chain IDs to TokenMessenger contract addresses (Testnet)
 */
export const CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChainId.BASE_SEPOLIA]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChainId.ARB_SEPOLIA]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChainId.POLYGON_MUMBAI]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
} as const

/**
 * Maps chain IDs to MessageTransmitter contract addresses (Testnet)
 */
export const CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  [SupportedChainId.BASE_SEPOLIA]: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  [SupportedChainId.ARB_SEPOLIA]: '0xaCF1ceeF35Caac005e15888dDb8a3515C41B4872',
  [SupportedChainId.POLYGON_MUMBAI]: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
} as const

/**
 * Maps chains to their destination domains
 */
export const CHAIN_TO_DESTINATION_DOMAIN = {
  [CCTPChain.ETH]: DestinationDomain.ETH,
  [CCTPChain.BASE]: DestinationDomain.BASE,
  [CCTPChain.ARB]: DestinationDomain.ARB,
  [CCTPChain.POLYGON]: DestinationDomain.POLYGON,
}

/**
 * RPC URLs for supported chains (Testnet)
 * Note: Environment variables are loaded in the main application
 */
const getChainRpcUrl = (chainId: SupportedChainId): string => {
  const rpcUrls: Record<SupportedChainId, string> = {
    [SupportedChainId.ETH_SEPOLIA]: process.env.ETHEREUM_RPC_URL || 'https://rpc.sepolia.org',
    [SupportedChainId.BASE_SEPOLIA]: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
    [SupportedChainId.ARB_SEPOLIA]: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    [SupportedChainId.POLYGON_MUMBAI]: process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    // Mainnets (for future use)
    [SupportedChainId.ETH_MAINNET]: process.env.ETHEREUM_MAINNET_RPC_URL || '',
    [SupportedChainId.BASE_MAINNET]: process.env.BASE_MAINNET_RPC_URL || '',
    [SupportedChainId.ARB_MAINNET]: process.env.ARBITRUM_MAINNET_RPC_URL || '',
    [SupportedChainId.POLYGON_MAINNET]: process.env.POLYGON_MAINNET_RPC_URL || '',
    // Keep AVAX entries for compatibility but they won't be used
    [SupportedChainId.AVAX_FUJI]: '',
    [SupportedChainId.AVAX_MAINNET]: '',
  };
  return rpcUrls[chainId];
};

// Note: Use getRpcUrl() function instead of this static object to ensure environment variables are loaded
export const CHAIN_IDS_TO_RPC_URLS = {
  get [SupportedChainId.ETH_SEPOLIA]() { return getChainRpcUrl(SupportedChainId.ETH_SEPOLIA); },
  get [SupportedChainId.BASE_SEPOLIA]() { return getChainRpcUrl(SupportedChainId.BASE_SEPOLIA); },
  get [SupportedChainId.ARB_SEPOLIA]() { return getChainRpcUrl(SupportedChainId.ARB_SEPOLIA); },
  get [SupportedChainId.POLYGON_MUMBAI]() { return getChainRpcUrl(SupportedChainId.POLYGON_MUMBAI); },
}

// Export helper function for dynamic RPC URL resolution
export const getRpcUrl = getChainRpcUrl;

/**
 * Block explorer URLs for supported chains
 */
export const CHAIN_IDS_TO_EXPLORER_URLS = {
  [SupportedChainId.ETH_SEPOLIA]: 'https://sepolia.etherscan.io',
  [SupportedChainId.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
  [SupportedChainId.AVAX_FUJI]: 'https://testnet.snowtrace.io',
  [SupportedChainId.ARB_SEPOLIA]: 'https://sepolia.arbiscan.io',
  [SupportedChainId.POLYGON_MUMBAI]: 'https://mumbai.polygonscan.com',
} as const

/**
 * USDC decimals (consistent across all chains)
 */
export const USDC_DECIMALS = 6;

/**
 * Circle Attestation API URLs
 */
export const IRIS_ATTESTATION_API = {
  TESTNET: 'https://iris-api-sandbox.circle.com',
  MAINNET: 'https://iris-api.circle.com',
}
