import { ethers } from 'ethers';
import axios from 'axios';

export interface CircleBridgeRequest {
  sourceRpcUrl: string;
  sourcePrivateKey: string;
  burnTokenAddress: string;
  tokenMessengerAddress: string;
  amount: string;
  usdcDecimals: number;
  destinationDomainId: number;
  mintRecipientAddress: string;
  circleApiBaseUrl?: string;
  circleApiKey?: string;
}

/**
 * Legacy Circle Service for backward compatibility
 * @deprecated Use CircleService from services/circle.ts instead
 */
export class CircleService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://iris-api-sandbox.circle.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async bridgeUSDC(params: CircleBridgeRequest): Promise<{
    burnTxHash: string;
    messageId: string;
    status: string;
    message: any;
  }> {
    const {
      sourceRpcUrl,
      sourcePrivateKey,
      burnTokenAddress,
      tokenMessengerAddress,
      amount,
      usdcDecimals,
      destinationDomainId,
      mintRecipientAddress,
      circleApiBaseUrl,
      circleApiKey
    } = params;

    const provider = new ethers.JsonRpcProvider(sourceRpcUrl);
    const wallet = new ethers.Wallet(sourcePrivateKey, provider);

    const amountUnits = ethers.parseUnits(amount, usdcDecimals);

    // 1) Approve TokenMessenger to spend USDC
    const usdcContract = new ethers.Contract(
      burnTokenAddress,
      ['function approve(address,uint256) external returns (bool)'],
      wallet
    );
    const approveTx = await usdcContract.approve(
      tokenMessengerAddress,
      amountUnits
    );
    await approveTx.wait();

    // 2) depositForBurn on TokenMessenger (CCTP v1 interface)
    const messenger = new ethers.Contract(
      tokenMessengerAddress,
      [
        'event MessageSent(uint64 indexed nonce)',
        'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64)'
      ],
      wallet
    );
    const recipientBytes32 = ethers.zeroPadValue(ethers.getAddress(mintRecipientAddress), 32);
    const burnTx = await messenger.depositForBurn(
      amountUnits,
      destinationDomainId,
      recipientBytes32,
      burnTokenAddress
    );
    const receipt = await burnTx.wait();

    // 3) Extract nonce from MessageSent event
    const messageSentEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = messenger.interface.parseLog(log);
        return parsed?.name === 'MessageSent';
      } catch {
        return false;
      }
    });

    if (!messageSentEvent) {
      throw new Error('MessageSent event not found');
    }

    const parsed = messenger.interface.parseLog(messageSentEvent);
    const nonce = parsed!.args.nonce.toString();

    // 4) Poll Circle REST API v1/messages/{nonce}
    const base = circleApiBaseUrl ?? this.baseUrl;
    const key = circleApiKey ?? this.apiKey;
    let status = '';
    let msgData: any = null;
    
    const maxAttempts = 50; // 5 minutes max
    let attempts = 0;
    
    do {
      try {
        const resp = await axios.get(
          `${base}/v1/messages/${nonce}`,
          { headers: { Authorization: `Bearer ${key}` } }
        );
        msgData = resp.data;
        status = msgData.status || 'pending';
        
        if (status !== 'complete') {
          await new Promise(r => setTimeout(r, 6000)); // 6 seconds
        }
        attempts++;
      } catch (error) {
        console.warn(`Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to get attestation after ${maxAttempts} attempts`);
        }
        await new Promise(r => setTimeout(r, 6000));
        attempts++;
      }
    } while (status !== 'complete' && attempts < maxAttempts);

    return {
      burnTxHash: burnTx.hash,
      messageId: nonce,
      status,
      message: msgData
    };
  }
}