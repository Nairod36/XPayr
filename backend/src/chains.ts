import { Chain } from './types';

export const CHAINS: Record<string, Chain> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    usdcAddress: '0xA0b86a33E6441051A82b4c5E0FE82C8b1DB8E4C5'
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://base.llamarpc.com',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  },
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  avalanche_testnet: {
    id: 43113,
    name: 'Avalanche Testnet',
    rpcUrl: process.env.AVALANCHE_TESTNET_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65'
  }
};
