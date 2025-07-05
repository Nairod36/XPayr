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

    // 2) depositForBurn on TokenMessenger
    const messenger = new ethers.Contract(
      tokenMessengerAddress,
      [
        'event MessageSent(uint64 indexed nonce)',
        'function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)'
      ],
      wallet
    );
    // ethers v6 : utiliser getAddress + arrayify + zeroPadBytes
    const recipientBytes32 = ethers.zeroPadBytes(ethers.getAddress(mintRecipientAddress), 32);
    const ZERO32    = ethers.ZeroHash;
    const MAX_FEE   = ethers.parseUnits('0.01', usdcDecimals);
    const MIN_FINAL = 1000;

    const burnTx = await messenger.depositForBurn(
    amountUnits,
    destinationDomainId,
    recipientBytes32,
    burnTokenAddress,
    ZERO32,
    MAX_FEE,
    MIN_FINAL
    );
    const receipt = await burnTx.wait();

    // 3) Extract nonce from MessageSent
    interface MessageSentEvent {
      event: string;
      args?: {
        nonce: bigint;
        [key: string]: any;
      };
      [key: string]: any;
    }

    interface TransactionReceiptWithEvents extends ethers.TransactionReceipt {
      events?: MessageSentEvent[];
    }

    const typedReceipt = receipt as TransactionReceiptWithEvents;
    const evt: MessageSentEvent | undefined = typedReceipt.events?.find(
      (e: MessageSentEvent) => e.event === 'MessageSent'
    );
    if (!evt || !evt.args) {
      throw new Error('MessageSent event not found');
    }
    const nonce = evt.args['nonce'].toString();

    // 4) Poll Circle REST API v2/messages/{nonce}
    const base = circleApiBaseUrl ?? this.baseUrl;
    const key = circleApiKey ?? this.apiKey;
    let status = '';
    let msgData: any = null;
    do {
      const resp = await axios.get<{ data: any }>(
        `${base}/v2/messages/${nonce}`,
        { headers: { Authorization: `Bearer ${key}` } }
      );
      msgData = resp.data.data;
      status = msgData.status;
      if (status !== 'COMPLETED') {
        await new Promise(r => setTimeout(r, 2000));
      }
    } while (status !== 'COMPLETED');

    return {
      burnTxHash: burnTx.hash,
      messageId: nonce,
      status,
      message: msgData
    };
  }
}
