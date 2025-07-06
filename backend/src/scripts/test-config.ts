/**
 * Quick configuration test script
 */

import dotenv from 'dotenv';
dotenv.config();

import { getRpcUrl } from '../constants/cctp';
import { SupportedChainId } from '../constants/cctp';

console.log('🔧 XPayr Configuration Test');
console.log('===========================\n');

console.log('Environment Variables:');
console.log(`- CIRCLE_API_KEY: ${process.env.CIRCLE_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`- ETHEREUM_RPC_URL: ${process.env.ETHEREUM_RPC_URL || 'Using default'}`);
console.log(`- BASE_RPC_URL: ${process.env.BASE_RPC_URL || 'Using default'}`);
console.log(`- ARBITRUM_RPC_URL: ${process.env.ARBITRUM_RPC_URL || 'Using default'}`);
console.log(`- POLYGON_RPC_URL: ${process.env.POLYGON_RPC_URL || 'Using default'}`);
console.log(`- AVALANCHE_RPC_URL: ${process.env.AVALANCHE_RPC_URL || 'Using default'}`);
console.log('');

console.log('Dynamic RPC URLs:');
console.log(`- ETH Sepolia: ${getRpcUrl(SupportedChainId.ETH_SEPOLIA)}`);
console.log(`- Base Sepolia: ${getRpcUrl(SupportedChainId.BASE_SEPOLIA)}`);
console.log(`- Avalanche Fuji: ${getRpcUrl(SupportedChainId.AVAX_FUJI)}`);
console.log(`- Arbitrum Sepolia: ${getRpcUrl(SupportedChainId.ARB_SEPOLIA)}`);
console.log('');

console.log('✅ Configuration loaded successfully!');

// Quick RPC test
async function testRpc() {
  const ethers = await import('ethers');
  const rpcUrl = getRpcUrl(SupportedChainId.ETH_SEPOLIA);
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log(`🌐 ETH Sepolia RPC Test: Block #${blockNumber} ✅`);
  } catch (error) {
    console.log(`❌ ETH Sepolia RPC Test failed: ${error}`);
  }

  try {
    const baseRpcUrl = getRpcUrl(SupportedChainId.BASE_SEPOLIA);
    const baseProvider = new ethers.JsonRpcProvider(baseRpcUrl);
    const baseBlockNumber = await baseProvider.getBlockNumber();
    console.log(`🌐 Base Sepolia RPC Test: Block #${baseBlockNumber} ✅`);
  } catch (error) {
    console.log(`❌ Base Sepolia RPC Test failed: ${error}`);
  }
}

testRpc().catch(console.error);
