// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { USDCBalanceFetcher } from "../src/USDCBalanceFetcher.sol";

/**
 * @title DeployFetchers
 * @notice Script de déploiement pour les USDCBalanceFetcher sur toutes les chaînes
 * @dev Gère le déploiement individuel des fetchers sur chaque chaîne supportée
 */
contract DeployFetchers is Script {
    
    // Configuration des chaînes supportées
    struct ChainConfig {
        string name;
        uint32 lzEid;           // LayerZero Endpoint ID
        address lzEndpoint;     // Adresse du LayerZero Endpoint
        address usdcAddress;    // Adresse du contrat USDC sur cette chaîne
        uint256 chainId;        // Chain ID standard
    }

    // Configuration des chaînes de test
    mapping(string => ChainConfig) public chainConfigs;
    
    // Adresses déployées
    address public deployedFetcher;

    function setUp() public {
        // Configuration des chaînes LayerZero V2 (Testnet)
        chainConfigs["sepolia"] = ChainConfig({
            name: "Sepolia",
            lzEid: 40161,
            lzEndpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f,
            usdcAddress: vm.envAddress("SEPOLIA_USDC_ADDRESS"),
            chainId: 11155111
        });

        chainConfigs["fuji"] = ChainConfig({
            name: "Fuji",
            lzEid: 40106,
            lzEndpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f,
            usdcAddress: vm.envAddress("FUJI_USDC_ADDRESS"),
            chainId: 43113
        });
    }

    /**
     * @notice Script principal - déploie le fetcher sur la chaîne actuelle
     */
    function run() public {
        uint256 currentChainId = block.chainid;
        
        console.log("=== Deploying USDCBalanceFetcher ===");
        console.log("Chain ID:", currentChainId);
        
        ChainConfig memory config;
        string memory chainName;
        
        if (currentChainId == 11155111) {  // Sepolia
            config = chainConfigs["sepolia"];
            chainName = "sepolia";
        } else if (currentChainId == 43113) {  // Fuji
            config = chainConfigs["fuji"];
            chainName = "fuji";
        } else {
            revert("Unsupported chain ID");
        }
        
        deployFetcher(chainName, config);
        testFetcher(chainName, config);
        saveDeploymentInfo(chainName, config);
    }

    /**
     * @notice Déploie un USDCBalanceFetcher sur la chaîne actuelle
     * @param chainName Nom de la chaîne
     * @param config Configuration de la chaîne
     */
    function deployFetcher(string memory chainName, ChainConfig memory config) internal {
        console.log("Deploying on", config.name);
        console.log("USDC Address:", config.usdcAddress);
        console.log("LayerZero EID:", config.lzEid);

        vm.startBroadcast();
        
        USDCBalanceFetcher fetcher = new USDCBalanceFetcher(config.usdcAddress);
        deployedFetcher = address(fetcher);
        
        vm.stopBroadcast();

        console.log("=== Deployment Successful ===");
        console.log("Fetcher Address:", address(fetcher));
        console.log("Block Number:", block.number);
        console.log("Gas Used: Check transaction receipt");
        console.log("");
    }

    /**
     * @notice Teste le fetcher déployé
     * @param chainName Nom de la chaîne
     * @param config Configuration de la chaîne
     */
    function testFetcher(string memory chainName, ChainConfig memory config) internal view {
        require(deployedFetcher != address(0), "No fetcher deployed");
        
        USDCBalanceFetcher fetcher = USDCBalanceFetcher(deployedFetcher);
        
        console.log("=== Testing Deployed Fetcher ===");
        console.log("Contract Address:", deployedFetcher);
        
        // Vérifier la configuration
        address configuredUSDC = fetcher.getUSDCAddress();
        console.log("Configured USDC:", configuredUSDC);
        console.log("Expected USDC:", config.usdcAddress);
        
        if (configuredUSDC == config.usdcAddress) {
            console.log("✅ USDC configuration correct");
        } else {
            console.log("❌ USDC configuration mismatch");
        }

        // Test avec un wallet de test
        address testWallet = getTestWallet(chainName);
        if (testWallet != address(0)) {
            console.log("Testing with wallet:", testWallet);
            
            try fetcher.fetchUSDCBalance(testWallet) returns (uint256 balance) {
                console.log("Wallet balance:", balance);
                
                // Test avec threshold
                uint256 testThreshold = getTestThreshold(chainName);
                try fetcher.fetchUSDCBalanceWithThreshold(testWallet, testThreshold) returns (USDCBalanceFetcher.BalanceData memory data) {
                    console.log("Balance with threshold:");
                    console.log("  - Balance:", data.balance);
                    console.log("  - Threshold:", data.minThreshold);
                    console.log("✅ All fetcher functions working");
                } catch {
                    console.log("❌ fetchUSDCBalanceWithThreshold failed");
                }
            } catch {
                console.log("❌ fetchUSDCBalance failed - check USDC contract");
            }
        }
    }

    /**
     * @notice Récupère l'adresse du wallet de test pour une chaîne
     * @param chainName Nom de la chaîne
     * @return testWallet Adresse du wallet de test
     */
    function getTestWallet(string memory chainName) internal view returns (address testWallet) {
        if (keccak256(bytes(chainName)) == keccak256(bytes("sepolia"))) {
            try vm.envAddress("SEPOLIA_TEST_WALLET") returns (address wallet) {
                return wallet;
            } catch {
                console.log("⚠️  SEPOLIA_TEST_WALLET not configured");
                return address(0);
            }
        } else if (keccak256(bytes(chainName)) == keccak256(bytes("fuji"))) {
            try vm.envAddress("FUJI_TEST_WALLET") returns (address wallet) {
                return wallet;
            } catch {
                console.log("⚠️  FUJI_TEST_WALLET not configured");
                return address(0);
            }
        }
        return address(0);
    }

    /**
     * @notice Récupère le seuil de test pour une chaîne
     * @param chainName Nom de la chaîne
     * @return threshold Seuil de test
     */
    function getTestThreshold(string memory chainName) internal view returns (uint256 threshold) {
        if (keccak256(bytes(chainName)) == keccak256(bytes("sepolia"))) {
            try vm.envUint("MIN_THRESHOLD_SEPOLIA") returns (uint256 t) {
                return t;
            } catch {
                return 100 * 10**6; // 100 USDC par défaut
            }
        } else if (keccak256(bytes(chainName)) == keccak256(bytes("fuji"))) {
            try vm.envUint("MIN_THRESHOLD_FUJI") returns (uint256 t) {
                return t;
            } catch {
                return 200 * 10**6; // 200 USDC par défaut
            }
        }
        return 100 * 10**6;
    }

    /**
     * @notice Sauvegarde les informations de déploiement
     * @param chainName Nom de la chaîne
     * @param config Configuration de la chaîne
     */
    function saveDeploymentInfo(string memory chainName, ChainConfig memory config) internal view {
        console.log("=== Deployment Summary ===");
        console.log("Chain:", config.name);
        console.log("Fetcher Address:", deployedFetcher);
        console.log("USDC Address:", config.usdcAddress);
        console.log("LayerZero EID:", config.lzEid);
        console.log("");
        
        console.log("=== Add to .env file ===");
        if (keccak256(bytes(chainName)) == keccak256(bytes("sepolia"))) {
            console.log("FETCHER_SEPOLIA_ADDRESS=", deployedFetcher);
        } else if (keccak256(bytes(chainName)) == keccak256(bytes("fuji"))) {
            console.log("FETCHER_FUJI_ADDRESS=", deployedFetcher);
        }
        console.log("");
        
        console.log("=== Next Steps ===");
        console.log("1. Copy the address above to your .env file");
        console.log("2. Deploy fetchers on other chains if needed");
        console.log("3. Deploy the analyzer using DeployAnalyzer.s.sol");
        console.log("4. Verify the complete setup");
    }
}

/**
 * @title TestFetcher
 * @notice Script pour tester un fetcher déjà déployé
 */
contract TestFetcher is Script {
    
    function run() external view {
        uint256 currentChainId = block.chainid;
        
        console.log("=== Testing Existing Fetcher ===");
        console.log("Chain ID:", currentChainId);
        
        address fetcherAddress;
        address testWallet;
        uint256 testThreshold;
        string memory chainName;
        
        if (currentChainId == 11155111) {  // Sepolia
            fetcherAddress = vm.envAddress("FETCHER_SEPOLIA_ADDRESS");
            testWallet = vm.envAddress("SEPOLIA_TEST_WALLET");
            testThreshold = vm.envUint("MIN_THRESHOLD_SEPOLIA");
            chainName = "Sepolia";
        } else if (currentChainId == 43113) {  // Fuji
            fetcherAddress = vm.envAddress("FETCHER_FUJI_ADDRESS");
            testWallet = vm.envAddress("FUJI_TEST_WALLET");
            testThreshold = vm.envUint("MIN_THRESHOLD_FUJI");
            chainName = "Fuji";
        } else {
            revert("Unsupported chain ID");
        }
        
        require(fetcherAddress != address(0), "Fetcher not deployed on this chain");
        
        USDCBalanceFetcher fetcher = USDCBalanceFetcher(fetcherAddress);
        
        console.log("Chain:", chainName);
        console.log("Fetcher Address:", fetcherAddress);
        console.log("Test Wallet:", testWallet);
        console.log("Test Threshold:", testThreshold);
        console.log("");
        
        // Test USDC address
        address usdcAddress = fetcher.getUSDCAddress();
        console.log("USDC Contract:", usdcAddress);
        
        // Test balance fetch
        uint256 balance = fetcher.fetchUSDCBalance(testWallet);
        console.log("Wallet Balance:", balance);
        
        // Test structured fetch
        USDCBalanceFetcher.BalanceData memory balanceData = fetcher.fetchUSDCBalanceWithThreshold(
            testWallet, 
            testThreshold
        );
        
        console.log("Structured Data:");
        console.log("  - Balance:", balanceData.balance);
        console.log("  - Threshold:", balanceData.minThreshold);
        
        if (balanceData.balance == balance && balanceData.minThreshold == testThreshold) {
            console.log("✅ All tests passed");
        } else {
            console.log("❌ Data consistency issues detected");
        }
    }
}

/**
 * @title FetcherUtilities
 * @notice Utilitaires pour la gestion des fetchers
 */
contract FetcherUtilities is Script {
    
    function run() external {
        string memory action = vm.envString("FETCHER_ACTION");
        
        if (keccak256(bytes(action)) == keccak256(bytes("list-deployed"))) {
            listDeployedFetchers();
        } else if (keccak256(bytes(action)) == keccak256(bytes("verify-config"))) {
            verifyConfiguration();
        } else {
            console.log("Available FETCHER_ACTION values:");
            console.log("- list-deployed: Show all deployed fetchers");
            console.log("- verify-config: Verify fetcher configurations");
        }
    }
    
    function listDeployedFetchers() internal view {
        console.log("=== Deployed Fetchers ===");
        
        try vm.envAddress("FETCHER_SEPOLIA_ADDRESS") returns (address sepolia) {
            console.log("Sepolia:", sepolia);
        } catch {
            console.log("Sepolia: Not deployed");
        }
        
        try vm.envAddress("FETCHER_FUJI_ADDRESS") returns (address fuji) {
            console.log("Fuji:", fuji);
        } catch {
            console.log("Fuji: Not deployed");
        }
    }
    
    function verifyConfiguration() internal view {
        console.log("=== Verifying Fetcher Configuration ===");
        
        // Check Sepolia
        try vm.envAddress("FETCHER_SEPOLIA_ADDRESS") returns (address sepoliaFetcher) {
            console.log("Checking Sepolia fetcher...");
            USDCBalanceFetcher fetcher = USDCBalanceFetcher(sepoliaFetcher);
            address expectedUSDC = vm.envAddress("SEPOLIA_USDC_ADDRESS");
            address actualUSDC = fetcher.getUSDCAddress();
            
            console.log("Expected USDC:", expectedUSDC);
            console.log("Actual USDC:", actualUSDC);
            console.log("Status:", expectedUSDC == actualUSDC ? "✅ OK" : "❌ Mismatch");
        } catch {
            console.log("Sepolia fetcher not found or invalid");
        }
        
        console.log("");
        
        // Check Fuji
        try vm.envAddress("FETCHER_FUJI_ADDRESS") returns (address fujiFetcher) {
            console.log("Checking Fuji fetcher...");
            USDCBalanceFetcher fetcher = USDCBalanceFetcher(fujiFetcher);
            address expectedUSDC = vm.envAddress("FUJI_USDC_ADDRESS");
            address actualUSDC = fetcher.getUSDCAddress();
            
            console.log("Expected USDC:", expectedUSDC);
            console.log("Actual USDC:", actualUSDC);
            console.log("Status:", expectedUSDC == actualUSDC ? "✅ OK" : "❌ Mismatch");
        } catch {
            console.log("Fuji fetcher not found or invalid");
        }
    }
}
