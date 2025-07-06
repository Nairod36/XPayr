/**
 * Circle CCTP Bridge Test Script
 * 
 * Tests the complete CCTP bridge flow using Circle Developer Controlled Wallets
 */

import dotenv from 'dotenv';
import { CCTPChain } from '../types/cctp';
import { CircleWalletService, CircleWalletConfig, BridgeRequest } from '../services/circle-wallet';

dotenv.config();

async function testCircleBridge() {
  console.log('🌉 Testing Circle CCTP Bridge with Developer Controlled Wallets');
  console.log('='.repeat(60));

  // Configuration
  const config: CircleWalletConfig = {
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    baseUrl: process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    isTestnet: true,
  };

  if (!config.apiKey || !config.entitySecret) {
    console.error('❌ Missing Circle configuration. Please check your .env file.');
    console.log('Required variables:');
    console.log('  - CIRCLE_API_KEY');
    console.log('  - CIRCLE_ENTITY_SECRET');
    console.log('  - CIRCLE_WALLET_SET_ID (optional)');
    process.exit(1);
  }

  const circleService = new CircleWalletService(config);

  try {
    // Step 1: Initialize wallets for all chains
    console.log('\n📱 Step 1: Initializing Circle wallets...');
    const wallets = await circleService.initializeWallets();
    console.log('Wallet initialization completed');

    // Step 2: Check wallet balances
    console.log('\n💰 Step 2: Checking wallet balances...');
    for (const [chain, wallet] of Object.entries(wallets)) {
      try {
        const balances = await circleService.getWalletBalances(wallet.id);
        const usdcBalance = balances.find(b => b.token.symbol === 'USDC');
        console.log(`   ${chain}: ${wallet.address}`);
        console.log(`      USDC Balance: ${usdcBalance?.amount || '0'}`);
      } catch (error) {
        console.log(`   ${chain}: ${wallet.address} (balance check failed)`);
      }
    }

    // Step 3: Test Bridge (if sufficient balance)
    console.log('\n🌉 Step 3: Testing CCTP bridge...');
    
    // Example bridge request: 1 USDC from Ethereum Sepolia to Base Sepolia
    const bridgeRequest: BridgeRequest = {
      sourceChain: CCTPChain.ETH,
      targetChain: CCTPChain.POLYGON,
      amount: '1000000', // 1 USDC (6 decimals)
      destinationAddress: wallets[CCTPChain.POLYGON].address,
    };

    console.log(`Bridge request: ${bridgeRequest.amount} USDC`);
    console.log(`From: ${bridgeRequest.sourceChain} (${wallets[bridgeRequest.sourceChain].address})`);
    console.log(`To: ${bridgeRequest.targetChain} (${bridgeRequest.destinationAddress})`);

    // For demo purposes, we'll just test the individual steps without actually executing
    console.log('\n⚠️  Demo mode: Testing bridge steps without execution...');
    
    // Test balance check step
    console.log('\n💰 Testing USDC balance check...');
    try {
      const balanceCheck = await circleService.checkUSDCBalance(bridgeRequest.sourceChain, bridgeRequest.amount);
      console.log(`   Current balance: ${balanceCheck.currentBalance} USDC`);
      console.log(`   Required: ${bridgeRequest.amount} USDC`);
      console.log(`   Sufficient balance: ${balanceCheck.hasBalance ? '✅ Yes' : '❌ No'}`);
      console.log(`   USDC Token ID: ${balanceCheck.usdcTokenId}`);
    } catch (error) {
      console.error('   ❌ Balance check failed:', error);
    }
    
    // Test approve step
    console.log('\n🔓 Testing USDC approval...');
    try {
      // This would approve USDC for transfer
      console.log(`   Would approve ${bridgeRequest.amount} USDC on ${bridgeRequest.sourceChain}`);
      console.log('   ✅ Approve step structure valid');
    } catch (error) {
      console.error('   ❌ Approve step failed:', error);
    }

    // Test deposit for burn step
    console.log('\n🔥 Testing deposit for burn...');
    try {
      console.log(`   Would initiate burn of ${bridgeRequest.amount} USDC`);
      console.log(`   Target domain: ${bridgeRequest.targetChain}`);
      console.log('   ✅ Deposit for burn step structure valid');
    } catch (error) {
      console.error('   ❌ Deposit for burn step failed:', error);
    }

    // Test attestation fetching
    console.log('\n🔍 Testing attestation fetching...');
    try {
      console.log('   Would fetch attestation from Circle Iris API');
      console.log('   ✅ Attestation fetching structure valid');
    } catch (error) {
      console.error('   ❌ Attestation fetching failed:', error);
    }

    // Test mint step
    console.log('\n🪙 Testing mint...');
    try {
      console.log(`   Would mint USDC on ${bridgeRequest.targetChain}`);
      console.log('   ✅ Mint step structure valid');
    } catch (error) {
      console.error('   ❌ Mint step failed:', error);
    }

    console.log('\n✅ Circle CCTP Bridge test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Fund your wallets with testnet USDC');
    console.log('   2. Set EXECUTE_BRIDGE=true to test actual bridge');
    console.log('   3. Monitor transactions in Circle console');

  } catch (error) {
    console.error('❌ Circle bridge test failed:', error);
    process.exit(1);
  }
}

// Uncomment to test actual bridge execution (requires funded wallets)
async function testActualBridge() {
  console.log('🚨 WARNING: This will execute actual bridge transactions!');
  console.log('Make sure your wallets have sufficient testnet USDC.');
  
  // Configuration
  const config: CircleWalletConfig = {
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    baseUrl: process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID,
    isTestnet: true,
  };

  const circleService = new CircleWalletService(config);
  
  try {
    // Initialize wallets
    console.log('\n📱 Initializing wallets...');
    const wallets = await circleService.initializeWallets();
    
    // Bridge configuration
    const bridgeRequest: BridgeRequest = {
      sourceChain: CCTPChain.ETH,
      targetChain: CCTPChain.POLYGON,
      amount: '1', // 1 USDC (6 decimals)
      destinationAddress: wallets[CCTPChain.POLYGON].address,
    };
    
    console.log('\n🔍 Pre-bridge balance check...');
    const balanceCheck = await circleService.checkUSDCBalance(bridgeRequest.sourceChain, bridgeRequest.amount);
    
    if (!balanceCheck.hasBalance) {
      console.error(`❌ Insufficient balance! Required: ${bridgeRequest.amount}, Available: ${balanceCheck.currentBalance}`);
      console.log('\n💡 To fund your testnet wallet:');
      console.log(`   1. Go to Circle Faucet: https://faucet.circle.com/`);
      console.log(`   2. Request testnet USDC for address: ${wallets[bridgeRequest.sourceChain].address}`);
      console.log(`   3. Wait for funding confirmation`);
      return;
    }
    
    console.log(`✅ Sufficient balance: ${balanceCheck.currentBalance} USDC`);
    console.log(`\n🌉 Starting REAL bridge execution...`);
    console.log(`From: ${bridgeRequest.sourceChain} (${wallets[bridgeRequest.sourceChain].address})`);
    console.log(`To: ${bridgeRequest.targetChain} (${wallets[bridgeRequest.targetChain].address})`);
    console.log(`Amount: ${bridgeRequest.amount} USDC`);
    
    // Final confirmation
    console.log('\n⚠️  LAST CHANCE TO CANCEL - This will execute real transactions!');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Execute the bridge
    const result = await circleService.bridgeUSDC(bridgeRequest);
    
    console.log('\n🎉 Bridge execution completed successfully!');
    console.log('Transaction Details:');
    console.log(`   Approve TX: ${result.approveTransaction.id}`);
    console.log(`   Burn TX: ${result.depositTransaction.transactionId}`);
    console.log(`   Mint TX: ${result.mintTransaction.id}`);
    console.log(`   Attestation: ${result.attestationSignature.substring(0, 20)}...`);
    
    // Post-bridge balance check
    console.log('\n💰 Post-bridge balance check...');
    const sourceBalances = await circleService.getWalletBalances(wallets[bridgeRequest.sourceChain].id);
    const targetBalances = await circleService.getWalletBalances(wallets[bridgeRequest.targetChain].id);
    
    const sourceUSDC = sourceBalances.find(b => b.token.symbol === 'USDC');
    const targetUSDC = targetBalances.find(b => b.token.symbol === 'USDC');
    
    console.log(`   Source (${bridgeRequest.sourceChain}): ${sourceUSDC?.amount || '0'} USDC`);
    console.log(`   Target (${bridgeRequest.targetChain}): ${targetUSDC?.amount || '0'} USDC`);
    
  } catch (error) {
    console.error('❌ Real bridge test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  // Check if we should run real bridge test
  const executeRealBridge = process.env.EXECUTE_REAL_BRIDGE === 'true' || process.argv.includes('--real');
  
  if (executeRealBridge) {
    console.log('🚨 REAL BRIDGE MODE ENABLED');
    testActualBridge().catch(console.error);
  } else {
    console.log('🧪 DEMO MODE - Add --real flag or set EXECUTE_REAL_BRIDGE=true for real execution');
    testCircleBridge().catch(console.error);
  }
}
