/**
 * Script de consultation des Circle Developer Controlled Wallets
 * Usage: npm run setup:circle-wallets
 * 
 * Ce script consulte vos wallets Circle existants et affiche leurs balances
 */

import dotenv from 'dotenv';
dotenv.config();

import { CircleWalletService } from '../services/circle-wallet';
import { CCTPChain } from '../types/cctp';

async function main() {
  console.log('� XPayr Circle Wallet Inspector');
  console.log('================================\n');

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

  if (!walletSetId) {
    console.error('❌ CIRCLE_WALLET_SET_ID not found in .env');
    console.error('   You need to have an existing wallet set to inspect');
    process.exit(1);
  }

  console.log('✅ Configuration valid');
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Wallet Set ID: ${walletSetId}`);
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

  // 3. Récupérer tous les wallets du wallet set
  console.log('3. Fetching existing wallets...');
  try {
    const wallets = await walletService.getWallets();
    
    if (wallets.length === 0) {
      console.log('📭 No wallets found in this wallet set');
      console.log('   You may need to create wallets first');
      process.exit(0);
    }

    console.log(`✅ Found ${wallets.length} wallet(s) in wallet set`);
    console.log();

    // 4. Afficher les détails et balances de chaque wallet
    console.log('4. Wallet details and balances:');
    console.log('===============================\n');

    const walletsByChain: Record<string, any> = {};

    for (const wallet of wallets) {
      console.log(`📱 Wallet: ${wallet.blockchain}`);
      console.log(`   ID: ${wallet.id}`);
      console.log(`   Address: ${wallet.address}`);
      console.log(`   State: ${wallet.state}`);
      console.log(`   Type: ${wallet.accountType}`);
      console.log(`   Created: ${new Date(wallet.createDate).toLocaleString()}`);
      
      // Stocker pour le résumé par chaîne
      walletsByChain[wallet.blockchain] = wallet;

      try {
        console.log('   💰 Balances:');
        const balances = await walletService.getWalletBalances(wallet.id);
        
        if (balances.length === 0) {
          console.log('      📭 No token balances');
        } else {
          let totalUsdValue = 0;
          balances.forEach(balance => {
            const amount = parseFloat(balance.amount);
            const isUSDC = balance.token.symbol === 'USDC';
            const displayAmount = isUSDC ? 
              `${(amount / 1000000).toFixed(6)}` : // USDC has 6 decimals
              amount.toString();
            
            console.log(`      • ${displayAmount} ${balance.token.symbol}${balance.token.isNative ? ' (native)' : ''}`);
            if (balance.token.tokenAddress) {
              console.log(`        Contract: ${balance.token.tokenAddress}`);
            }
            
            // Estimer la valeur en USD pour USDC
            if (isUSDC) {
              totalUsdValue += amount / 1000000;
            }
          });
          
          if (totalUsdValue > 0) {
            console.log(`      💵 Estimated USD value: $${totalUsdValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.log(`      ❌ Error fetching balances: ${error}`);
      }
      
      console.log();
    }

    // 5. Résumé par chaîne CCTP
    console.log('5. CCTP Chain Summary:');
    console.log('======================\n');
    
    const chains = [CCTPChain.ETH, CCTPChain.BASE, CCTPChain.ARB, CCTPChain.POLYGON];
    const availableChains: string[] = [];
    
    for (const chain of chains) {
      const blockchain = walletService.mapCCTPChainToBlockchain(chain);
      const wallet = walletsByChain[blockchain];
      
      if (wallet) {
        availableChains.push(chain);
        console.log(`✅ ${chain} (${blockchain})`);
        console.log(`   Address: ${wallet.address}`);
        
        // Vérifier le solde USDC spécifiquement
        try {
          const balanceCheck = await walletService.checkUSDCBalance(chain, '1'); // Check for 1 USDC minimum
          console.log(`   USDC Balance: ${(parseFloat(balanceCheck.currentBalance) / 1000000).toFixed(6)} USDC`);
        } catch (error) {
          console.log(`   USDC Balance: Unable to check (${error})`);
        }
      } else {
        console.log(`❌ ${chain} (${blockchain}) - No wallet found`);
      }
      console.log();
    }

    // 6. Résumé final
    console.log('📊 Summary:');
    console.log('===========\n');
    console.log(`Total wallets: ${wallets.length}`);
    console.log(`CCTP-ready chains: ${availableChains.length}/4`);
    console.log(`Available chains: ${availableChains.join(', ')}`);
    
    if (availableChains.length === 4) {
      console.log('✅ All CCTP chains have wallets - Ready for cross-chain bridging!');
    } else {
      console.log('⚠️  Some CCTP chains missing wallets - Limited bridging capability');
    }

  } catch (error) {
    console.error('❌ Failed to fetch wallets:', error);
    process.exit(1);
  }

  console.log();

  // 7. Prochaines étapes
  console.log('🚀 Next Steps:');
  console.log('==============\n');
  console.log('1. Fund your wallets with testnet tokens if needed:');
  console.log('   - Get testnet USDC: https://faucet.circle.com/');
  console.log('   - Get testnet ETH: https://sepoliafaucet.com/');
  console.log('2. Test bridge functionality: npm run test:circle-bridge');
  console.log('3. For production: switch to mainnet API keys and URLs');
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
  console.error('❌ Wallet inspection failed:', error);
  console.error('\n💡 Common issues:');
  console.error('   - Invalid API key or entity secret');
  console.error('   - Wallet set ID not found or inaccessible');
  console.error('   - Network connectivity issues');
  console.error('\n🔗 Get help: https://developers.circle.com/developer/support');
  process.exit(1);
});
