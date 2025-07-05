# XPayr Backend - Enhanced CCTP Integration

🚀 **Advanced Cross-Chain USDC Transfer Backend powered by Circle CCTP**

## Overview

This backend provides a comprehensive API for cross-chain USDC transfers using Circle's Cross-Chain Transfer Protocol (CCTP). It combines LayerZero's analysis capabilities with Circle's battle-tested bridge infrastructure.

## Features

### ✨ Core Features
- **Multi-Chain USDC Transfers** - Support for Ethereum, Base, Arbitrum, and Polygon
- **Real-time Quote Engine** - Get accurate fees and time estimates before executing
- **Batch Dispatch** - Execute multiple transfers in a single transaction
- **Simulation Mode** - Test transfers without spending gas
- **Status Monitoring** - Track transfer progress with real-time updates
- **Error Handling** - Robust error recovery and retry mechanisms

### 🔧 Technical Features
- **TypeScript First** - Fully typed APIs and interfaces
- **Modular Architecture** - Clean separation of concerns
- **Configuration Management** - Centralized environment configuration
- **Rate Limiting** - Built-in protection against abuse
- **Logging** - Comprehensive logging for debugging
- **Testing Suite** - Automated tests for all components

## Quick Start

### Prerequisites
- Node.js 18+
- TypeScript
- Circle API Key (Sandbox for testing)
- Private keys for source chains

### Installation

```bash
# Clone the repository
git clone https://github.com/Nairod36/XPayr.git
cd XPayr/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### Environment Configuration

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Circle CCTP Configuration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_API_URL=https://iris-api-sandbox.circle.com

# Chain Private Keys (for testnet)
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
BASE_PRIVATE_KEY=your_base_private_key
ARBITRUM_PRIVATE_KEY=your_arbitrum_private_key
POLYGON_PRIVATE_KEY=your_polygon_private_key

# RPC URLs (optional, defaults provided)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
BASE_RPC_URL=https://sepolia.base.org
```

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm run test:cctp
```

## API Documentation

### 🌉 Bridge Endpoints

#### Get Quote
```http
POST /api/cctp/quote
```

**Request:**
```json
{
  "fromChain": "ETH",
  "toChain": "BASE", 
  "amount": "100.5",
  "recipient": "0x742d35cc6634C0532925a3b8D598C4f1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fromChain": "ETH",
    "toChain": "BASE",
    "amount": "100.5",
    "quote": {
      "fees": {
        "gasFee": "0.01",
        "bridgeFee": "0",
        "totalFee": "0.01"
      },
      "estimatedTime": 300
    }
  }
}
```

#### Execute Bridge
```http
POST /api/cctp/bridge
```

**Request:**
```json
{
  "fromChain": "ETH",
  "toChain": "BASE",
  "amount": "100.5",
  "recipient": "0x742d35cc6634C0532925a3b8D598C4f1234567890",
  "dryRun": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "dispatches": [{
      "chain": "BASE",
      "amount": "100.5",
      "status": "COMPLETED",
      "transactionHash": "0x123...",
      "messageId": "0x456...",
      "attestationHash": "0x789..."
    }],
    "totalFees": "0.01",
    "estimatedTime": 300
  }
}
```

#### Simulate Dispatch
```http
POST /api/cctp/simulate
```

**Request:**
```json
{
  "sourceChain": "ETH",
  "dispatchPlan": [50000000, 50500000],
  "chains": ["BASE", "ARB"],
  "recipients": [
    "0x742d35cc6634C0532925a3b8D598C4f1234567890",
    "0x742d35cc6634C0532925a3b8D598C4f0987654321"
  ],
  "totalAmount": "100.5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAmount": "100.5",
    "totalFees": "0.02",
    "estimatedTime": 350,
    "feasible": true,
    "warnings": [],
    "dispatches": [
      {
        "chain": "BASE",
        "amount": "50",
        "fees": "0.01",
        "estimatedTime": 300
      },
      {
        "chain": "ARB", 
        "amount": "50.5",
        "fees": "0.01",
        "estimatedTime": 350
      }
    ]
  }
}
```

#### Monitor Status
```http
GET /api/cctp/status/{messageId1},{messageId2}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "completed": 1,
    "pending": 1,
    "failed": 0,
    "messages": [
      {
        "messageId": "0x123...",
        "status": "COMPLETED",
        "progress": 100
      },
      {
        "messageId": "0x456...",
        "status": "ATTESTING", 
        "progress": 60
      }
    ]
  }
}
```

### 📋 Information Endpoints

#### Get Supported Chains
```http
GET /api/cctp/chains
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supportedChains": ["ETH", "BASE", "ARB", "POLYGON"],
    "chainConfigs": [
      {
        "chain": "ETH",
        "config": {
          "chainId": 11155111,
          "name": "Ethereum",
          "contracts": {
            "usdc": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
            "tokenMessenger": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"
          }
        }
      }
    ]
  }
}
```

## Architecture

### Service Structure

```
src/
├── services/           # Core business logic
│   ├── circle.ts      # Enhanced Circle CCTP service  
│   └── integrated-service.ts  # Multi-chain orchestration
├── types/             # TypeScript type definitions
│   └── cctp.ts        # CCTP-specific types
├── constants/         # Configuration constants
│   └── cctp.ts        # Chain addresses and configs
├── utils/             # Utility functions
│   └── cctp.ts        # Helper functions
├── config/            # Environment configuration
│   └── index.ts       # Centralized config management
└── scripts/           # Automation scripts
    └── test-cctp.ts   # Integration tests
```

### Key Components

#### CircleService
- **Purpose**: Core CCTP operations (quotes, bridging, monitoring)
- **Features**: Retry logic, error handling, attestation polling
- **Usage**: Direct CCTP integration

#### IntegratedXPayrService  
- **Purpose**: Multi-chain dispatch orchestration
- **Features**: Batch processing, simulation, status monitoring
- **Usage**: Complex cross-chain workflows

#### Configuration Management
- **Purpose**: Centralized environment configuration
- **Features**: Validation, environment-specific settings
- **Usage**: Server initialization and service configuration

## Testing

### Automated Tests
```bash
# Run full integration test suite
npm run test:cctp

# Run specific test scenarios
npx ts-node src/scripts/test-cctp.ts
```

### Manual Testing
```bash
# Test quote endpoint
curl -X POST http://localhost:3000/api/cctp/quote \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromChain": "ETH",
    "toChain": "BASE",
    "amount": "10",
    "recipient": "0x742d35cc6634C0532925a3b8D598C4f1234567890"
  }'

# Test simulation endpoint  
curl -X POST http://localhost:3000/api/cctp/simulate \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceChain": "ETH",
    "dispatchPlan": [10000000],
    "chains": ["BASE"],
    "recipients": ["0x742d35cc6634C0532925a3b8D598C4f1234567890"],
    "totalAmount": "10"
  }'
```

## Production Deployment

### Environment Setup
1. **Switch to Mainnet**: Set `NODE_ENV=production`
2. **Update RPC URLs**: Use production-grade RPC providers
3. **Configure API Keys**: Use production Circle API key
4. **Security**: Enable rate limiting and API key authentication

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Monitoring
- **Health Checks**: `/api/health` endpoint
- **Metrics**: Enable metrics collection with `ENABLE_METRICS=true`
- **Logging**: Configure log levels and file output

## Security Considerations

### Private Key Management
- Use environment variables or secure key management services
- Never commit private keys to version control
- Rotate keys regularly in production

### API Security
- Enable rate limiting for production
- Use API key authentication for sensitive endpoints
- Implement request validation and sanitization

### Network Security
- Use HTTPS in production
- Configure CORS appropriately
- Monitor for unusual transaction patterns

## Troubleshooting

### Common Issues

#### "Missing CIRCLE_API_KEY" Error
```bash
# Solution: Set your Circle API key
export CIRCLE_API_KEY=your_key_here
```

#### "Unsupported chain" Error
```bash
# Solution: Use supported chain names
# Supported: ETH, BASE, ARB, POLYGON
```

#### "Quote failed" Error
```bash
# Check RPC connectivity
curl -X POST https://sepolia.base.org \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}'
```

#### Gas Estimation Failures
- Check RPC URL configuration
- Verify contract addresses are correct
- Ensure sufficient balance for gas fees

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev
```

## Contributing

### Development Setup
```bash
# Install development dependencies
npm install

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm run test:cctp
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Standard configuration
- **Prettier**: Automatic formatting
- **Testing**: Integration tests required

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Submit GitHub issues for bugs and feature requests
- **Testing**: Use the test suite to validate functionality

---

**Built with ❤️ by the XPayr Team**
