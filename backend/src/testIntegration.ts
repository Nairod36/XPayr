import { ethers } from 'ethers';
import { CircleService, CircleBridgeRequest } from './circle';

// 1. Récupérer les USDC du smart contract Invoice
async function withdrawFromInvoice(invoiceAddress: string, merchantPrivateKey: string, usdcAddress: string, to: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(merchantPrivateKey, provider);
  const invoice = new ethers.Contract(
    invoiceAddress,
    [
      'function withdrawTo(address to) external',
    ],
    wallet
  );
  const tx = await invoice.withdrawTo(to);
  await tx.wait();
  // Les USDC sont maintenant sur le wallet backend
}

// 2. Bridge USDC via Circle
async function bridgeFromBackend(circleService: CircleService, params: CircleBridgeRequest) {
  return await circleService.bridgeUSDC(params);
}