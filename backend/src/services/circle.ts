import { ethers } from 'ethers';
import axios from 'axios';
import {
  CCTPBridgeRequest,
  CCTPBridgeResponse,
  CCTPBridgeStatus,
  CCTPQuoteRequest,
  CCTPQuoteResponse,
  CCTPFeeEstimation,
  CCTPMessage,
  CCTPServiceConfig,
  CCTPTransactionReceipt,
  CCTPAttestationResponse,
} from '../types/cctp';
import {
  CCTPChain,
  SupportedChainId,
  CHAIN_TO_CHAIN_ID,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES,
  USDC_DECIMALS,
  IRIS_ATTESTATION_API,
  getRpcUrl,
} from '../constants/cctp';

/**
 * Enhanced Circle CCTP Service
 * Based on Circle's official sample app architecture
 */
export class CircleService {
  private apiClient: any;
  private config: Required<CCTPServiceConfig>;

  constructor(config: CCTPServiceConfig = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      apiBaseUrl: config.apiBaseUrl || (config.isTestnet !== false ? IRIS_ATTESTATION_API.TESTNET : IRIS_ATTESTATION_API.MAINNET),
      isTestnet: config.isTestnet !== false,
      defaultGasLimit: config.defaultGasLimit || 200000,
      timeoutMs: config.timeoutMs || 600000, // 10 minutes
      retryAttempts: config.retryAttempts || 5,
      retryDelayMs: config.retryDelayMs || 15000, // 15 seconds
    };

    this.apiClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });
  }

  /**
   * Get a quote for a CCTP bridge transaction
   */
  async getQuote(request: CCTPQuoteRequest): Promise<CCTPQuoteResponse> {
    try {
      const sourceChainId = CHAIN_TO_CHAIN_ID[request.fromChain];
      const destinationChainId = CHAIN_TO_CHAIN_ID[request.toChain];

      if (!sourceChainId || !destinationChainId) {
        throw new Error(`Unsupported chain: ${request.fromChain} -> ${request.toChain}`);
      }

      // Get gas estimation for the transaction
      const gasEstimation = await this.estimateGas(request);

      // CCTP typically has no bridge fees, only gas costs
      const fees: CCTPFeeEstimation = {
        gasFee: gasEstimation.gasFee,
        bridgeFee: '0', // CCTP is free
        totalFee: gasEstimation.gasFee,
        estimatedTime: gasEstimation.estimatedTime,
      };

      return {
        fromChain: request.fromChain,
        toChain: request.toChain,
        amount: request.amount,
        fees,
        route: {
          sourceContract: CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES[sourceChainId],
          destinationContract: CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES[destinationChainId],
          messageTransmitter: CHAIN_IDS_TO_MESSAGE_TRANSMITTER_ADDRESSES[destinationChainId],
        },
        estimatedTime: fees.estimatedTime,
        minimumAmount: '0.000001', // 0.000001 USDC
        maximumAmount: '1000000', // 1M USDC
      };
    } catch (error) {
      console.error('Failed to get CCTP quote:', error);
      throw new Error(`Quote request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a CCTP bridge transaction
   */
  async bridge(request: CCTPBridgeRequest): Promise<CCTPBridgeResponse> {
    try {
      const sourceChainId = CHAIN_TO_CHAIN_ID[request.fromChain];
      const destinationChainId = CHAIN_TO_CHAIN_ID[request.toChain];

      if (!sourceChainId || !destinationChainId) {
        throw new Error(`Unsupported chain: ${request.fromChain} -> ${request.toChain}`);
      }

      // Handle dry run mode first (before checking private key)
      if (request.dryRun) {
        return this.simulateBridge(request);
      }

      // Check private key only for real transactions
      if (!request.senderPrivateKey) {
        throw new Error('Sender private key is required for bridge execution');
      }

      const sourceRpcUrl = getRpcUrl(sourceChainId);
      const provider = new ethers.JsonRpcProvider(sourceRpcUrl);
      const wallet = new ethers.Wallet(request.senderPrivateKey, provider);

      // Convert amount to units
      const amountUnits = ethers.parseUnits(request.amount, USDC_DECIMALS);

      // Get contract addresses
      const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId];
      const tokenMessengerAddress = CHAIN_IDS_TO_TOKEN_MESSENGER_ADDRESSES[sourceChainId];

      // Step 1: Approve TokenMessenger to spend USDC
      await this.approveTokens(wallet, usdcAddress, tokenMessengerAddress, amountUnits);

      // Step 2: Execute depositForBurn
      const burnResult = await this.executeDepositForBurn(
        wallet,
        tokenMessengerAddress,
        amountUnits,
        destinationChainId,
        request.recipientAddress
      );

      // Step 3: Wait for attestation
      const attestationResult = await this.waitForAttestation(burnResult.messageId);

      return {
        success: true,
        transactionHash: burnResult.transactionHash,
        messageId: burnResult.messageId,
        attestationHash: attestationResult.attestation,
        status: CCTPBridgeStatus.COMPLETED,
        estimatedTime: 300, // 5 minutes typical
        fees: {
          gasFee: ethers.formatEther(burnResult.gasCost),
          bridgeFee: '0',
          totalFee: ethers.formatEther(burnResult.gasCost),
        },
      };
    } catch (error) {
      console.error('CCTP bridge failed:', error);
      return {
        success: false,
        status: CCTPBridgeStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get the status of a CCTP message
   */
  async getMessageStatus(messageId: string): Promise<CCTPMessage | null> {
    try {
      const response = await this.apiClient.get(`/v1/messages/${messageId}`);
      return response.data.messages[0] || null;
    } catch (error) {
      console.error('Failed to get message status:', error);
      return null;
    }
  }

  /**
   * Wait for attestation to be available
   */
  private async waitForAttestation(messageId: string): Promise<CCTPAttestationResponse> {
    let attempts = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        const response = await this.apiClient.get(`/v1/attestations/${messageId}`);
        
        if (response.data.status === 'complete') {
          return response.data;
        }

        if (response.data.status === 'failed') {
          throw new Error('Attestation failed');
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        attempts++;
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw new Error(`Failed to get attestation after ${maxAttempts} attempts: ${error}`);
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
      }
    }

    throw new Error('Attestation timeout');
  }

  /**
   * Approve tokens for spending
   */
  private async approveTokens(
    wallet: ethers.Wallet,
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      wallet
    );

    const approveTx = await tokenContract.approve(spenderAddress, amount);
    await approveTx.wait();
  }

  /**
   * Execute depositForBurn transaction
   */
  private async executeDepositForBurn(
    wallet: ethers.Wallet,
    tokenMessengerAddress: string,
    amount: bigint,
    destinationChainId: SupportedChainId,
    recipientAddress: string
  ): Promise<{ transactionHash: string; messageId: string; gasCost: bigint }> {
    const tokenMessenger = new ethers.Contract(
      tokenMessengerAddress,
      [
        'event MessageSent(bytes message)',
        'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64)',
      ],
      wallet
    );

    const destinationDomain = this.getDestinationDomain(destinationChainId);
    const recipientBytes32 = ethers.zeroPadValue(ethers.getAddress(recipientAddress), 32);
    const chainId = await wallet.provider!.getNetwork().then(n => Number(n.chainId));
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId as keyof typeof CHAIN_IDS_TO_USDC_ADDRESSES];

    const tx = await tokenMessenger.depositForBurn(
      amount,
      destinationDomain,
      recipientBytes32,
      usdcAddress
    );

    const receipt = await tx.wait();
    
    // Extract message ID from events
    const messageSentEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = tokenMessenger.interface.parseLog(log);
        return parsed?.name === 'MessageSent';
      } catch {
        return false;
      }
    });

    if (!messageSentEvent) {
      throw new Error('MessageSent event not found in transaction receipt');
    }

    const parsed = tokenMessenger.interface.parseLog(messageSentEvent);
    const messageId = ethers.keccak256(parsed!.args.message);

    return {
      transactionHash: receipt.hash,
      messageId,
      gasCost: BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice),
    };
  }

  /**
   * Estimate gas costs for a bridge transaction
   */
  private async estimateGas(request: CCTPQuoteRequest): Promise<CCTPFeeEstimation> {
    try {
      const sourceChainId = CHAIN_TO_CHAIN_ID[request.fromChain];
      const rpcUrl = getRpcUrl(sourceChainId);
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

      // Estimate gas for approval + depositForBurn (typical: ~150k gas)
      const estimatedGas = BigInt(this.config.defaultGasLimit);
      const gasCost = gasPrice * estimatedGas;

      return {
        gasFee: ethers.formatEther(gasCost),
        bridgeFee: '0',
        totalFee: ethers.formatEther(gasCost),
        estimatedTime: 300, // 5 minutes typical for CCTP
      };
    } catch (error) {
      console.warn('Gas estimation failed, using default:', error);
      return {
        gasFee: '0.01', // Default estimate
        bridgeFee: '0',
        totalFee: '0.01',
        estimatedTime: 300,
      };
    }
  }

  /**
   * Get destination domain for a chain ID
   */
  private getDestinationDomain(chainId: SupportedChainId): number {
    const domainMap: Record<SupportedChainId, number> = {
      [SupportedChainId.ETH_MAINNET]: 0,
      [SupportedChainId.ETH_SEPOLIA]: 0,
      [SupportedChainId.AVAX_MAINNET]: 1,
      [SupportedChainId.AVAX_FUJI]: 1,
      [SupportedChainId.ARB_MAINNET]: 3,
      [SupportedChainId.ARB_SEPOLIA]: 3,
      [SupportedChainId.BASE_MAINNET]: 6,
      [SupportedChainId.BASE_SEPOLIA]: 6,
      [SupportedChainId.POLYGON_MAINNET]: 7,
      [SupportedChainId.POLYGON_MUMBAI]: 7,
    };

    const domain = domainMap[chainId];
    if (domain === undefined) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return domain;
  }

  /**
   * Simulate a bridge transaction without executing
   */
  private async simulateBridge(request: CCTPBridgeRequest): Promise<CCTPBridgeResponse> {
    try {
      // Get quote for fees estimation
      const quote = await this.getQuote({
        fromChain: request.fromChain,
        toChain: request.toChain,
        amount: request.amount,
        recipient: request.recipientAddress,
      });

      return {
        success: true,
        status: CCTPBridgeStatus.COMPLETED,
        estimatedTime: quote.estimatedTime,
        fees: quote.fees,
        message: 'Simulation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        status: CCTPBridgeStatus.FAILED,
        error: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Estimate fees for a bridge operation
   */
  async estimateFees(request: CCTPBridgeRequest): Promise<{
    gasFee: string;
    bridgeFee?: string;
    totalFee: string;
  }> {
    try {
      const sourceChainId = CHAIN_TO_CHAIN_ID[request.fromChain];
      if (!sourceChainId) {
        throw new Error(`Unsupported chain: ${request.fromChain}`);
      }
      
      const sourceRpcUrl = getRpcUrl(sourceChainId);
      
      // Try to get actual gas price
      let gasFee = '0.01'; // Default fallback
      
      try {
        const provider = new ethers.JsonRpcProvider(sourceRpcUrl);
        const feeData = await provider.getFeeData();
        
        // Estimate gas cost for bridge transaction (~200k gas)
        const gasLimit = BigInt(200000);
        const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
        const gasCost = gasLimit * gasPrice;
        gasFee = ethers.formatEther(gasCost);
      } catch (error) {
        console.warn('Gas estimation failed, using default:', error instanceof Error ? error.message : error);
      }

      const bridgeFee = '0'; // CCTP is free
      
      return {
        gasFee,
        bridgeFee,
        totalFee: gasFee,
      };
    } catch (error) {
      // Return default fees on error
      return {
        gasFee: '0.01',
        bridgeFee: '0',
        totalFee: '0.01',
      };
    }
  }
}
