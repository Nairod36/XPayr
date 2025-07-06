import { CircleService } from './circle';
import {
  CCTPChain,
  CCTPBridgeRequest,
  CCTPBridgeResponse,
  CCTPQuoteRequest,
  CCTPQuoteResponse,
  CCTPBridgeStatus,
  CCTPServiceConfig,
} from '../types/cctp';
import { ethers } from 'ethers';

/**
 * Integration service combining LayerZero analysis with Circle CCTP bridging
 * Enhanced version using the new CircleService architecture
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
  timeout?: number; // Timeout in milliseconds
}

export interface IntegratedDispatchResponse {
  success: boolean;
  totalAmount: string;
  dispatches: {
    chain: CCTPChain;
    amount: string;
    recipient: string;
    status: CCTPBridgeStatus;
    transactionHash?: string;
    messageId?: string;
    attestationHash?: string;
    error?: string;
    estimatedTime?: number;
  }[];
  totalFees: string;
  estimatedTime: number;
  error?: string;
}

export interface DispatchSimulation {
  totalAmount: string;
  totalFees: string;
  estimatedTime: number;
  dispatches: {
    chain: CCTPChain;
    amount: string;
    recipient: string;
    fees: string;
    estimatedTime: number;
  }[];
  feasible: boolean;
  warnings: string[];
}

export class IntegratedXPayrService {
  private circleService: CircleService;
  
  constructor(config: CCTPServiceConfig = {}) {
    this.circleService = new CircleService({
      isTestnet: true,
      retryAttempts: 5,
      retryDelayMs: 15000, // 15 seconds between retries
      timeoutMs: 600000, // 10 minutes timeout
      defaultGasLimit: 200000,
      ...config,
    });
  }

  /**
   * Simulate dispatch execution without actually executing
   */
  async simulateDispatch(request: IntegratedDispatchRequest): Promise<DispatchSimulation> {
    const quotes: CCTPQuoteResponse[] = [];
    const dispatches: DispatchSimulation['dispatches'] = [];
    const warnings: string[] = [];
    let totalFeesWei = BigInt(0);
    let maxEstimatedTime = 0;
    let feasible = true;

    // Validate request
    if (request.chains.length !== request.recipients.length || 
        request.chains.length !== request.dispatchPlan.length) {
      throw new Error('Mismatched array lengths in dispatch request');
    }

    // Check total amount consistency
    const planTotal = request.dispatchPlan.reduce((sum, amount) => sum + amount, 0);
    const expectedTotal = ethers.parseUnits(request.totalAmount, 6);
    
    if (BigInt(planTotal) !== expectedTotal) {
      warnings.push(`Plan total (${ethers.formatUnits(planTotal, 6)}) doesn't match expected total (${request.totalAmount})`);
    }

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
          
          dispatches.push({
            chain: request.chains[i],
            amount: amountUsdc,
            recipient: request.recipients[i],
            fees: quote.fees.totalFee,
            estimatedTime: quote.estimatedTime,
          });

          // Check amount limits
          if (parseFloat(amountUsdc) < parseFloat(quote.minimumAmount)) {
            warnings.push(`Amount ${amountUsdc} for ${request.chains[i]} is below minimum ${quote.minimumAmount}`);
            feasible = false;
          }
          
          if (parseFloat(amountUsdc) > parseFloat(quote.maximumAmount)) {
            warnings.push(`Amount ${amountUsdc} for ${request.chains[i]} exceeds maximum ${quote.maximumAmount}`);
            feasible = false;
          }
          
        } catch (error) {
          console.error(`Failed to get quote for ${request.chains[i]}:`, error);
          warnings.push(`Quote failed for ${request.chains[i]}: ${error}`);
          feasible = false;
          
          dispatches.push({
            chain: request.chains[i],
            amount: amountUsdc,
            recipient: request.recipients[i],
            fees: '0',
            estimatedTime: 0,
          });
        }
      }
    }

    return {
      totalAmount: request.totalAmount,
      totalFees: ethers.formatEther(totalFeesWei),
      estimatedTime: maxEstimatedTime,
      dispatches,
      feasible,
      warnings,
    };
  }

  /**
   * Execute the complete dispatch plan
   */
  async executeDispatch(request: IntegratedDispatchRequest): Promise<IntegratedDispatchResponse> {
    try {
      // First simulate to check feasibility
      if (!request.dryRun) {
        const simulation = await this.simulateDispatch(request);
        if (!simulation.feasible) {
          return {
            success: false,
            totalAmount: request.totalAmount,
            dispatches: simulation.dispatches.map(d => ({
              ...d,
              status: CCTPBridgeStatus.FAILED,
              error: 'Simulation failed',
            })),
            totalFees: simulation.totalFees,
            estimatedTime: simulation.estimatedTime,
            error: `Dispatch not feasible: ${simulation.warnings.join(', ')}`,
          };
        }
      }

      const results: IntegratedDispatchResponse['dispatches'] = [];
      let totalFeesWei = BigInt(0);
      let maxEstimatedTime = 0;
      let allSuccessful = true;

      // Execute each dispatch
      for (let i = 0; i < request.chains.length; i++) {
        if (request.dispatchPlan[i] > 0) {
          const amountUsdc = ethers.formatUnits(request.dispatchPlan[i], 6);
          
          const bridgeRequest: CCTPBridgeRequest = {
            fromChain: request.sourceChain,
            toChain: request.chains[i],
            amount: amountUsdc,
            recipientAddress: request.recipients[i],
            senderPrivateKey: request.senderPrivateKey,
            dryRun: request.dryRun, // Pass through the dry run flag
            options: {
              gasLimit: request.gasLimits?.[request.chains[i]],
              deadline: request.timeout ? Date.now() + request.timeout : undefined,
            },
          };

          try {
            const result = await this.circleService.bridge(bridgeRequest);
            
            if (result.success) {
              results.push({
                chain: request.chains[i],
                amount: amountUsdc,
                recipient: request.recipients[i],
                status: result.status,
                transactionHash: result.transactionHash,
                messageId: result.messageId,
                attestationHash: result.attestationHash,
                estimatedTime: result.estimatedTime,
              });

              if (result.fees) {
                const feeWei = ethers.parseEther(result.fees.totalFee);
                totalFeesWei += feeWei;
              }
              
              maxEstimatedTime = Math.max(maxEstimatedTime, result.estimatedTime || 0);
            } else {
              allSuccessful = false;
              results.push({
                chain: request.chains[i],
                amount: amountUsdc,
                recipient: request.recipients[i],
                status: CCTPBridgeStatus.FAILED,
                error: result.error,
              });
            }
          } catch (error) {
            allSuccessful = false;
            results.push({
              chain: request.chains[i],
              amount: amountUsdc,
              recipient: request.recipients[i],
              status: CCTPBridgeStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      return {
        success: allSuccessful,
        totalAmount: request.totalAmount,
        dispatches: results,
        totalFees: ethers.formatEther(totalFeesWei),
        estimatedTime: maxEstimatedTime,
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
   * Monitor dispatch status
   */
  async monitorDispatch(messageIds: string[]): Promise<{
    completed: number;
    pending: number;
    failed: number;
    messages: Array<{
      messageId: string;
      status: CCTPBridgeStatus;
      progress?: number;
    }>;
  }> {
    const messages = [];
    let completed = 0;
    let pending = 0;
    let failed = 0;

    for (const messageId of messageIds) {
      try {
        const message = await this.circleService.getMessageStatus(messageId);
        if (message) {
          const status = this.mapStatusToCCTPStatus(message.status);
          messages.push({
            messageId,
            status,
            progress: this.calculateProgress(status),
          });

          if (status === CCTPBridgeStatus.COMPLETED) completed++;
          else if (status === CCTPBridgeStatus.FAILED) failed++;
          else pending++;
        } else {
          messages.push({
            messageId,
            status: CCTPBridgeStatus.PENDING,
            progress: 0,
          });
          pending++;
        }
      } catch (error) {
        console.error(`Failed to get status for message ${messageId}:`, error);
        messages.push({
          messageId,
          status: CCTPBridgeStatus.FAILED,
          progress: 0,
        });
        failed++;
      }
    }

    return {
      completed,
      pending,
      failed,
      messages,
    };
  }

  /**
   * Get quotes for all dispatches in the plan
   */
  async getDispatchQuotes(request: IntegratedDispatchRequest): Promise<{
    quotes: CCTPQuoteResponse[];
    totalFees: string;
    estimatedTime: number;
  }> {
    const simulation = await this.simulateDispatch(request);
    
    const quotes: CCTPQuoteResponse[] = [];
    for (let i = 0; i < request.chains.length; i++) {
      if (request.dispatchPlan[i] > 0) {
        const dispatch = simulation.dispatches.find(d => d.chain === request.chains[i]);
        if (dispatch) {
          // Create a quote response from simulation data
          const quote: CCTPQuoteResponse = {
            fromChain: request.sourceChain,
            toChain: request.chains[i],
            amount: dispatch.amount,
            fees: {
              gasFee: dispatch.fees,
              bridgeFee: '0',
              totalFee: dispatch.fees,
              estimatedTime: dispatch.estimatedTime,
            },
            route: {
              sourceContract: '',
              destinationContract: '',
              messageTransmitter: '',
            },
            estimatedTime: dispatch.estimatedTime,
            minimumAmount: '0.000001',
            maximumAmount: '1000000',
          };
          quotes.push(quote);
        }
      }
    }

    return {
      quotes,
      totalFees: simulation.totalFees,
      estimatedTime: simulation.estimatedTime,
    };
  }

  /**
   * Map internal status to CCTP status
   */
  private mapStatusToCCTPStatus(status: string): CCTPBridgeStatus {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'complete':
        return CCTPBridgeStatus.COMPLETED;
      case 'pending':
        return CCTPBridgeStatus.PENDING;
      case 'confirming':
        return CCTPBridgeStatus.CONFIRMING;
      case 'attesting':
        return CCTPBridgeStatus.ATTESTING;
      case 'ready_to_mint':
        return CCTPBridgeStatus.READY_TO_MINT;
      case 'failed':
        return CCTPBridgeStatus.FAILED;
      case 'expired':
        return CCTPBridgeStatus.EXPIRED;
      default:
        return CCTPBridgeStatus.PENDING;
    }
  }

  /**
   * Calculate progress percentage based on status
   */
  private calculateProgress(status: CCTPBridgeStatus): number {
    switch (status) {
      case CCTPBridgeStatus.PENDING:
        return 10;
      case CCTPBridgeStatus.CONFIRMING:
        return 30;
      case CCTPBridgeStatus.ATTESTING:
        return 60;
      case CCTPBridgeStatus.READY_TO_MINT:
        return 90;
      case CCTPBridgeStatus.COMPLETED:
        return 100;
      case CCTPBridgeStatus.FAILED:
      case CCTPBridgeStatus.EXPIRED:
        return 0;
      default:
        return 0;
    }
  }
}
