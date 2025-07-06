import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration for XPayr backend
 */
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
  },

  // Circle CCTP configuration
  circle: {
    apiKey: process.env.CIRCLE_API_KEY || '',
    apiBaseUrl: process.env.CIRCLE_API_URL || (
      process.env.NODE_ENV === 'production' 
        ? 'https://iris-api.circle.com'
        : 'https://iris-api-sandbox.circle.com'
    ),
    isTestnet: process.env.NODE_ENV !== 'production',
    timeout: parseInt(process.env.CIRCLE_TIMEOUT || '600000'), // 10 minutes
    retryAttempts: parseInt(process.env.CIRCLE_RETRY_ATTEMPTS || '5'),
    retryDelay: parseInt(process.env.CIRCLE_RETRY_DELAY || '15000'), // 15 seconds
  },

  // Blockchain configuration
  chains: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/',
      privateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
      infuraApiKey: process.env.INFURA_API_KEY || '',
    },
    base: {
      rpcUrl: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
      privateKey: process.env.BASE_PRIVATE_KEY || '',
    },
    avalanche: {
      rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
      privateKey: process.env.AVALANCHE_PRIVATE_KEY || '',
    },
    arbitrum: {
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      privateKey: process.env.ARBITRUM_PRIVATE_KEY || '',
    },
    polygon: {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      privateKey: process.env.POLYGON_PRIVATE_KEY || '',
    },
  },

  // LayerZero configuration (for smart contracts)
  layerZero: {
    endpoints: {
      sepolia: process.env.LZ_ENDPOINT_SEPOLIA || '0x6EDCE65403992e310A62460808c4b910D972f10f',
      baseSepolia: process.env.LZ_ENDPOINT_BASE_SEPOLIA || '0x6EDCE65403992e310A62460808c4b910D972f10f',
    },
    readChannel: process.env.LZ_READ_CHANNEL_ID || '40217',
  },

  // Security configuration
  security: {
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },
    apiKeys: {
      required: process.env.REQUIRE_API_KEY === 'true',
      validKeys: process.env.VALID_API_KEYS?.split(',') || [],
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: process.env.LOG_FILE || '',
  },

  // Database configuration (if needed in the future)
  database: {
    url: process.env.DATABASE_URL || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  },

  // Feature flags
  features: {
    enableLegacyAPI: process.env.ENABLE_LEGACY_API !== 'false',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    enableCCTPv2: process.env.ENABLE_CCTP_V2 !== 'false',
  },
};

/**
 * Validate configuration
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required environment variables
  if (!config.circle.apiKey) {
    errors.push('CIRCLE_API_KEY is required');
  }

  // Validate chain private keys for non-dry-run operations
  const requiredChainKeys = ['ethereum', 'base', 'avalanche', 'arbitrum'];
  for (const chain of requiredChainKeys) {
    const chainConfig = config.chains[chain as keyof typeof config.chains];
    if (!chainConfig.privateKey && config.server.environment === 'production') {
      errors.push(`${chain.toUpperCase()}_PRIVATE_KEY is required for production`);
    }
  }

  // Validate URLs
  try {
    new URL(config.circle.apiBaseUrl);
  } catch {
    errors.push('Invalid CIRCLE_API_URL');
  }

  // Validate numeric values
  if (config.circle.timeout < 10000) {
    errors.push('CIRCLE_TIMEOUT must be at least 10000ms');
  }

  if (config.circle.retryAttempts < 1 || config.circle.retryAttempts > 10) {
    errors.push('CIRCLE_RETRY_ATTEMPTS must be between 1 and 10');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration for a specific environment
 */
export function getEnvironmentConfig(environment: string = config.server.environment) {
  const baseConfig = { ...config };
  
  switch (environment) {
    case 'development':
      baseConfig.circle.isTestnet = true;
      baseConfig.logging.level = 'debug';
      break;
    case 'staging':
      baseConfig.circle.isTestnet = true;
      baseConfig.logging.level = 'info';
      break;
    case 'production':
      baseConfig.circle.isTestnet = false;
      baseConfig.logging.level = 'warn';
      break;
  }
  
  return baseConfig;
}

// Export default configuration
export default config;
