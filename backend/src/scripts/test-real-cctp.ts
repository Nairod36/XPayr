/**
 * Real testnet test script for XPayr CCTP integration
 * Usage: npm run test:real-cctp
 * 
 * ⚠️  ATTENTION: Ce script exécute de vraies transactions sur testnet !
 *    Assurez-vous d'avoir des fonds testnet avant de l'exécuter.
 */

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { IntegratedXPayrService } from '../services/integrated-service';
import { CCTPChain } from '../types/cctp';
import { config, validateConfig } from '../config';
import { 
  getChainConfig, 
  formatUSDCAmount, 
  getExplorerTxUrl, 
  estimateTransferTime, 
  isValidAddress 
} from '../utils/cctp';

async function main() {
  console.log('🚀 XPayr CCTP Real Testnet Test');
  console.log('===============================\n');

  console.log('⚠️  WARNING: This script will execute REAL transactions on testnet!');
  console.log('    Make sure you have testnet funds before proceeding.\n');

  // 1. Validate configuration
  console.log('1. Validating configuration...');
  const configValidation = validateConfig();
  if (!configValidation.isValid) {
    console.error('❌ Configuration errors:');
    configValidation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  console.log('✅ Configuration valid\n');

  // 2. Check if we have private keys
  console.log('2. Checking private keys...');
  const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY;
  const basePrivateKey = process.env.BASE_PRIVATE_KEY;
  
  if (!ethereumPrivateKey || !basePrivateKey) {
    console.error('❌ Missing private keys!');
    console.error('   Please set ETHEREUM_PRIVATE_KEY and BASE_PRIVATE_KEY in your .env file');
    process.exit(1);
  }
  
  console.log('✅ Private keys found');
  console.log(`   Ethereum Address: ${process.env.ETHEREUM_ADDRESS || 'Not set'}`);
  console.log(`   Base Address: ${process.env.BASE_ADDRESS || 'Not set'}`);
  console.log();

  // 3. Initialize services
  console.log('3. Initializing services...');
  const integratedService = new IntegratedXPayrService({
    apiKey: config.circle.apiKey,
    isTestnet: config.circle.isTestnet,
    retryAttempts: config.circle.retryAttempts,
    retryDelayMs: config.circle.retryDelay,
    timeoutMs: config.circle.timeout,
  });
  console.log('✅ Services initialized\n');

  // 4. Test chain configurations
  console.log('4. Testing chain configurations...');
  const supportedChains = [CCTPChain.ETH, CCTPChain.BASE];
  
  for (const chain of supportedChains) {
    try {
      const config = getChainConfig(chain);
      console.log(`✅ ${chain}: ${config.name} (ID: ${config.chainId})`);
      console.log(`   RPC: ${config.rpcUrl}`);
      console.log(`   USDC: ${config.contracts.usdc}`);
    } catch (error) {
      console.error(`❌ ${chain}: ${error}`);
    }
  }
  console.log();

  // 5. Get quote for real transaction
  console.log('5. Getting quote for real transaction...');
  const testAmount = '0.1'; // 0.1 USDC for testing
  const recipientAddress = process.env.BASE_ADDRESS || '0x742d35cc6634C0532925a3b8D598C4f1234567890';
  
  try {
    const quotes = await integratedService.getDispatchQuotes({
      dispatchPlan: [parseFloat(testAmount) * 1000000], // Convert to USDC units
      chains: [CCTPChain.BASE],
      recipients: [recipientAddress],
      sourceChain: CCTPChain.ETH,
      totalAmount: testAmount,
      senderPrivateKey: ethereumPrivateKey,
    });

    console.log('✅ Quote successful:');
    console.log(`   Amount: ${formatUSDCAmount(testAmount)} USDC`);
    console.log(`   Route: ${CCTPChain.ETH} → ${CCTPChain.BASE}`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Total Fees: ${quotes.totalFees} ETH`);
    console.log(`   Estimated Time: ${quotes.estimatedTime}s`);
  } catch (error) {
    console.error('❌ Quote failed:', error instanceof Error ? error.message : error);
    console.error('   This might indicate insufficient funds or RPC issues');
    process.exit(1);
  }
  console.log();

  // 6. Ask for confirmation
  console.log('6. Ready to execute real transaction...');
  console.log(`   📤 From: Ethereum Sepolia (${process.env.ETHEREUM_ADDRESS})`);
  console.log(`   📥 To: Base Sepolia (${recipientAddress})`);
  console.log(`   💰 Amount: ${testAmount} USDC`);
  console.log(`   ⏱️  Estimated time: ~3-5 minutes`);
  console.log();
  
  // Uncomment the following lines to execute the real transaction
  console.log('💡 To execute the real transaction, uncomment the execution code in the script');
  console.log('   and make sure you have sufficient USDC and ETH for gas on Ethereum Sepolia\n');
  
  // UNCOMMENT THIS SECTION TO EXECUTE REAL TRANSACTION
  console.log('⚠️  Executing REAL transaction in 5 seconds...');
  console.log('   Press Ctrl+C to cancel');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    console.log('🚀 Executing real transaction...');
    const result = await integratedService.executeDispatch({
      dispatchPlan: [parseFloat(testAmount) * 1000000], // Convert to USDC units
      chains: [CCTPChain.BASE],
      recipients: [recipientAddress],
      sourceChain: CCTPChain.ETH,
      totalAmount: testAmount,
      senderPrivateKey: ethereumPrivateKey,
      dryRun: false, // REAL transaction
    });

    console.log('✅ Transaction executed!');
    console.log(`   Success: ${result.success}`);
    console.log(`   Dispatches: ${result.dispatches.length}`);
    
    if (result.success && result.dispatches.length > 0) {
      const dispatch = result.dispatches[0];
      console.log(`   Transaction Hash: ${dispatch.transactionHash}`);
      console.log(`   Message ID: ${dispatch.messageId}`);
      console.log(`   Explorer: ${getExplorerTxUrl(CCTPChain.ETH, dispatch.transactionHash || '')}`);
      
      // Monitor transaction status
      if (dispatch.messageId) {
        console.log('\n7. Monitoring transaction status...');
        console.log('   This may take several minutes...');
        
        // Wait and check status periodically
        const maxAttempts = 20; // ~10 minutes
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
          attempts++;
          
          try {
            const status = await integratedService.monitorDispatch([dispatch.messageId!]);
            console.log(`   Attempt ${attempts}: Status check...`);
            
            if (status.messages && status.messages.length > 0) {
              const messageStatus = status.messages[0];
              console.log(`   Status: ${messageStatus.status} (Progress: ${messageStatus.progress || 0}%)`);
              
              if (messageStatus.status === 'COMPLETED') {
                console.log('🎉 Transaction completed successfully!');
                break;
              } else if (messageStatus.status === 'FAILED') {
                console.log('❌ Transaction failed');
                break;
              }
            }
          } catch (error) {
            console.log(`   Status check failed: ${error}`);
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log('⏰ Status monitoring timed out. Check manually on Circle\'s explorer.');
        }
      }
    } else {
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Transaction failed:', error instanceof Error ? error.message : error);
  }

  
  console.log('🎯 Real testnet test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Ensure you have testnet USDC on Ethereum Sepolia');
  console.log('2. Ensure you have testnet ETH for gas fees');
  console.log('3. Uncomment the execution code in this script');
  console.log('4. Run the script again to execute real transactions');
  console.log('\n💡 Get testnet funds:');
  console.log('   - ETH Sepolia: https://sepoliafaucet.com/');
  console.log('   - USDC Sepolia: https://faucet.circle.com/');
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
