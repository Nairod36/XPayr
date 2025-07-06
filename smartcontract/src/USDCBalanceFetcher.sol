// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title USDCBalanceFetcher
 * @notice Interface deployed on each chain to fetch USDC balances
 * @dev Called by LayerZero lzRead from GenericUSDCAnalyzer
 */
contract USDCBalanceFetcher {

    /// @notice USDC token contract address on this chain
    address private USDC_ADDRESS;

    /// @notice Structure to return balance + minThreshold data
    struct BalanceData {
        uint256 balance;      // Current USDC balance of the wallet
        uint256 minThreshold; // Minimum threshold for this wallet on this chain
        uint256 usdcAmount;   // Metadata for total USDC amount to distribute
    }

    /**
     * @notice Constructor to set the USDC token address for this chain
     * @param _usdcAddress Address of the USDC token contract on this chain
     */
    constructor(address _usdcAddress) {
        USDC_ADDRESS = _usdcAddress;
    }

    /**
     * @notice Fetches USDC balance of a wallet with its minimum threshold
     * @param _wallet Address of the wallet to check
     * @param _minThreshold Minimum threshold for this wallet on this chain
     * @param _usdcAmount Total USDC amount to distribute (passed as metadata)
     * @return balanceData Structure containing balance, minThreshold, and usdcAmount
     */
    function fetchUSDCBalanceWithThreshold(address _wallet, uint256 _minThreshold, uint256 _usdcAmount) external view returns (BalanceData memory balanceData) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        uint256 balance = usdc.balanceOf(_wallet);
        
        balanceData = BalanceData({
            balance: balance,
            minThreshold: _minThreshold,
            usdcAmount: _usdcAmount // Include the USDC amount as metadata
        });
        
        return balanceData;
    }

    /**
     * @notice Compatibility function - fetches only the balance
     * @param _wallet Address of the wallet to check
     * @return balance USDC balance of the wallet
     */
    function fetchUSDCBalance(address _wallet) external view returns (uint256 balance) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        return usdc.balanceOf(_wallet);
    }

    /**
     * @notice Gets the configured USDC contract address
     * @return usdcAddress Address of the USDC token contract
     */
    function getUSDCAddress() external view returns (address usdcAddress) {
        return USDC_ADDRESS;
    }
}