// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { IOAppMapper } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppMapper.sol";
import { IOAppReducer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReducer.sol";
import { EVMCallRequestV1, EVMCallComputeV1, ReadCodecV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { MessagingFee, MessagingReceipt, ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

/**
 * @title GenericUSDCAnalyzer
 * @notice Reads USDC balances on multiple chains using LayerZero's lzRead mechanism and returns an optimal dispatch plan
 */
contract GenericUSDCAnalyzer is OAppRead, IOAppMapper, IOAppReducer, OAppOptionsType3 {
    /// @notice Emitted with dispatch plan containing actual USDC amounts for each chain
    event DispatchRecommendation(uint256[] dispatchPlan, uint256 totalAmount);

    uint32 public READ_CHANNEL;
    uint16 public constant READ_TYPE = 1;

    /// @notice Maps LayerZero chain ID (endpoint ID) to USDCBalanceFetcher contract address
    mapping(uint32 => address) public fetcherByChain;

    /// @notice Structure pour les données de balance avec seuil
    struct BalanceData {
        uint256 balance;
        uint256 minThreshold;
        uint256 usdcAmount; // Metadata for USDC amount
    }

    /// @notice Structure pour les données d'analyse complète
    struct AnalysisData {
        uint256 usdcAmount;
        uint256[] balances;
        uint256[] minThresholds;
    }

    /**
     * @notice Contract constructor
     * @param _endpoint The LayerZero endpoint address
     * @param _readChannel The channel used for reading data
     * @param eids List of LayerZero endpoint IDs (target chains)
     * @param fetcherAddresses Corresponding USDCBalanceFetcher addresses for each chain
     */
    constructor(
        address _endpoint,
        uint32 _readChannel,
        uint32[] memory eids,
        address[] memory fetcherAddresses
    ) OAppRead(_endpoint, msg.sender) Ownable(msg.sender) {
        require(eids.length == fetcherAddresses.length, "Length mismatch");
        READ_CHANNEL = _readChannel;
        _setPeer(READ_CHANNEL, AddressCast.toBytes32(address(this)));

        for (uint i = 0; i < eids.length; i++) {
            fetcherByChain[eids[i]] = fetcherAddresses[i];
        }
    }

    /**
     * @notice Initiates a cross-chain read request to fetch merchant USDC balances
     * @param merchantWallets Wallets to check balances for (1 per chain)
     * @param targetEids Corresponding LayerZero chain IDs
     * @param minThresholds Minimum USDC balance desired for each wallet
     * @param _usdcAmount Amount of USDC to distribute across chains
     * @param _extraOptions Extra LayerZero options for the read
     */
    function analyzeBalances(
        address[] calldata merchantWallets,
        uint32[] calldata targetEids,
        uint256[] calldata minThresholds,
        uint256 _usdcAmount,
        bytes calldata _extraOptions
    ) external payable returns (MessagingReceipt memory) {
        require(
            merchantWallets.length == targetEids.length &&
            targetEids.length == minThresholds.length,
            "Length mismatch"
        );

        // Build read requests per chain
        EVMCallRequestV1[] memory requests = new EVMCallRequestV1[](merchantWallets.length);

        for (uint i = 0; i < merchantWallets.length; i++) {
            address fetcher = fetcherByChain[targetEids[i]];
            require(fetcher != address(0), "Unsupported chain");

            // Appeler fetchUSDCBalanceWithThreshold avec le wallet et son minThreshold
            bytes memory callData = abi.encodeWithSignature(
                "fetchUSDCBalanceWithThreshold(address,uint256,uint256)", 
                merchantWallets[i], 
                minThresholds[i],
                _usdcAmount // Pass the USDC amount as metadata
            );

            requests[i] = EVMCallRequestV1({
                appRequestLabel: uint16(i),
                targetEid: targetEids[i],
                isBlockNum: false,
                blockNumOrTimestamp: uint64(block.timestamp),
                confirmations: 10,
                to: fetcher,
                callData: callData
            });
        }


        // Build compute configuration (will execute lzMap/lzReduce)
        EVMCallComputeV1 memory computeRequest = EVMCallComputeV1({
            computeSetting: 2,
            targetEid: ILayerZeroEndpointV2(endpoint).eid(),
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 10,
            to: address(this)
        });

        // Encode the USDC amount in the command for use in lzReduce
        bytes memory cmd = ReadCodecV1.encode(
            0, // Pass USDC amount as metadata
            requests, 
            computeRequest
        );

        // Send the read+compute request
        return _lzSend(
            READ_CHANNEL,
            cmd,
            combineOptions(READ_CHANNEL, READ_TYPE, _extraOptions),
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }

    /**
     * @notice Mapping function run on each chain's response. Decodes BalanceData from response
     */
    function lzMap(bytes calldata, bytes calldata _response) external pure override returns (bytes memory) {
        (uint256 balance, uint256 minThreshold, uint256 usdcAmount) = abi.decode(_response, (uint256, uint256, uint256));
        BalanceData memory balanceData = BalanceData({
            balance: balance,
            minThreshold: minThreshold,
            usdcAmount: usdcAmount // Metadata not needed here, will be handled in lzReduce
        });
        return abi.encode(balanceData);
    }

    /**
     * @notice Reduces all mapped balances into a dispatch plan
     * @dev Logic:
     *  - If one wallet is under threshold: send all USDC amount there
     *  - If multiple: distribute proportionally to deficit up to threshold
     *  - If none under threshold: distribute equally
     *  - Remaining amount after filling thresholds: distribute equally
     * @param _cmd Encoded command containing USDC amount
     * @param _responses Responses from each chain containing balance data
     * @return Encoded dispatch plan with actual USDC amounts for each chain
     */
    function lzReduce(bytes calldata _cmd, bytes[] calldata _responses) external pure override returns (bytes memory) {
               
        uint256 n = _responses.length;
        uint256[] memory balances = new uint256[](n);
        uint256[] memory minThresholds = new uint256[](n);
        uint256[] memory plan = new uint256[](n);
        uint256 underThresholdCount = 0;
        uint256 totalDeficit = 0;
        uint256 usdcAmount;

        // Decode BalanceData from each response
        for (uint i = 0; i < n; i++) {
            BalanceData memory balanceData = abi.decode(_responses[i], (BalanceData));
            balances[i] = balanceData.balance;
            minThresholds[i] = balanceData.minThreshold;
            usdcAmount = balanceData.usdcAmount; // Get the USDC amount from the first response
            
            if (balances[i] < minThresholds[i]) {
                underThresholdCount++;
                totalDeficit += minThresholds[i] - balances[i];
            }
        }

        if (underThresholdCount == 0) {
            // Aucune chaîne sous le seuil : répartition égale
            uint256 amountPerChain = usdcAmount / n;
            uint256 remainder = usdcAmount % n;
            
            for (uint i = 0; i < n; i++) {
                plan[i] = amountPerChain;
                if (i < remainder) {
                    plan[i] += 1; // Distribuer le reste sur les premières chaînes
                }
            }
        } else if (underThresholdCount == 1) {
            // Une seule chaîne sous le seuil : tout envoyer là-bas
            for (uint i = 0; i < n; i++) {
                plan[i] = (balances[i] < minThresholds[i]) ? usdcAmount : 0;
            }
        } else {
            // Plusieurs chaînes sous le seuil : stratégie de priorisation
            uint256 remainingAmount = usdcAmount;
            
            if (usdcAmount >= totalDeficit) {
                // Assez d'USDC pour combler tous les déficits
                // 1. Combler les déficits d'abord
                for (uint i = 0; i < n; i++) {
                    if (balances[i] < minThresholds[i]) {
                        uint256 deficit = minThresholds[i] - balances[i];
                        plan[i] = deficit;
                        remainingAmount -= deficit;
                    }
                }
                
                // 2. Distribuer le reste équitablement
                if (remainingAmount > 0) {
                    uint256 bonusPerChain = remainingAmount / n;
                    uint256 bonusRemainder = remainingAmount % n;
                    
                    for (uint i = 0; i < n; i++) {
                        plan[i] += bonusPerChain;
                        if (i < bonusRemainder) {
                            plan[i] += 1;
                        }
                    }
                }
            } else {
                // Pas assez d'USDC pour combler tous les déficits
                // Distribuer proportionnellement aux déficits
                for (uint i = 0; i < n; i++) {
                    if (balances[i] < minThresholds[i]) {
                        uint256 deficit = minThresholds[i] - balances[i];
                        plan[i] = (usdcAmount * deficit) / totalDeficit;
                    }
                }
                
                // Gérer les arrondis : distribuer le reste
                uint256 distributedAmount = 0;
                for (uint i = 0; i < n; i++) {
                    distributedAmount += plan[i];
                }
                
                uint256 remainder = usdcAmount - distributedAmount;
                for (uint i = 0; i < n && remainder > 0; i++) {
                    if (plan[i] > 0) {
                        plan[i] += 1;
                        remainder -= 1;
                    }
                }
            }
        }

        return abi.encode(plan);
    }

    /**
     * @notice Handles the final computed result from LayerZero pipeline
     * @param _message ABI encoded dispatch plan with actual USDC amounts
     */
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        uint256[] memory dispatchPlan = abi.decode(_message, (uint256[]));
        
        // Calculate total amount for verification
        uint256 totalAmount = 0;
        for (uint i = 0; i < dispatchPlan.length; i++) {
            totalAmount += dispatchPlan[i];
        }
        
        emit DispatchRecommendation(dispatchPlan, totalAmount);
    }
}
