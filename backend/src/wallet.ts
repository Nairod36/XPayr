import { ethers } from 'ethers';
import { Chain, BackendWallet, BalanceInfo, TransferRequest } from './types';
import { CHAINS } from './chains';

export class WalletService {
  private wallets: Map<number, BackendWallet> = new Map();
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeWallets();
  }

  private initializeProviders(): void {
    Object.values(CHAINS).forEach(chain => {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      this.providers.set(chain.id, provider);
    });
  }

  private initializeWallets(): void {
    console.log('🔐 Initialisation des wallets backend...');
    
    const keyMap: Record<string, string> = {
      'ethereum': 'ETHEREUM_PRIVATE_KEY',
      'polygon': 'POLYGON_PRIVATE_KEY',
      'arbitrum': 'ARBITRUM_PRIVATE_KEY',
      'optimism': 'OPTIMISM_PRIVATE_KEY',
      'base': 'BASE_PRIVATE_KEY',
      'sepolia': 'SEPOLIA_PRIVATE_KEY',
      'avalanche_testnet': 'AVALANCHE_TESTNET_PRIVATE_KEY'
    };

    const addressMap: Record<string, string> = {
      'ethereum': 'ETHEREUM_ADDRESS',
      'polygon': 'POLYGON_ADDRESS',
      'arbitrum': 'ARBITRUM_ADDRESS',
      'optimism': 'OPTIMISM_ADDRESS',
      'base': 'BASE_ADDRESS',
      'sepolia': 'SEPOLIA_ADDRESS',
      'avalanche_testnet': 'AVALANCHE_TESTNET_ADDRESS'
    };

    for (const [chainKey, chain] of Object.entries(CHAINS)) {
      const envKey = keyMap[chainKey];
      const addressKey = addressMap[chainKey];
      const privateKey = process.env[envKey];
      const expectedAddress = process.env[addressKey];
      
      let wallet: ethers.HDNodeWallet | ethers.Wallet;
      
      if (privateKey && this.isValidPrivateKey(privateKey)) {
        wallet = new ethers.Wallet(privateKey);
        
        // Vérification de l'adresse si fournie dans le .env
        if (expectedAddress && wallet.address.toLowerCase() !== expectedAddress.toLowerCase()) {
          console.warn(`⚠️ ATTENTION: L'adresse générée pour ${chain.name} ne correspond pas à celle du .env`);
          console.warn(`   Générée: ${wallet.address}`);
          console.warn(`   Attendue: ${expectedAddress}`);
        }
        
        console.log(`🔑 Wallet existant: ${chain.name} - ${wallet.address}`);
      } else {
        wallet = ethers.Wallet.createRandom();
        console.log(`🆕 Nouveau wallet: ${chain.name} - ${wallet.address}`);
        console.log(`💡 Ajoutez dans .env:`);
        console.log(`   ${envKey}=${wallet.privateKey}`);
        console.log(`   ${addressKey}=${wallet.address}`);
      }

      this.wallets.set(chain.id, {
        address: wallet.address,
        privateKey: wallet.privateKey,
        chainId: chain.id
      });
    }
    
    console.log('✅ Wallets initialisés');
  }

  private isValidPrivateKey(key: string): boolean {
    try {
      return key.startsWith('0x') && key.length === 66;
    } catch {
      return false;
    }
  }

  async getBalance(chainId: number): Promise<string> {
    try {
      const chain = Object.values(CHAINS).find(c => c.id === chainId);
      const wallet = this.wallets.get(chainId);
      const provider = this.providers.get(chainId);
      
      if (!chain || !wallet || !provider) {
        return '0';
      }

      const usdcContract = new ethers.Contract(
        chain.usdcAddress,
        ['function balanceOf(address owner) view returns (uint256)', 'function decimals() view returns (uint8)'],
        provider
      );
      
      const balance = await usdcContract.balanceOf(wallet.address);
      const decimals = await usdcContract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error(`Erreur balance ${chainId}:`, error);
      return '0';
    }
  }

  async getAllBalances(): Promise<BalanceInfo[]> {
    const balances: BalanceInfo[] = [];
    
    for (const chain of Object.values(CHAINS)) {
      const wallet = this.wallets.get(chain.id);
      const balance = await this.getBalance(chain.id);
      
      balances.push({
        chainId: chain.id,
        chainName: chain.name,
        balance,
        address: wallet?.address || 'N/A'
      });
    }
    
    return balances;
  }

  async transfer(request: TransferRequest): Promise<string> {
    const { toAddress, amount, chainId } = request;
    
    const chain = Object.values(CHAINS).find(c => c.id === chainId);
    const wallet = this.wallets.get(chainId);
    const provider = this.providers.get(chainId);
    
    if (!chain || !wallet || !provider) {
      throw new Error('Configuration invalide');
    }

    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const usdcContract = new ethers.Contract(
      chain.usdcAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address owner) view returns (uint256)'
      ],
      signer
    );

    const decimals = await usdcContract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);
    
    const tx = await usdcContract.transfer(toAddress, amountWei);
    console.log(`🔄 Transfert ${amount} USDC sur ${chain.name}: ${tx.hash}`);
    
    await tx.wait();
    console.log(`✅ Transfert confirmé: ${tx.hash}`);
    
    return tx.hash;
  }

  getWalletAddress(chainId: number): string | null {
    return this.wallets.get(chainId)?.address || null;
  }

  getAllWallets(): Array<{chainId: number, chainName: string, address: string}> {
    return Object.values(CHAINS).map(chain => ({
      chainId: chain.id,
      chainName: chain.name,
      address: this.wallets.get(chain.id)?.address || 'N/A'
    }));
  }

  exportKeys(): Record<string, string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Export désactivé en production');
    }

    const keys: Record<string, string> = {};
    for (const [chainId, wallet] of this.wallets.entries()) {
      const chain = Object.values(CHAINS).find(c => c.id === chainId);
      if (chain) {
        keys[chain.name.toLowerCase()] = wallet.privateKey;
      }
    }
    return keys;
  }

  exportWalletInfo(): Record<string, { privateKey: string; address: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Export désactivé en production');
    }

    const walletInfo: Record<string, { privateKey: string; address: string }> = {};
    for (const [chainId, wallet] of this.wallets.entries()) {
      const chain = Object.values(CHAINS).find(c => c.id === chainId);
      if (chain) {
        walletInfo[chain.name.toLowerCase()] = {
          privateKey: wallet.privateKey,
          address: wallet.address
        };
      }
    }
    return walletInfo;
  }
}
