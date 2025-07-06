import { CircleService } from './services/circle';
import { CCTPBridgeRequest, CCTPQuoteRequest } from './types/cctp';
import { CCTPChain, CCTPBridgeResponse, CCTPQuoteResponse } from './types/cctp';
import { ethers } from 'ethers';

/**
 * Integration service combining LayerZero analysis with Circle CCTP bridging
 */
export interface IntegratedDispatchRequest {
  // LayerZero analysis results
  dispatchPlan: number[]; // Amounts in USDC units (6 decimals)
  chains: CCTPChain[];
  recipients: string[];
  
  // Execution parameters
  senderPrivateKey: string;
  sourceChain: CCTPChain;
  totalAmount: string; // Human readable USDC amount
  
  // Options
  dryRun?: boolean;
  maxSlippage?: number;
  gasLimits?: { [chain in CCTPChain]?: number };
}

export interface IntegratedDispatchResponse {
  success: boolean;
  totalAmount: string;
  dispatches: {
    chain: CCTPChain;
    amount: string;
    recipient: string;
    status: 'pending' | 'completed' | 'failed';
    transactionHash?: string;
    error?: string;
  }[];
  totalFees: string;
  estimatedTime: number;
  error?: string;
}

export class IntegratedXPayrService {
  private circleService: CircleService;
  
  constructor(circleApiKey: string, isTestnet = true) {
    this.circleService = new CircleService({
      apiKey: circleApiKey,
      isTestnet,
      retryAttempts: 5,
      retryDelayMs: 15000, // 15 seconds between retries
      timeoutMs: 600000, // 10 minutes timeout
    });
  }

  /**
   * Get quotes for all dispatches in the plan
   */
  async getDispatchQuotes(request: IntegratedDispatchRequest): Promise<{
    quotes: CCTPQuoteResponse[];
    totalFees: string;
    estimatedTime: number;
  }> {
    const quotes: CCTPQuoteResponse[] = [];
    let totalFeesWei = BigInt(0);
    let maxEstimatedTime = 0;

    for (let i = 0; i < request.chains.length; i++) {
      if (request.dispatchPlan[i] > 0) {
        const amountUsdc = ethers.formatUnits(request.dispatchPlan[i], 6);
        
        const quoteRequest: CCTPQuoteRequest = {
          fromChain: request.sourceChain,
          toChain: request.chains[i],
          amount: amountUsdc,
          recipient: request.recipients[i],
        };

        try {
          const quote = await this.circleService.getQuote(quoteRequest);
          quotes.push(quote);
          
          // Accumulate fees (convert to wei for precise arithmetic)
          const feeWei = ethers.parseEther(quote.fees.totalFee);
          totalFeesWei += feeWei;
          
          // Track maximum estimated time
          maxEstimatedTime = Math.max(maxEstimatedTime, quote.estimatedTime);
          
        } catch (error) {
          console.error(`Failed to get quote for ${request.chains[i]}:`, error);
          throw new Error(`Quote failed for ${request.chains[i]}: ${error}`);
        }
      }
    }

    return {
      quotes,
      totalFees: ethers.formatEther(totalFeesWei),
      estimatedTime: maxEstimatedTime,
    };
  }

  /**
   * Execute the complete dispatch plan
   */
  async executeDispatchPlan(request: IntegratedDispatchRequest): Promise<IntegratedDispatchResponse> {
    try {
      // 1. Validate request
      if (request.chains.length !== request.recipients.length || 
          request.chains.length !== request.dispatchPlan.length) {
        throw new Error('Mismatched array lengths in dispatch request');
      }

      // 2. Get quotes first (for fees and validation)
      console.log('Getting dispatch quotes...');
      const { quotes, totalFees, estimatedTime } = await this.getDispatchQuotes(request);

      if (request.dryRun) {
        return {
          success: true,
          totalAmount: request.totalAmount,
          dispatches: request.chains.map((chain, i) => ({
            chain,
            amount: ethers.formatUnits(request.dispatchPlan[i], 6),
            recipient: request.recipients[i],
            status: 'pending' as const,
          })),
          totalFees,
          estimatedTime,
        };
      }

      // 3. Execute dispatches
      console.log('Executing dispatch plan...');
      const dispatches = [];
      let successCount = 0;

      for (let i = 0; i < request.chains.length; i++) {
        const amount = request.dispatchPlan[i];
        if (amount <= 0) {
          // Skip zero amounts
          dispatches.push({
            chain: request.chains[i],
            amount: '0',
            recipient: request.recipients[i],
            status: 'completed' as const,
          });
          continue;
        }

        const amountUsdc = ethers.formatUnits(amount, 6);
        
        console.log(`Dispatching ${amountUsdc} USDC to ${request.chains[i]}...`);
        
        try {
          const bridgeRequest: CCTPBridgeRequest = {
            fromChain: request.sourceChain,
            toChain: request.chains[i],
            amount: amountUsdc,
            recipientAddress: request.recipients[i],
            senderPrivateKey: request.senderPrivateKey,
            options: {
              gasLimit: request.gasLimits?.[request.chains[i]],
              slippageTolerance: request.maxSlippage,
            },
          };

          const response = await this.circleService.bridge(bridgeRequest);

          if (response.success) {
            dispatches.push({
              chain: request.chains[i],
              amount: amountUsdc,
              recipient: request.recipients[i],
              status: 'completed' as const,
              transactionHash: response.transactionHash,
            });
            successCount++;
            console.log(`✅ Dispatch to ${request.chains[i]} completed: ${response.transactionHash}`);
          } else {
            dispatches.push({
              chain: request.chains[i],
              amount: amountUsdc,
              recipient: request.recipients[i],
              status: 'failed' as const,
              error: response.error,
            });
            console.error(`❌ Dispatch to ${request.chains[i]} failed:`, response.error);
          }

          // Small delay between dispatches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          dispatches.push({
            chain: request.chains[i],
            amount: amountUsdc,
            recipient: request.recipients[i],
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`❌ Dispatch to ${request.chains[i]} failed:`, error);
        }
      }

      const allCompleted = successCount === dispatches.filter(d => parseFloat(d.amount) > 0).length;

      return {
        success: allCompleted,
        totalAmount: request.totalAmount,
        dispatches,
        totalFees,
        estimatedTime,
        error: allCompleted ? undefined : `${successCount}/${dispatches.length} dispatches completed`,
      };

    } catch (error) {
      console.error('Dispatch execution failed:', error);
      return {
        success: false,
        totalAmount: request.totalAmount,
        dispatches: [],
        totalFees: '0',
        estimatedTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Simulate a dispatch plan without executing
   */
  async simulateDispatch(request: IntegratedDispatchRequest): Promise<IntegratedDispatchResponse> {
    return this.executeDispatchPlan({ ...request, dryRun: true });
  }

  /**
   * Get the status of all dispatches by transaction hashes
   */
  async getDispatchStatus(transactionHashes: string[]): Promise<{
    [hash: string]: {
      status: 'pending' | 'completed' | 'failed' | 'unknown';
      chain?: CCTPChain;
      amount?: string;
      error?: string;
    };
  }> {
    const statuses: { [hash: string]: any } = {};

    for (const hash of transactionHashes) {
      try {
        const status = await this.circleService.getMessageStatus(hash);
        if (status) {
          statuses[hash] = {
            status: status.status === 'COMPLETED' ? 'completed' : 'pending',
            chain: status.destinationChain,
            amount: status.amount,
          };
        } else {
          statuses[hash] = { status: 'unknown' };
        }
      } catch (error) {
        statuses[hash] = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return statuses;
  }

  /**
   * Helper method to convert LayerZero dispatch plan to CCTP format
   */
  static convertLayerZeroToDispatch(
    layerZeroResponse: { dispatchPlan: number[]; totalAmount: number },
    chains: CCTPChain[],
    recipients: string[],
    sourceChain: CCTPChain,
    senderPrivateKey: string
  ): IntegratedDispatchRequest {
    return {
      dispatchPlan: layerZeroResponse.dispatchPlan,
      chains,
      recipients,
      sourceChain,
      totalAmount: ethers.formatUnits(layerZeroResponse.totalAmount, 6),
      senderPrivateKey,
    };
  }

  /**
   * Validate dispatch request
   */
  static validateDispatchRequest(request: IntegratedDispatchRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check array lengths
    if (request.chains.length !== request.recipients.length) {
      errors.push('Chains and recipients arrays must have the same length');
    }
    
    if (request.chains.length !== request.dispatchPlan.length) {
      errors.push('Chains and dispatch plan arrays must have the same length');
    }

    // Check recipients are valid addresses
    for (let i = 0; i < request.recipients.length; i++) {
      try {
        ethers.getAddress(request.recipients[i]);
      } catch {
        errors.push(`Invalid recipient address at index ${i}: ${request.recipients[i]}`);
      }
    }

    // Check amounts are positive
    const totalPlanned = request.dispatchPlan.reduce((sum, amount) => sum + amount, 0);
    if (totalPlanned <= 0) {
      errors.push('Total dispatch amount must be positive');
    }

    // Check private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(request.senderPrivateKey)) {
      errors.push('Invalid private key format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
