#!/bin/bash

# XPayr Backend Setup Script
# This script helps set up the XPayr backend with enhanced CCTP integration

set -e  # Exit on any error

echo "🚀 XPayr Backend Setup"
echo "======================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js version 18+ is recommended. Current: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_status "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Create .env file if it doesn't exist
setup_env() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        
        cat > .env << 'EOF'
# XPayr Backend Configuration

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Circle CCTP Configuration (Required)
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_API_URL=https://iris-api-sandbox.circle.com
CIRCLE_TIMEOUT=600000
CIRCLE_RETRY_ATTEMPTS=5
CIRCLE_RETRY_DELAY=15000

# Chain Private Keys (Required for execution)
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key_here
BASE_PRIVATE_KEY=your_base_private_key_here
AVALANCHE_PRIVATE_KEY=your_avalanche_private_key_here
ARBITRUM_PRIVATE_KEY=your_arbitrum_private_key_here
POLYGON_PRIVATE_KEY=your_polygon_private_key_here

# RPC URLs (Optional - defaults provided)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
BASE_RPC_URL=https://sepolia.base.org
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com

# LayerZero Configuration
LZ_ENDPOINT_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f
LZ_ENDPOINT_BASE_SEPOLIA=0x6EDCE65403992e310A62460808c4b910D972f10f
LZ_READ_CHANNEL_ID=40217

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
REQUIRE_API_KEY=false

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# Feature Flags
ENABLE_LEGACY_API=true
ENABLE_METRICS=false
ENABLE_SWAGGER=false
ENABLE_CCTP_V2=true
EOF

        print_status "Created .env file with default configuration"
        print_warning "Please edit .env file and add your API keys and private keys"
    else
        print_status ".env file already exists"
    fi
}

# Build TypeScript
build_project() {
    print_info "Building TypeScript project..."
    npm run build 2>/dev/null || {
        print_warning "Build command not available, skipping..."
    }
}

# Run tests
run_tests() {
    print_info "Running integration tests..."
    npm run test:cctp 2>/dev/null || {
        print_warning "Tests failed or Circle API key not configured"
        print_info "Configure your .env file and run 'npm run test:cctp' manually"
    }
}

# Main setup function
main() {
    echo "Starting XPayr backend setup..."
    echo ""
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_node
    check_npm
    echo ""
    
    # Install dependencies
    install_dependencies
    echo ""
    
    # Setup environment
    setup_env
    echo ""
    
    # Build project
    build_project
    echo ""
    
    # Print setup completion
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Edit .env file and add your Circle API key and private keys"
    echo "2. Run 'npm run test:cctp' to test the integration"
    echo "3. Run 'npm run dev' to start the development server"
    echo ""
    echo "📚 Documentation:"
    echo "- README.md: Complete API documentation"
    echo "- src/scripts/test-cctp.ts: Integration test examples"
    echo "- src/config/index.ts: Configuration options"
    echo ""
    echo "🔧 Useful Commands:"
    echo "- npm run dev          # Start development server"
    echo "- npm run test:cctp    # Run integration tests"
    echo "- npm start            # Start production server"
    echo "- npm run build        # Build TypeScript"
    echo ""
    
    # Check if Circle API key is configured
    if grep -q "your_circle_api_key_here" .env 2>/dev/null; then
        print_warning "Remember to configure your Circle API key in .env file!"
        echo "Get your API key from: https://console.circle.com/"
    fi
    
    # Check if private keys are configured
    if grep -q "your_ethereum_private_key_here" .env 2>/dev/null; then
        print_warning "Remember to configure your private keys in .env file!"
        echo "Use testnet private keys for development"
    fi
    
    echo ""
    print_status "XPayr backend is ready! 🚀"
}

# Run main function
main "$@"
