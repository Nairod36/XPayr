/**
 * Check wallet balances on testnet chains
 * Usage: npm run check:balances
 */

import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import { CCTPChain } from '../types/cctp';
import { 
  CHAIN_TO_CHAIN_ID, 
  CHAIN_IDS_TO_USDC_ADDRESSES,
  getRpcUrl 
} from '../constants/cctp';

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function checkBalance(chain: CCTPChain, address: string) {
  try {
    const chainId = CHAIN_TO_CHAIN_ID[chain];
    const rpcUrl = getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    const ethFormatted = ethers.formatEther(ethBalance);
    
    // Get USDC balance
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId];
    const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, provider);
    
    const usdcBalance = await usdcContract.balanceOf(address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    
    return {
      chain,
      address,
      eth: ethFormatted,
      usdc: usdcFormatted,
      hasEth: parseFloat(ethFormatted) > 0,
      hasUsdc: parseFloat(usdcFormatted) > 0
    };
  } catch (error) {
    return {
      chain,
      address,
      eth: 'Error',
      usdc: 'Error',
      hasEth: false,
      hasUsdc: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  console.log('💰 XPayr Wallet Balance Checker');
  console.log('================================\n');

  const addresses = {
    [CCTPChain.ETH]: process.env.ETHEREUM_ADDRESS,
    [CCTPChain.BASE]: process.env.BASE_ADDRESS,
    [CCTPChain.ARB]: process.env.ARBITRUM_ADDRESS,
    [CCTPChain.POLYGON]: process.env.POLYGON_ADDRESS,
  };

  console.log('📍 Checking balances for:');
  Object.entries(addresses).forEach(([chain, address]) => {
    console.log(`   ${chain}: ${address || 'Not set'}`);
  });
  console.log();

  const results = [];
  
  for (const [chainName, address] of Object.entries(addresses)) {
    if (address) {
      console.log(`🔍 Checking ${chainName}...`);
      const result = await checkBalance(chainName as CCTPChain, address);
      results.push(result);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      } else {
        console.log(`   ETH: ${result.eth} ${result.hasEth ? '✅' : '❌'}`);
        console.log(`   USDC: ${result.usdc} ${result.hasUsdc ? '✅' : '❌'}`);
      }
      console.log();
    }
  }

  console.log('📊 Summary:');
  console.log('==========');
  
  let readyForTesting = true;
  
  for (const result of results) {
    const status = result.hasEth && result.hasUsdc ? '✅ Ready' : '⚠️  Needs funds';
    console.log(`${result.chain}: ${status}`);
    
    if (!result.hasEth || !result.hasUsdc) {
      readyForTesting = false;
      if (!result.hasEth) console.log(`   - Need ETH for gas fees`);
      if (!result.hasUsdc) console.log(`   - Need USDC for transfers`);
    }
  }
  
  console.log();
  
  if (readyForTesting) {
    console.log('🎉 All wallets have sufficient funds for testing!');
    console.log('   Run: npm run test:real-cctp');
  } else {
    console.log('💡 Get testnet funds:');
    console.log('   - ETH Sepolia: https://sepoliafaucet.com/');
    console.log('   - Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    console.log('   - USDC (all chains): https://faucet.circle.com/');
    console.log('   - See TESTNET_GUIDE.md for more details');
  }
}

main().catch(console.error);
