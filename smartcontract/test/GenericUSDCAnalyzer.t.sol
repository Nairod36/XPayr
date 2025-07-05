// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GenericUSDCAnalyzer.sol";
import "../src/USDCBalanceFetcher.sol";

contract MockERC20 {
    mapping(address => uint256) balances;
    
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function setBalance(address account, uint256 balance) external {
        balances[account] = balance;
    }
}

contract MockLayerZeroEndpointV2 {
    uint32 public eid = 40161; // Exemple : Ethereum Sepolia
    
    function send(
        uint32,
        bytes calldata,
        bytes calldata,
        address
    ) external payable returns (MessagingReceipt memory) {
        // Mock implementation
        return MessagingReceipt({
            guid: bytes32(0),
            nonce: 1,
            fee: MessagingFee({nativeFee: 0, lzTokenFee: 0})
        });
    }
    
    function quote(
        uint32,
        bytes calldata,
        bytes calldata,
        bool
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({nativeFee: 0.001 ether, lzTokenFee: 0});
    }
}

contract GenericUSDCAnalyzerTest is Test {
    GenericUSDCAnalyzer analyzer;
    USDCBalanceFetcher fetcherEthereum;
    USDCBalanceFetcher fetcherAvalanche;
    MockERC20 usdcEthereum;
    MockERC20 usdcAvalanche;
    MockLayerZeroEndpointV2 endpoint;
    
    address merchant1 = address(0x1);
    address merchant2 = address(0x2);
    
    uint32 ethereumEid = 40161; // Sepolia
    uint32 avalancheEid = 40106; // Avalanche Testnet
    
    function setUp() public {
        // Deploy mock contracts
        endpoint = new MockLayerZeroEndpointV2();
        usdcEthereum = new MockERC20();
        usdcAvalanche = new MockERC20();
        
        // Deploy USDCBalanceFetchers
        fetcherEthereum = new USDCBalanceFetcher(address(usdcEthereum));
        fetcherAvalanche = new USDCBalanceFetcher(address(usdcAvalanche));
        
        // Prepare deployment parameters
        uint32[] memory eids = new uint32[](2);
        eids[0] = ethereumEid;
        eids[1] = avalancheEid;
        
        address[] memory fetcherAddresses = new address[](2);
        fetcherAddresses[0] = address(fetcherEthereum);
        fetcherAddresses[1] = address(fetcherAvalanche);
        
        // Deploy analyzer
        analyzer = new GenericUSDCAnalyzer(
            address(endpoint),
            1, // READ_CHANNEL
            eids,
            fetcherAddresses
        );
    }
    
    function testFetcherConfiguration() public {
        assertEq(analyzer.fetcherByChain(ethereumEid), address(fetcherEthereum));
        assertEq(analyzer.fetcherByChain(avalancheEid), address(fetcherAvalanche));
    }
    
    function testBalanceDataStruct() public {
        // Set up test balances
        usdcEthereum.setBalance(merchant1, 1000e6); // 1000 USDC
        
        // Test USDCBalanceFetcher directly
        uint256 testUsdcAmount = 2000e6; // 2000 USDC pour le test
        USDCBalanceFetcher.BalanceData memory result = fetcherEthereum.fetchUSDCBalanceWithThreshold(
            merchant1, 
            500e6, // minThreshold
            testUsdcAmount
        );
        
        assertEq(result.balance, 1000e6);
        assertEq(result.minThreshold, 500e6);
        assertEq(result.usdcAmount, testUsdcAmount);
    }
    
    function testLzMapDecoding() public {
        // Simulate la réponse du USDCBalanceFetcher
        uint256 balance = 1500e6;
        uint256 minThreshold = 1000e6;
        uint256 usdcAmount = 2000e6; // Test USDC amount
        
        // Encode comme si c'était la réponse du contrat fetcher
        bytes memory response = abi.encode(balance, minThreshold, usdcAmount);
        
        // Test lzMap
        bytes memory mapped = analyzer.lzMap("", response);
        
        // Decode le résultat
        GenericUSDCAnalyzer.BalanceData memory balanceData = abi.decode(mapped, (GenericUSDCAnalyzer.BalanceData));
        
        assertEq(balanceData.balance, balance);
        assertEq(balanceData.minThreshold, minThreshold);
        assertEq(balanceData.usdcAmount, usdcAmount);
    }
    
    function testLzReduceWithUnderThresholdWallet() public {
        // Montant USDC à distribuer : 1000 USDC
        uint256 usdcAmount = 1000e6;
        bytes memory cmd = abi.encode(usdcAmount);
        
        // Préparer des réponses mappées
        bytes[] memory responses = new bytes[](2);
        uint256 testUsdcAmount = 1000e6; // 1000 USDC pour le test
        
        // Wallet 1: 500 USDC, seuil 1000 (sous le seuil de 500 USDC)
        GenericUSDCAnalyzer.BalanceData memory data1 = GenericUSDCAnalyzer.BalanceData({
            balance: 500e6,
            minThreshold: 1000e6,
            usdcAmount: testUsdcAmount
        });
        responses[0] = abi.encode(data1);
        
        // Wallet 2: 2000 USDC, seuil 1000 (au-dessus du seuil)
        GenericUSDCAnalyzer.BalanceData memory data2 = GenericUSDCAnalyzer.BalanceData({
            balance: 2000e6,
            minThreshold: 1000e6,
            usdcAmount: testUsdcAmount
        });
        responses[1] = abi.encode(data2);
        
        // Test lzReduce avec une seule chaîne sous le seuil
        bytes memory result = analyzer.lzReduce(cmd, responses);
        uint256[] memory plan = abi.decode(result, (uint256[]));
        
        // Doit recommander d'envoyer tout au wallet 1 (sous le seuil)
        assertEq(plan[0], 1000e6); // Tous les 1000 USDC au wallet 1
        assertEq(plan[1], 0);      // 0 USDC au wallet 2
        
        // Vérifier que le total correspond
        uint256 total = plan[0] + plan[1];
        assertEq(total, usdcAmount);
    }
    
    function testLzReduceWithMultipleUnderThresholdWallets() public {
        // Montant USDC à distribuer : 1000 USDC
        uint256 usdcAmount = 1000e6;
        bytes memory cmd = abi.encode(usdcAmount);
        
        // Préparer des réponses mappées - les deux wallets sous le seuil
        bytes[] memory responses = new bytes[](2);
        
        // Wallet 1: 500 USDC, seuil 1000 (déficit: 500 USDC)
        GenericUSDCAnalyzer.BalanceData memory data1 = GenericUSDCAnalyzer.BalanceData({
            balance: 500e6,
            minThreshold: 1000e6,
            usdcAmount: usdcAmount
        });
        responses[0] = abi.encode(data1);
        
        // Wallet 2: 200 USDC, seuil 500 (déficit: 300 USDC)
        GenericUSDCAnalyzer.BalanceData memory data2 = GenericUSDCAnalyzer.BalanceData({
            balance: 200e6,
            minThreshold: 500e6,
            usdcAmount: usdcAmount
        });
        responses[1] = abi.encode(data2);
        
        // Test lzReduce avec plusieurs chaînes sous le seuil
        bytes memory result = analyzer.lzReduce(cmd, responses);
        uint256[] memory plan = abi.decode(result, (uint256[]));
        
        // Total déficit = 500 + 300 = 800 USDC
        // Assez d'USDC pour combler tous les déficits (1000 > 800)
        // Doit combler les déficits puis distribuer le reste équitablement
        assertEq(plan[0], 500e6 + 100e6); // Déficit (500) + bonus (100)
        assertEq(plan[1], 300e6 + 100e6); // Déficit (300) + bonus (100)
        
        // Vérifier que le total correspond
        uint256 total = plan[0] + plan[1];
        assertEq(total, usdcAmount);
    }
    
    function testLzReduceWithInsufficientUSDC() public {
        // Montant USDC à distribuer : 500 USDC (insuffisant pour combler tous les déficits)
        uint256 usdcAmount = 500e6;
        bytes memory cmd = abi.encode(usdcAmount);
        
        // Préparer des réponses mappées
        bytes[] memory responses = new bytes[](2);
        
        // Wallet 1: 100 USDC, seuil 1000 (déficit: 900 USDC)
        GenericUSDCAnalyzer.BalanceData memory data1 = GenericUSDCAnalyzer.BalanceData({
            balance: 100e6,
            minThreshold: 1000e6,
            usdcAmount: usdcAmount
        });
        responses[0] = abi.encode(data1);
        
        // Wallet 2: 200 USDC, seuil 500 (déficit: 300 USDC)
        GenericUSDCAnalyzer.BalanceData memory data2 = GenericUSDCAnalyzer.BalanceData({
            balance: 200e6,
            minThreshold: 500e6,
            usdcAmount: usdcAmount
        });
        responses[1] = abi.encode(data2);
        
        // Test lzReduce avec USDC insuffisant
        bytes memory result = analyzer.lzReduce(cmd, responses);
        uint256[] memory plan = abi.decode(result, (uint256[]));
        
        // Total déficit = 900 + 300 = 1200 USDC
        // Seulement 500 USDC disponible
        // Distribution proportionnelle : wallet1 = 500 * 900/1200 = 375, wallet2 = 500 * 300/1200 = 125
        assertEq(plan[0], 375e6); // 375 USDC
        assertEq(plan[1], 125e6); // 125 USDC
        
        // Vérifier que le total correspond (peut avoir des arrondis)
        uint256 total = plan[0] + plan[1];
        assertEq(total, usdcAmount);
    }
    
    function testLzReduceWithNoUnderThresholdWallets() public {
        // Montant USDC à distribuer : 1000 USDC
        uint256 usdcAmount = 1000e6;
        bytes memory cmd = abi.encode(usdcAmount);
        
        // Préparer des réponses mappées - tous au-dessus du seuil
        bytes[] memory responses = new bytes[](2);
        
        // Wallet 1: 1500 USDC, seuil 1000 (au-dessus du seuil)
        GenericUSDCAnalyzer.BalanceData memory data1 = GenericUSDCAnalyzer.BalanceData({
            balance: 1500e6,
            minThreshold: 1000e6,
            usdcAmount: usdcAmount
        });
        responses[0] = abi.encode(data1);
        
        // Wallet 2: 2000 USDC, seuil 1000 (au-dessus du seuil)
        GenericUSDCAnalyzer.BalanceData memory data2 = GenericUSDCAnalyzer.BalanceData({
            balance: 2000e6,
            minThreshold: 1000e6,
            usdcAmount: usdcAmount
        });
        responses[1] = abi.encode(data2);
        
        // Test lzReduce sans chaîne sous le seuil
        bytes memory result = analyzer.lzReduce(cmd, responses);
        uint256[] memory plan = abi.decode(result, (uint256[]));
        
        // Doit distribuer équitablement : 500 USDC chacun
        assertEq(plan[0], 500e6); // 500 USDC au wallet 1
        assertEq(plan[1], 500e6); // 500 USDC au wallet 2
        
        // Vérifier que le total correspond
        uint256 total = plan[0] + plan[1];
        assertEq(total, usdcAmount);
    }
}
