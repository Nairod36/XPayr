import express from 'express';
import dotenv from 'dotenv';
import { WalletService } from './wallet';
import { CHAINS } from './chains';
import { CircleService, CircleBridgeRequest } from './circle';

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Service de wallet
const walletService = new WalletService();


if (!process.env.CIRCLE_API_KEY) {
  console.error('Missing CIRCLE_API_KEY');
  process.exit(1);
}
const circleService = new CircleService(process.env.CIRCLE_API_KEY);

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

// Démarrage du serveur
app.listen(port, () => {
  console.log('🪙 ====================================');
  console.log('🚀 XPayr Backend démarré !');
  console.log(`📡 Serveur: http://localhost:${port}`);
  console.log(`🔗 Chaînes: ${Object.keys(CHAINS).join(', ')}`);
  console.log('🪙 ====================================');
});