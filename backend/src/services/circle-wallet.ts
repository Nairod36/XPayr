/**
 * Circle Developer Controlled Wallets Service
 * 
 * Ce service gère les wallets développeur de Circle pour les transactions cross-chain.
 * Plus sécurisé et pratique que la gestion manuelle des clés privées.
 */

import axios from 'axios';
import { CCTPChain } from '../types/cctp';

export interface CircleWalletConfig {
  apiKey: string;
  entitySecret: string;
  baseUrl: string;
  walletSetId?: string;
  isTestnet?: boolean;
}

export interface CircleWallet {
  id: string;
  state: 'LIVE' | 'FROZEN';
  walletSetId: string;
  custodyType: 'DEVELOPER';
  address: string;
  blockchain: string;
  accountType: 'SCA' | 'EOA';
  updateDate: string;
  createDate: string;
}

export interface WalletBalance {
  token: {
    id: string;
    blockchain: string;
    tokenAddress?: string;
    standard: string;
    name: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
  };
  amount: string;
  updateDate: string;
}

export interface TransactionRequest {
  walletId: string;
  blockchain: string;
  destinationAddress: string;
  tokenId: string;
  amount: string;
  fee?: {
    type: 'level' | 'unit';
    config: {
      feeLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
      maxFee?: string;
      priorityFee?: string;
    };
  };
}

export interface Transaction {
  id: string;
  blockchain: string;
  tokenId: string;
  walletId: string;
  sourceAddress: string;
  destinationAddress: string;
  transactionType: 'OUTBOUND' | 'INBOUND';
  custodyType: 'DEVELOPER';
  state: 'QUEUED' | 'SENT' | 'CONFIRMED' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  amounts: Array<{
    amount: string;
    currency: string;
  }>;
  nfts?: any[];
  txHash?: string;
  blockHash?: string;
  blockHeight?: number;
  networkFee?: string;
  firstConfirmDate?: string;
  operation: 'TRANSFER';
  abiParameters?: any;
  createDate: string;
  updateDate: string;
}

export class CircleWalletService {
  private client: any; // axios instance
  private config: CircleWalletConfig;

  constructor(config: CircleWalletConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Créer un nouveau wallet set
   */
  async createWalletSet(name: string): Promise<{ id: string; name: string }> {
    const response = await this.client.post('/v1/w3s/developer/walletSets', {
      name,
    });

    return {
      id: response.data.data.walletSet.id,
      name: response.data.data.walletSet.name,
    };
  }

  /**
   * Créer un wallet pour une blockchain spécifique
   */
  async createWallet(blockchain: string, walletSetId?: string): Promise<CircleWallet> {
    const response = await this.client.post('/v1/w3s/developer/wallets', {
      walletSetId: walletSetId || this.config.walletSetId,
      blockchains: [blockchain],
      accountType: 'SCA', // Smart Contract Account pour plus de fonctionnalités
      metadata: [
        {
          name: `XPayr ${blockchain} Wallet`,
          refId: `xpayr-${blockchain.toLowerCase()}`,
        }
      ],
    });

    return response.data.data.wallets[0];
  }

  /**
   * Lister tous les wallets d'un wallet set
   */
  async getWallets(walletSetId?: string): Promise<CircleWallet[]> {
    const response = await this.client.get('/v1/w3s/developer/wallets', {
      params: {
        walletSetId: walletSetId || this.config.walletSetId,
      },
    });

    return response.data.data.wallets;
  }

  /**
   * Obtenir un wallet par son ID
   */
  async getWallet(walletId: string): Promise<CircleWallet> {
    const response = await this.client.get(`/v1/w3s/developer/wallets/${walletId}`);
    return response.data.data.wallet;
  }

  /**
   * Obtenir les balances d'un wallet
   */
  async getWalletBalances(walletId: string): Promise<WalletBalance[]> {
    const response = await this.client.get(`/v1/w3s/developer/wallets/${walletId}/balances`);
    return response.data.data.tokenBalances;
  }

  /**
   * Obtenir le wallet pour une blockchain spécifique
   */
  async getWalletForBlockchain(blockchain: string): Promise<CircleWallet | null> {
    const wallets = await this.getWallets();
    return wallets.find(wallet => wallet.blockchain === blockchain) || null;
  }

  /**
   * Créer une transaction de transfert
   */
  async createTransfer(request: TransactionRequest): Promise<Transaction> {
    const response = await this.client.post('/v1/w3s/developer/transactions/transfer', {
      walletId: request.walletId,
      blockchain: request.blockchain,
      destinationAddress: request.destinationAddress,
      tokenId: request.tokenId,
      amounts: [request.amount],
      fee: request.fee || {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM',
        },
      },
    });

    return response.data.data.transaction;
  }

  /**
   * Obtenir le statut d'une transaction
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.client.get(`/v1/w3s/developer/transactions/${transactionId}`);
    return response.data.data.transaction;
  }

  /**
   * Lister les transactions d'un wallet
   */
  async getWalletTransactions(walletId: string, limit = 10): Promise<Transaction[]> {
    const response = await this.client.get('/v1/w3s/developer/transactions', {
      params: {
        walletIds: [walletId],
        pageSize: limit,
      },
    });

    return response.data.data.transactions;
  }

  /**
   * Obtenir l'ID du token USDC pour une blockchain
   */
  getUSDCTokenId(blockchain: string): string {
    const usdcTokenIds: Record<string, string> = {
      'ETH-SEPOLIA': '36b1737c-dda6-56b1-aa59-7c518a4d1315', // USDC on Ethereum Sepolia
      'BASE-SEPOLIA': 'base-sepolia-usdc-token-id', // À obtenir depuis Circle
      'ARB-SEPOLIA': 'arbitrum-sepolia-usdc-token-id', // À obtenir depuis Circle
      'MATIC-AMOY': 'polygon-amoy-usdc-token-id', // À obtenir depuis Circle
      // Mainnet IDs
      'ETH': 'usdc-eth-mainnet-id',
      'BASE': 'usdc-base-mainnet-id',
      'ARB': 'usdc-arbitrum-mainnet-id',
      'MATIC': 'usdc-polygon-mainnet-id',
    };

    const tokenId = usdcTokenIds[blockchain];
    if (!tokenId) {
      throw new Error(`USDC token ID not found for blockchain: ${blockchain}`);
    }

    return tokenId;
  }

  /**
   * Mapper les chaînes CCTP vers les blockchains Circle
   */
  mapCCTPChainToBlockchain(chain: CCTPChain): string {
    const mapping: Record<CCTPChain, string> = {
      [CCTPChain.ETH]: this.config.isTestnet ? 'ETH-SEPOLIA' : 'ETH',
      [CCTPChain.BASE]: this.config.isTestnet ? 'BASE-SEPOLIA' : 'BASE',
      [CCTPChain.ARB]: this.config.isTestnet ? 'ARB-SEPOLIA' : 'ARB',
      [CCTPChain.POLYGON]: this.config.isTestnet ? 'MATIC-AMOY' : 'MATIC',
    };

    return mapping[chain];
  }

  /**
   * Initialiser les wallets pour toutes les chaînes supportées
   */
  async initializeWallets(): Promise<Record<CCTPChain, CircleWallet>> {
    const chains = [CCTPChain.ETH, CCTPChain.BASE, CCTPChain.ARB, CCTPChain.POLYGON];
    const wallets: Partial<Record<CCTPChain, CircleWallet>> = {};

    console.log('🔧 Initializing Circle wallets...');

    for (const chain of chains) {
      try {
        const blockchain = this.mapCCTPChainToBlockchain(chain);
        let wallet = await this.getWalletForBlockchain(blockchain);
        
        if (!wallet) {
          console.log(`   Creating wallet for ${chain} (${blockchain})...`);
          wallet = await this.createWallet(blockchain);
        }
        
        wallets[chain] = wallet;
        console.log(`   ✅ ${chain}: ${wallet.address}`);
      } catch (error) {
        console.error(`   ❌ Failed to initialize wallet for ${chain}:`, error);
      }
    }

    return wallets as Record<CCTPChain, CircleWallet>;
  }
}

export default CircleWalletService;
