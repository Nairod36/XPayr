/**
 * Script de configuration des Circle Developer Controlled Wallets
 * Usage: npm run setup:circle-wallets
 * 
 * Ce script configure automatiquement vos wallets Circle pour XPayr
 */

import dotenv from 'dotenv';
dotenv.config();

import { CircleWalletService } from '../services/circle-wallet';
import { CCTPChain } from '../types/cctp';

async function main() {
  console.log('🔧 XPayr Circle Wallet Setup');
  console.log('============================\n');

  // 1. Vérifier la configuration
  console.log('1. Checking configuration...');
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const baseUrl = process.env.CIRCLE_BASE_URL || 'https://api-sandbox.circle.com';
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

  if (!apiKey) {
    console.error('❌ CIRCLE_API_KEY not found in .env');
    console.error('   Get your API key from: https://console.circle.com/');
    process.exit(1);
  }

  if (!entitySecret) {
    console.error('❌ CIRCLE_ENTITY_SECRET not found in .env');
    console.error('   Get your entity secret from: https://console.circle.com/');
    process.exit(1);
  }

  console.log('✅ Configuration valid');
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Wallet Set ID: ${walletSetId || 'Will be created'}`);
  console.log();

  // 2. Initialiser le service
  console.log('2. Initializing Circle Wallet Service...');
  const walletService = new CircleWalletService({
    apiKey,
    entitySecret,
    baseUrl,
    walletSetId,
    isTestnet: baseUrl.includes('sandbox'),
  });
  console.log('✅ Service initialized\n');

  let currentWalletSetId = walletSetId;

  // 3. Créer un wallet set si nécessaire
  if (!currentWalletSetId) {
    console.log('3. Creating Wallet Set...');
    try {
      const walletSet = await walletService.createWalletSet('XPayr Wallets');
      currentWalletSetId = walletSet.id;
      
      console.log('✅ Wallet Set created:');
      console.log(`   ID: ${walletSet.id}`);
      console.log(`   Name: ${walletSet.name}`);
      console.log();
      
      console.log('💡 Add this to your .env file:');
      console.log(`   CIRCLE_WALLET_SET_ID=${walletSet.id}`);
      console.log();
    } catch (error) {
      console.error('❌ Failed to create wallet set:', error);
      process.exit(1);
    }
  } else {
    console.log('3. Using existing Wallet Set...');
    console.log(`✅ Wallet Set ID: ${currentWalletSetId}\n`);
  }

  // 4. Créer/vérifier les wallets pour chaque chaîne
  console.log('4. Setting up wallets for each blockchain...');
  const chains = [CCTPChain.ETH, CCTPChain.BASE, CCTPChain.ARB, CCTPChain.POLYGON];
  const walletAddresses: Record<string, string> = {};

  for (const chain of chains) {
    try {
      console.log(`   Setting up ${chain}...`);
      const blockchain = walletService.mapCCTPChainToBlockchain(chain);
      
      // Vérifier si le wallet existe déjà
      let wallet = await walletService.getWalletForBlockchain(blockchain);
      
      if (!wallet) {
        // Créer un nouveau wallet
        console.log(`     Creating new wallet for ${blockchain}...`);
        wallet = await walletService.createWallet(blockchain, currentWalletSetId);
      }
      
      walletAddresses[chain] = wallet.address;
      console.log(`     ✅ ${chain} (${blockchain}): ${wallet.address}`);
      
    } catch (error) {
      console.error(`     ❌ Failed to setup wallet for ${chain}:`, error);
    }
  }
  console.log();

  // 5. Vérifier les balances
  console.log('5. Checking wallet balances...');
  const wallets = await walletService.getWallets(currentWalletSetId);
  
  for (const wallet of wallets) {
    try {
      console.log(`   Checking ${wallet.blockchain} (${wallet.address})...`);
      const balances = await walletService.getWalletBalances(wallet.id);
      
      if (balances.length === 0) {
        console.log(`     📭 No balances found`);
      } else {
        balances.forEach(balance => {
          console.log(`     💰 ${balance.amount} ${balance.token.symbol}`);
        });
      }
    } catch (error) {
      console.log(`     ❌ Error checking balances: ${error}`);
    }
  }
  console.log();

  // 6. Résumé et prochaines étapes
  console.log('🎉 Circle Wallet Setup Complete!');
  console.log('=================================\n');
  
  console.log('📋 Wallet Addresses:');
  Object.entries(walletAddresses).forEach(([chain, address]) => {
    console.log(`   ${chain}: ${address}`);
  });
  console.log();

  console.log('📝 Environment Variables:');
  console.log(`   CIRCLE_API_KEY=${apiKey}`);
  console.log(`   CIRCLE_ENTITY_SECRET=${entitySecret}`);
  console.log(`   CIRCLE_BASE_URL=${baseUrl}`);
  console.log(`   CIRCLE_WALLET_SET_ID=${currentWalletSetId}`);
  console.log();

  console.log('🚀 Next Steps:');
  console.log('1. Add the wallet addresses to your .env file');
  console.log('2. Fund your wallets with testnet tokens:');
  console.log('   - Get testnet USDC: https://faucet.circle.com/');
  console.log('   - Get testnet ETH: https://sepoliafaucet.com/');
  console.log('3. Test your setup: npm run test:circle-wallets');
  console.log('4. For production: switch to mainnet API keys and URLs');
  console.log();

  console.log('📚 Resources:');
  console.log('   - Circle Console: https://console.circle.com/');
  console.log('   - Documentation: https://developers.circle.com/w3s/docs');
  console.log('   - Support: https://developers.circle.com/developer/support');
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the setup
main().catch((error) => {
  console.error('❌ Setup failed:', error);
  console.error('\n💡 Common issues:');
  console.error('   - Invalid API key or entity secret');
  console.error('   - Network connectivity issues');
  console.error('   - Insufficient permissions for wallet creation');
  console.error('\n🔗 Get help: https://developers.circle.com/developer/support');
  process.exit(1);
});
