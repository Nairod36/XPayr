// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { GenericUSDCAnalyzer } from "../src/GenericUSDCAnalyzer.sol";
import { USDCBalanceFetcher } from "../src/USDCBalanceFetcher.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title DeployAnalyzer
 * @notice Script de déploiement pour le GenericUSDCAnalyzer
 * @dev Doit être exécuté sur Sepolia après le déploiement des fetchers
 */
contract DeployAnalyzer is Script {
    
    // Configuration LayerZero
    struct LayerZeroConfig {
        address endpoint;
        uint32 readChannel;
    }
    
    // Configuration des chaînes supportées
    struct ChainSetup {
        uint32 lzEid;
        address fetcherAddress;
        string name;
    }
    
    // Variables de configuration
    LayerZeroConfig public lzConfig;
    ChainSetup[] public chains;
    
    // Contrat déployé
    GenericUSDCAnalyzer public analyzer;

    function setUp() public {
        require(block.chainid == 11155111, "Analyzer must be deployed on Sepolia");
        
        // Configuration LayerZero pour Sepolia
        lzConfig = LayerZeroConfig({
            endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f,
            readChannel: uint32(vm.envUint("READ_CHANNEL"))
        });
        
        // Configuration des chaînes et leurs fetchers
        setupChains();
    }

    /**
     * @notice Configure les chaînes et leurs fetchers
     */
    function setupChains() internal {
        // Sepolia
        chains.push(ChainSetup({
            lzEid: 40161,
            fetcherAddress: vm.envAddress("FETCHER_SEPOLIA_ADDRESS"),
            name: "Sepolia"
        }));
        
        // Base Sepolia
        chains.push(ChainSetup({
            lzEid: 40245,
            fetcherAddress: vm.envAddress("FETCHER_BASE_ADDRESS"),
            name: "Base"
        }));
        
        console.log("=== Chain Configuration ===");
        for (uint i = 0; i < chains.length; i++) {
            console.log("Chain:", chains[i].name);
            console.log("  EID:", chains[i].lzEid);
            console.log("  Fetcher:", chains[i].fetcherAddress);
            require(chains[i].fetcherAddress != address(0), string.concat("Fetcher not deployed on ", chains[i].name));
        }
        console.log("");
    }

    /**
     * @notice Script principal - déploie l'analyzer
     */
    function run() public {
        console.log("=== Deploying GenericUSDCAnalyzer on Sepolia ===");
        console.log("LayerZero Endpoint:", lzConfig.endpoint);
        console.log("Read Channel:", lzConfig.readChannel);
        console.log("Number of chains:", chains.length);
        
        deployAnalyzer();
        testAnalyzer();
        saveDeploymentInfo();
    }

    /**
     * @notice Déploie l'analyzer avec la configuration des fetchers
     */
    function deployAnalyzer() internal {
        // Préparer les paramètres pour le constructeur
        uint32[] memory eids = new uint32[](chains.length);
        address[] memory fetcherAddresses = new address[](chains.length);
        
        for (uint i = 0; i < chains.length; i++) {
            eids[i] = chains[i].lzEid;
            fetcherAddresses[i] = chains[i].fetcherAddress;
        }

        vm.startBroadcast();
        
        analyzer = new GenericUSDCAnalyzer(
            lzConfig.endpoint,
            lzConfig.readChannel,
            eids,
            fetcherAddresses
        );
        
        vm.stopBroadcast();

        console.log("=== Deployment Successful ===");
        console.log("Analyzer Address:", address(analyzer));
        console.log("Block Number:", block.number);
        console.log("Gas Used: Check transaction receipt");
        console.log("");
    }

    /**
     * @notice Teste la configuration de l'analyzer
     */
    function testAnalyzer() internal view {
        require(address(analyzer) != address(0), "Analyzer not deployed");
        
        console.log("=== Testing Analyzer Configuration ===");
        console.log("Contract Address:", address(analyzer));
        console.log("Owner:", analyzer.owner());
        console.log("Read Channel:", analyzer.READ_CHANNEL());
        console.log("Read Type:", analyzer.READ_TYPE());
        
        // Vérifier les mappings des fetchers
        console.log("Fetcher Mappings:");
        for (uint i = 0; i < chains.length; i++) {
            address mappedFetcher = analyzer.fetcherByChain(chains[i].lzEid);
            console.log("  Chain:", chains[i].name);
            console.log("    EID:", chains[i].lzEid);
            console.log("    Fetcher:", mappedFetcher);
            
            if (mappedFetcher == chains[i].fetcherAddress) {
                console.log("    Status: Correct mapping");
            } else {
                console.log("    Status: Mapping mismatch!");
                console.log("    Expected:", chains[i].fetcherAddress);
                console.log("    Got:", mappedFetcher);
            }
        }
        
        console.log("Analyzer configuration verified");
    }

    /**
     * @notice Sauvegarde les informations de déploiement
     */
    function saveDeploymentInfo() internal view {
        console.log("=== Deployment Summary ===");
        console.log("Analyzer Address:", address(analyzer));
        console.log("LayerZero Endpoint:", lzConfig.endpoint);
        console.log("Read Channel:", lzConfig.readChannel);
        console.log("Configured Chains:", chains.length);
        console.log("");
        
        console.log("=== Add to .env file ===");
        console.log("ANALYZER_SEPOLIA_ADDRESS=", address(analyzer));
        console.log("");
        
        console.log("=== Next Steps ===");
        console.log("1. Copy the analyzer address to your .env file");
        console.log("2. Test the complete setup with TestAnalyzerIntegration");
        console.log("3. Run cross-chain analysis tests");
        console.log("4. Monitor for DispatchRecommendation events");
    }
}

/**
 * @title TestAnalyzerIntegration
 * @notice Script pour tester l'intégration complète LayerZero
 */
contract TestAnalyzerIntegration is Script {

    using OptionsBuilder for bytes;
    
    /**
     * @notice Crée les options LayerZero appropriées pour les requêtes cross-chain
     * @return extraOptions Options encodées pour LayerZero V2
     */
    function createLayerZeroOptions() internal pure returns (bytes memory) {
        // Pour lzRead, essayer d'abord avec des options minimalistes
        return OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(150_000, 0); // Gas limit plus conservateur
    }
    
    function run() external {
        require(block.chainid == 11155111, "Integration tests must run on Sepolia");
        
        address analyzerAddress = vm.envAddress("ANALYZER_SEPOLIA_ADDRESS");
        require(analyzerAddress != address(0), "Analyzer not deployed");
        
        console.log("=== Testing LayerZero Integration ===");
        console.log("Analyzer Address:", analyzerAddress);
        
        // Vérifier la configuration de l'analyzer
        GenericUSDCAnalyzer analyzer = GenericUSDCAnalyzer(analyzerAddress);
        uint32 currentReadChannel = analyzer.READ_CHANNEL();
        console.log("Analyzer READ_CHANNEL:", currentReadChannel);
        
        if (currentReadChannel != 4294967295) {
            console.log("WARNING: Analyzer READ_CHANNEL is not 4294967295!");
            console.log("This analyzer was deployed with wrong READ_CHANNEL.");
            console.log("You may need to redeploy the analyzer with correct configuration.");
        }
        
        // Configuration des wallets et seuils de test
        // address[] memory merchantWallets = new address[](2);
        // uint32[] memory targetEids = new uint32[](2);
        // uint256[] memory minThresholds = new uint256[](2);
        address[] memory merchantWallets = new address[](1);
        uint32[] memory targetEids = new uint32[](1);
        uint256[] memory minThresholds = new uint256[](1);
        
        merchantWallets[0] = vm.envAddress("SEPOLIA_TEST_WALLET");
        // merchantWallets[1] = vm.envAddress("BASE_TEST_WALLET");
        
        targetEids[0] = 40161; // Sepolia EID
        // targetEids[1] = 40245; // Base EID
        
        minThresholds[0] = vm.envUint("MIN_THRESHOLD_SEPOLIA");
        // minThresholds[1] = vm.envUint("MIN_THRESHOLD_BASE");
        
        // Montant USDC à distribuer (depuis .env ou valeur par défaut)
        uint256 usdcAmount;
        try vm.envUint("TEST_USDC_AMOUNT") returns (uint256 amount) {
            usdcAmount = amount;
        } catch {
            usdcAmount = 1000 * 10**6; // 1000 USDC par défaut
        }
        
        console.log("Test Configuration:");
        console.log("  Sepolia wallet:", merchantWallets[0], "threshold:", minThresholds[0]);
        // console.log("  Base wallet:", merchantWallets[1], "threshold:", minThresholds[1]);
        console.log("  USDC amount to distribute:", usdcAmount);
        
        // Estimation des frais
        uint256 estimatedFee = 0.5 ether; // Estimation conservatrice
        console.log("Estimated fee:", estimatedFee);
        
        require(address(this).balance >= estimatedFee, "Insufficient ETH for LayerZero fees");
        
        // Création des options LayerZero appropriées
        bytes memory extraOptions = createLayerZeroOptions();
        
        vm.startBroadcast();
        
        try analyzer.analyzeBalances{value: estimatedFee}(
            merchantWallets,
            targetEids,
            minThresholds,
            usdcAmount,
            extraOptions
        ) returns (MessagingReceipt memory receipt) {
            console.log("Cross-chain analysis initiated successfully!");
            console.log("Receipt GUID:", vm.toString(receipt.guid));
            console.log("Receipt Nonce:", receipt.nonce);
            console.log("Fee paid:", receipt.fee.nativeFee);
            
            console.log("");
            console.log("=== Monitoring Instructions ===");
            console.log("1. Wait 5-10 minutes for LayerZero to process requests");
            console.log("2. Check for DispatchRecommendation event on analyzer");
            console.log("3. Monitor LayerZero Scan for transaction status");
            console.log("4. Event topic: DispatchRecommendation(uint256[])");
            
        } catch Error(string memory reason) {
            console.log("Analysis failed:", reason);
            console.log("Possible causes:");
            console.log("- Insufficient ETH for fees");
            console.log("- LayerZero endpoint issues");
            console.log("- Fetcher configuration problems");
        }
        
        vm.stopBroadcast();
    }
    
    receive() external payable {}
}

/**
 * @title AnalyzerUtilities
 * @notice Utilitaires pour la gestion de l'analyzer
 */
contract AnalyzerUtilities is Script {
    
    function run() external {
        string memory action = vm.envString("ANALYZER_ACTION");
        
        if (keccak256(bytes(action)) == keccak256(bytes("verify-setup"))) {
            verifyCompleteSetup();
        } else if (keccak256(bytes(action)) == keccak256(bytes("check-config"))) {
            checkConfiguration();
        } else if (keccak256(bytes(action)) == keccak256(bytes("estimate-fees"))) {
            estimateFees();
        } else {
            console.log("Available ANALYZER_ACTION values:");
            console.log("- verify-setup: Verify complete deployment setup");
            console.log("- check-config: Check analyzer configuration");
            console.log("- estimate-fees: Estimate LayerZero fees");
        }
    }
    
    function verifyCompleteSetup() internal view {
        console.log("=== Verifying Complete Setup ===");
        
        // Check fetchers
        address sepoliaFetcher = vm.envAddress("FETCHER_SEPOLIA_ADDRESS");
        address baseFetcher = vm.envAddress("FETCHER_BASE_ADDRESS");
        address analyzer = vm.envAddress("ANALYZER_SEPOLIA_ADDRESS");
        
        console.log("Deployment Status:");
        console.log("- Sepolia fetcher:", sepoliaFetcher != address(0) ? "Deployed" : "Missing");
        console.log("- Base fetcher:", baseFetcher != address(0) ? "Deployed" : "Missing");
        console.log("- Analyzer:", analyzer != address(0) ? "Deployed" : "Missing");
        
        if (analyzer != address(0)) {
            GenericUSDCAnalyzer analyzerContract = GenericUSDCAnalyzer(analyzer);
            
            console.log("");
            console.log("Analyzer Configuration:");
            console.log("- Read channel:", analyzerContract.READ_CHANNEL());
            console.log("- Owner:", analyzerContract.owner());
            
            // Check mappings
            address mappedSepolia = analyzerContract.fetcherByChain(40161);
            address mappedBase = analyzerContract.fetcherByChain(40245);
            
            console.log("Fetcher Mappings:");
            console.log("- Sepolia (40161):", mappedSepolia);
            console.log("- Base (40245):", mappedBase);
            
            bool sepoliaOK = mappedSepolia == sepoliaFetcher;
            bool baseOK = mappedBase == baseFetcher;
            
            console.log("Mapping Verification:");
            console.log("- Sepolia:", sepoliaOK ? "Correct" : "Incorrect");
            console.log("- Base:", baseOK ? "Correct" : "Incorrect");
            
            if (sepoliaOK && baseOK) {
                console.log("");
                console.log("Complete setup verified!");
                console.log("Ready for cross-chain testing");
            } else {
                console.log("");
                console.log("Configuration issues detected");
                console.log("Please redeploy the analyzer with correct fetcher addresses");
            }
        }
    }
    
    function checkConfiguration() internal view {
        address analyzer = vm.envAddress("ANALYZER_SEPOLIA_ADDRESS");
        require(analyzer != address(0), "Analyzer not deployed");
        
        console.log("=== Analyzer Configuration Details ===");
        
        GenericUSDCAnalyzer analyzerContract = GenericUSDCAnalyzer(analyzer);
        
        console.log("Contract:", analyzer);
        console.log("Owner:", analyzerContract.owner());
        console.log("Read Channel:", analyzerContract.READ_CHANNEL());
        console.log("Read Type:", analyzerContract.READ_TYPE());
        
        // Test wallet configuration
        console.log("");
        console.log("Test Wallet Configuration:");
        console.log("- Sepolia wallet:", vm.envAddress("SEPOLIA_TEST_WALLET"));
        console.log("- Base wallet:", vm.envAddress("BASE_TEST_WALLET"));
        console.log("- Sepolia threshold:", vm.envUint("MIN_THRESHOLD_SEPOLIA"));
        console.log("- Base threshold:", vm.envUint("MIN_THRESHOLD_BASE"));
    }
    
    function estimateFees() internal view {
        console.log("=== LayerZero Fee Estimation ===");
        console.log("Cross-chain read operations typically cost:");
        console.log("- Base fee per chain: ~0.003-0.008 ETH");
        console.log("- For 2 chains: ~0.006-0.016 ETH");
        console.log("- Recommended: 0.02 ETH for safety margin");
        console.log("");
        console.log("Factors affecting fees:");
        console.log("- Network congestion");
        console.log("- Gas prices on source/destination chains");
        console.log("- LayerZero oracle fees");
        console.log("- Message size (our messages are small)");
        console.log("");
        console.log("Use 0.02 ETH for testing, adjust based on actual usage");
    }
}
