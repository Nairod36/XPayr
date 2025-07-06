# Circle CCTP Bridge Integration

This document explains how to use Circle's Cross-Chain Transfer Protocol (CCTP) with Developer Controlled Wallets for bridging USDC between chains.

## Overview

The `CircleWalletService` now includes complete CCTP bridge functionality with the following steps:

0. **Balance Check** - Verify sufficient USDC balance before bridging
1. **Approve USDC** - Allow TokenMessenger to spend USDC
2. **Deposit for Burn** - Burn USDC on source chain and emit message
3. **Wait for Confirmation** - Ensure transaction is confirmed
4. **Extract Message Data** - Get message bytes and hash from transaction logs
5. **Fetch Attestation** - Get signature from Circle's Iris API
6. **Mint USDC** - Complete the bridge on destination chain

## Key Features

### ✅ Balance Validation
```typescript
// Check if wallet has sufficient USDC
const balanceCheck = await circleService.checkUSDCBalance(CCTPChain.ETH, '1000000');
console.log(`Has balance: ${balanceCheck.hasBalance}`);
console.log(`Current: ${balanceCheck.currentBalance} USDC`);
console.log(`Token ID: ${balanceCheck.usdcTokenId}`);
```

### ✅ Complete Bridge Flow
```typescript
const bridgeRequest: BridgeRequest = {
  sourceChain: CCTPChain.ETH,
  targetChain: CCTPChain.BASE,
  amount: '1000000', // 1 USDC (6 decimals)
  destinationAddress: '0x...',
};

const result = await circleService.bridgeUSDC(bridgeRequest);
```

### ✅ Individual Step Control
```typescript
// Step 1: Approve USDC
const approveTransaction = await circleService.approveUSDC(sourceChain, amount);

// Step 2: Deposit for burn
const depositResult = await circleService.depositForBurn(bridgeRequest);

// Step 5: Fetch attestation
const attestation = await circleService.fetchAttestation(depositResult.messageHash);

// Step 6: Mint on target chain
const mintTransaction = await circleService.mintUSDC(targetChain, messageBytes, attestation);
```

### ✅ Contract Execution
```typescript
// Execute any smart contract call
const contractRequest: ContractExecutionRequest = {
  walletId: wallet.id,
  contractAddress: '0x...',
  abiFunctionSignature: 'transfer(address,uint256)',
  abiParameters: [recipient, amount],
};

const transaction = await circleService.createContractExecutionTransaction(contractRequest);
```

## Supported Chains

### Testnet
- **Ethereum Sepolia** (Domain ID: 0)
- **Base Sepolia** (Domain ID: 6)
- **Arbitrum Sepolia** (Domain ID: 3)
- **Polygon Amoy** (Domain ID: 7)

### Mainnet
- **Ethereum** (Domain ID: 0)
- **Base** (Domain ID: 6)
- **Arbitrum** (Domain ID: 3)
- **Polygon** (Domain ID: 7)

## Contract Addresses

The service automatically manages contract addresses for:
- **USDC Token Contracts**
- **TokenMessenger** (for burning)
- **MessageTransmitter** (for minting)

All addresses are pre-configured for both testnet and mainnet.

## Usage Examples

### Basic Bridge
```typescript
import { CircleWalletService, BridgeRequest, CCTPChain } from './services/circle-wallet';

const config = {
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  baseUrl: 'https://api-sandbox.circle.com',
  isTestnet: true,
};

const circleService = new CircleWalletService(config);

// Bridge 10 USDC from Ethereum to Base
const bridgeRequest: BridgeRequest = {
  sourceChain: CCTPChain.ETH,
  targetChain: CCTPChain.BASE,
  amount: '10000000', // 10 USDC
  destinationAddress: '0x...',
};

const result = await circleService.bridgeUSDC(bridgeRequest);
console.log('Bridge completed:', result);
```

### Monitor Bridge Progress
```typescript
// Start bridge
const result = await circleService.bridgeUSDC(bridgeRequest);

// Monitor transactions
console.log('Approve TX:', result.approveTransaction.id);
console.log('Deposit TX:', result.depositTransaction.transactionId);
console.log('Mint TX:', result.mintTransaction.id);

// Check final status
const mintStatus = await circleService.getTransaction(result.mintTransaction.id);
console.log('Final status:', mintStatus.state);
```

### Error Handling
```typescript
try {
  const result = await circleService.bridgeUSDC(bridgeRequest);
  console.log('✅ Bridge successful');
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    console.error('❌ Not enough USDC balance');
  } else if (error.message.includes('attestation timeout')) {
    console.error('❌ Attestation not available yet');
  } else {
    console.error('❌ Bridge failed:', error);
  }
}
```

## Testing

### Test Circle Bridge Setup
```bash
npm run test:circle-bridge
```

This script will:
1. Initialize wallets for all supported chains
2. Check USDC balances
3. Validate bridge step configuration
4. Test contract execution structure

### Test Actual Bridge (with funded wallets)
```typescript
// Set EXECUTE_BRIDGE=true in .env for actual execution
const result = await circleService.bridgeUSDC(bridgeRequest);
```

## Configuration

### Environment Variables
```bash
# Circle API Configuration
CIRCLE_API_KEY=your_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret_here
CIRCLE_BASE_URL=https://api-sandbox.circle.com
CIRCLE_WALLET_SET_ID=your_wallet_set_id

# Bridge Configuration
EXECUTE_BRIDGE=false  # Set to true for actual execution
```

### Prerequisites
1. **Circle Developer Account** - Sign up at console.circle.com
2. **API Keys** - Generate API key and entity secret
3. **Wallet Set** - Create a wallet set for your application
4. **Testnet USDC** - Fund your wallets with testnet USDC

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Source Chain  │    │  Circle APIs    │    │  Target Chain   │
│                 │    │                 │    │                 │
│ 1. Approve USDC │    │ 3. Extract Msg  │    │ 6. Mint USDC    │
│ 2. Burn USDC    │───▶│ 4. Get Logs     │───▶│ 7. Complete     │
│                 │    │ 5. Attestation  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Developer                Circle Iris              Developer
   Controlled                   API                 Controlled
    Wallets                                          Wallets
```

## Security Considerations

1. **Entity Secret Protection** - Never expose entity secrets in client code
2. **Wallet Isolation** - Use dedicated wallets for bridge operations
3. **Amount Validation** - Always validate bridge amounts
4. **Transaction Monitoring** - Monitor all bridge transactions
5. **Error Recovery** - Implement proper error handling for failed bridges

## Limitations

1. **Testnet Only** - Current implementation optimized for testnet
2. **Message Extraction** - Transaction log parsing needs blockchain integration
3. **Fee Estimation** - Manual fee configuration required
4. **Rate Limiting** - Circle APIs have rate limits

## Next Steps

1. **Integrate with LayerZero** - Combine with existing analyzer
2. **Add Fee Estimation** - Dynamic gas fee calculation
3. **Implement Log Parsing** - Extract message data from transaction logs
4. **Add Monitoring** - Real-time bridge status tracking
5. **Production Setup** - Mainnet configuration and testing

## Resources

- [Circle CCTP Documentation](https://developers.circle.com/stablecoins/cctp)
- [Developer Controlled Wallets API](https://developers.circle.com/w3s/docs/developer-controlled-wallets)
- [Iris API Documentation](https://developers.circle.com/stablecoins/iris-api)
- [Circle Console](https://console.circle.com/)
