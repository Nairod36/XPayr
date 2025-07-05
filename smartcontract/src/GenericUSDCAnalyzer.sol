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
    /// @notice Emitted with dispatch plan recommendation based on merchant balance thresholds
    event DispatchRecommendation(uint256[] dispatchPlan);

    uint32 public READ_CHANNEL;
    uint16 public constant READ_TYPE = 1;

    /// @notice Maps LayerZero chain ID (endpoint ID) to USDCBalanceFetcher contract address
    mapping(uint32 => address) public fetcherByChain;

    /// @notice Structure pour les données de balance avec seuil
    struct BalanceData {
        uint256 balance;
        uint256 minThreshold;
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
     * @param _extraOptions Extra LayerZero options for the read
     */
    function analyzeBalances(
        address[] calldata merchantWallets,
        uint32[] calldata targetEids,
        uint256[] calldata minThresholds,
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
                "fetchUSDCBalanceWithThreshold(address,uint256)", 
                merchantWallets[i], 
                minThresholds[i]
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

        bytes memory cmd = ReadCodecV1.encode(0, requests, computeRequest);

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
        (uint256 balance, uint256 minThreshold) = abi.decode(_response, (uint256, uint256));
        BalanceData memory balanceData = BalanceData({
            balance: balance,
            minThreshold: minThreshold
        });
        return abi.encode(balanceData);
    }

    /**
     * @notice Reduces all mapped balances into a dispatch plan
     * @dev Logic:
     *  - If one wallet is under threshold: send all there
     *  - If multiple: split proportionally to deficit
     *  - If none: split equally
     */
    function lzReduce(bytes calldata _cmd, bytes[] calldata _responses) external pure override returns (bytes memory) {
        uint256 n = _responses.length;
        uint256[] memory balances = new uint256[](n);
        uint256[] memory minThresholds = new uint256[](n);
        uint256[] memory plan = new uint256[](n);
        uint256 underThresholdCount = 0;

        // Decode BalanceData from each response
        for (uint i = 0; i < n; i++) {
            BalanceData memory balanceData = abi.decode(_responses[i], (BalanceData));
            balances[i] = balanceData.balance;
            minThresholds[i] = balanceData.minThreshold;
            
            if (balances[i] < minThresholds[i]) {
                underThresholdCount++;
            }
        }

        if (underThresholdCount == 1) {
            for (uint i = 0; i < n; i++) {
                plan[i] = (balances[i] < minThresholds[i]) ? 1e6 : 0;
            }
        } else if (underThresholdCount > 1) {
            uint256 totalMissing = 0;
            for (uint i = 0; i < n; i++) {
                if (balances[i] < minThresholds[i]) {
                    plan[i] = minThresholds[i] - balances[i];
                    totalMissing += plan[i];
                }
            }
            for (uint i = 0; i < n; i++) {
                if (plan[i] > 0) {
                    plan[i] = (plan[i] * 1e6) / totalMissing;
                }
            }
        } else {
            for (uint i = 0; i < n; i++) {
                plan[i] = 1e6 / n;
            }
        }

        return abi.encode(plan);
    }

    /**
     * @notice Handles the final computed result from LayerZero pipeline
     * @param _message ABI encoded dispatch plan
     */
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        uint256[] memory dispatchPlan = abi.decode(_message, (uint256[]));
        emit DispatchRecommendation(dispatchPlan);
    }
}
