import express from 'express';
import dotenv from 'dotenv';
import { WalletService } from './wallet';
import { CHAINS } from './chains';
import { CircleService, CircleBridgeRequest } from './circle';
import { IntegratedXPayrService } from './services/integrated-service';
import { CCTPChain } from './types/cctp';
import { getChainConfig, getSupportedChains, isChainSupported, formatUSDCAmount } from './utils/cctp';

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Services
const walletService = new WalletService();

if (!process.env.CIRCLE_API_KEY) {
  console.error('Missing CIRCLE_API_KEY');
  process.exit(1);
}

const circleService = new CircleService(process.env.CIRCLE_API_KEY);
const integratedService = new IntegratedXPayrService({
  apiKey: process.env.CIRCLE_API_KEY,
  isTestnet: true,
});

app.post('/api/bridge', async (req, res) => {
  try {
    const { sourceChain, destinationChain, amount, destinationAddress } = req.body;
    if (!sourceChain || !destinationChain || !amount || !destinationAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }
    const src = CHAINS[sourceChain];
    const dst = CHAINS[destinationChain];
    if (!src || !dst) {
      return res.status(400).json({ success: false, error: 'Unsupported chain' });
    }
    const privateKey = process.env[src.envPrivateKey!];
    if (!privateKey) {
      return res.status(500).json({ success: false, error: 'Missing source private key' });
    }
    const bridgeReq: CircleBridgeRequest = {
      sourceRpcUrl: src.rpcUrl,
      sourcePrivateKey: privateKey,
      burnTokenAddress: src.usdcAddress,
      tokenMessengerAddress: src.tokenMessenger,
      amount,
      usdcDecimals: src.usdcDecimals,
      destinationDomainId: dst.domainId,
      mintRecipientAddress: destinationAddress
    };
    const result = await circleService.bridgeUSDC(bridgeReq);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🪙 Route principale
app.get('/', (req, res) => {
  res.json({
    message: '🪙 XPayr - Smart Cross-Chain USDC Payment Routing',
    version: '1.0.0',
    status: 'running',
    supportedChains: Object.keys(CHAINS)
  });
});

// 💰 Consulter tous les soldes USDC
app.get('/api/balances', async (req, res) => {
  try {
    const balances = await walletService.getAllBalances();
    res.json({
      success: true,
      data: { balances }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 💰 Consulter le solde d'une chaîne spécifique
app.get('/api/balance/:chainId', async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const balance = await walletService.getBalance(chainId);
    const address = walletService.getWalletAddress(chainId);
    const chain = Object.values(CHAINS).find(c => c.id === chainId);
    
    if (!chain) {
      return res.status(404).json({
        success: false,
        error: 'Chaîne non supportée'
      });
    }

    res.json({
      success: true,
      data: {
        chainId,
        chainName: chain.name,
        address,
        balance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 🔄 Effectuer un transfert USDC
app.post('/api/transfer', async (req, res) => {
  try {
    const { toAddress, amount, chainId } = req.body;
    
    if (!toAddress || !amount || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres requis: toAddress, amount, chainId'
      });
    }

    const txHash = await walletService.transfer({ toAddress, amount, chainId });
    const chain = Object.values(CHAINS).find(c => c.id === chainId);
    
    res.json({
      success: true,
      data: {
        txHash,
        chainName: chain?.name,
        amount,
        toAddress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 📋 Lister tous les wallets
app.get('/api/wallets', (req, res) => {
  try {
    const wallets = walletService.getAllWallets();
    res.json({
      success: true,
      data: { wallets }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 🌐 Info sur les chaînes supportées
app.get('/api/chains', (req, res) => {
  res.json({
    success: true,
    data: {
      chains: Object.values(CHAINS).map(chain => ({
        id: chain.id,
        name: chain.name,
        usdcAddress: chain.usdcAddress
      }))
    }
  });
});

// 🔑 Export des clés privées (DEV uniquement)
app.get('/api/dev/export-keys', (req, res) => {
  try {
    const keys = walletService.exportKeys();
    res.json({
      success: true,
      warning: '⚠️ ATTENTION: Ces clés donnent accès complet aux wallets !',
      data: {
        privateKeys: keys,
        envFormat: Object.entries(keys).map(([chain, key]) => 
          `${chain.toUpperCase()}_PRIVATE_KEY=${key}`
        )
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 🔑 Export complet des wallets avec adresses (DEV uniquement)
app.get('/api/dev/export-wallets', (req, res) => {
  try {
    const walletInfo = walletService.exportWalletInfo();
    const envFormat: string[] = [];
    
    Object.entries(walletInfo).forEach(([chain, info]) => {
      const chainUpper = chain.toUpperCase();
      envFormat.push(`${chainUpper}_PRIVATE_KEY=${info.privateKey}`);
      envFormat.push(`${chainUpper}_ADDRESS=${info.address}`);
    });

    res.json({
      success: true,
      warning: '⚠️ ATTENTION: Ces informations donnent accès complet aux wallets !',
      data: {
        wallets: walletInfo,
        envFormat
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ===== NEW ENHANCED CCTP ENDPOINTS =====

// 🚀 Get CCTP quote for cross-chain transfer
app.post('/api/cctp/quote', async (req, res) => {
  try {
    const { fromChain, toChain, amount, recipient } = req.body;
    
    if (!isChainSupported(fromChain) || !isChainSupported(toChain)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported chain' 
      });
    }

    const quotes = await integratedService.getDispatchQuotes({
      dispatchPlan: [parseFloat(amount) * 1000000], // Convert to USDC units
      chains: [toChain as CCTPChain],
      recipients: [recipient],
      sourceChain: fromChain as CCTPChain,
      totalAmount: amount,
      senderPrivateKey: '', // Not needed for quotes
    });

    res.json({
      success: true,
      data: {
        fromChain,
        toChain,
        amount,
        quote: quotes.quotes[0],
        totalFees: quotes.totalFees,
        estimatedTime: quotes.estimatedTime,
      }
    });
  } catch (error) {
    console.error('Quote request failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Quote request failed'
    });
  }
});

// 🌉 Execute CCTP bridge transaction
app.post('/api/cctp/bridge', async (req, res) => {
  try {
    const { fromChain, toChain, amount, recipient, dryRun = false } = req.body;
    
    if (!isChainSupported(fromChain) || !isChainSupported(toChain)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported chain' 
      });
    }

    const sourceChainConfig = CHAINS[fromChain];
    if (!sourceChainConfig) {
      return res.status(400).json({ 
        success: false, 
        error: 'Source chain not configured' 
      });
    }

    const privateKey = process.env[sourceChainConfig.envPrivateKey!];
    if (!privateKey && !dryRun) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing source private key' 
      });
    }

    const result = await integratedService.executeDispatch({
      dispatchPlan: [parseFloat(amount) * 1000000], // Convert to USDC units
      chains: [toChain as CCTPChain],
      recipients: [recipient],
      sourceChain: fromChain as CCTPChain,
      totalAmount: amount,
      senderPrivateKey: privateKey || '',
      dryRun,
    });

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Bridge request failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Bridge request failed'
    });
  }
});

// 📊 Simulate dispatch execution
app.post('/api/cctp/simulate', async (req, res) => {
  try {
    const { sourceChain, dispatchPlan, chains, recipients, totalAmount } = req.body;
    
    if (!isChainSupported(sourceChain)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported source chain' 
      });
    }

    // Validate arrays have same length
    if (dispatchPlan.length !== chains.length || chains.length !== recipients.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mismatched array lengths' 
      });
    }

    const simulation = await integratedService.simulateDispatch({
      dispatchPlan,
      chains: chains.map((c: string) => c as CCTPChain),
      recipients,
      sourceChain: sourceChain as CCTPChain,
      totalAmount,
      senderPrivateKey: '', // Not needed for simulation
    });

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Simulation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Simulation failed'
    });
  }
});

// 🔍 Monitor dispatch status
app.get('/api/cctp/status/:messageIds', async (req, res) => {
  try {
    const messageIds = req.params.messageIds.split(',');
    
    const status = await integratedService.monitorDispatch(messageIds);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed'
    });
  }
});

// 📋 Get supported chains and configurations
app.get('/api/cctp/chains', async (req, res) => {
  try {
    const supportedChains = getSupportedChains();
    const chainConfigs = supportedChains.map(chain => ({
      chain,
      config: getChainConfig(chain),
      legacyConfig: CHAINS[chain] || null, // Include legacy config if available
    }));

    res.json({
      success: true,
      data: {
        supportedChains,
        chainConfigs,
        count: supportedChains.length
      }
    });
  } catch (error) {
    console.error('Failed to get chain configs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chain configs'
    });
  }
});

// ===== LEGACY ENDPOINTS (for backward compatibility) =====

// Démarrage du serveur
app.listen(port, () => {
  console.log('🪙 ====================================');
  console.log('🚀 XPayr Backend démarré !');
  console.log(`📡 Serveur: http://localhost:${port}`);
  console.log(`🔗 Chaînes: ${Object.keys(CHAINS).join(', ')}`);
  console.log('🪙 ====================================');
});