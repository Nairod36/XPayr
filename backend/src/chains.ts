import { Chain } from './types';

export const CHAINS: Record<string, Chain> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    usdcAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    envPrivateKey: 'ETHEREUM_PRIVATE_KEY',
    tokenMessenger: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    usdcDecimals: 6,
    domainId: 0
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    envPrivateKey: 'POLYGON_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 1
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    envPrivateKey: 'ARBITRUM_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 3
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    envPrivateKey: 'OPTIMISM_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 2
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://base.llamarpc.com',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    envPrivateKey: 'BASE_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 6
  },
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    envPrivateKey: 'SEPOLIA_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 100
  },
  avalanche_testnet: {
    id: 43113,
    name: 'Avalanche Testnet',
    rpcUrl: process.env.AVALANCHE_TESTNET_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    envPrivateKey: 'AVALANCHE_TESTNET_PRIVATE_KEY',
    tokenMessenger: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcDecimals: 6,
    domainId: 7
  }
};
