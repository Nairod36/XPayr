// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title USDCBalanceFetcher
 * @notice Interface déployée sur chaque chaîne pour récupérer les soldes USDC
 * @dev Appelée par LayerZero lzRead depuis GenericUSDCAnalyzer
 */
contract USDCBalanceFetcher {

    address private USDC_ADDRESS;

    /// @notice Structure pour retourner balance + minThreshold
    struct BalanceData {
        uint256 balance;
        uint256 minThreshold;
        uint256 usdcAmount; // Metadata for USDC amount
    }

    constructor(address _usdcAddress) {
        USDC_ADDRESS = _usdcAddress;
    }

    /// @notice Récupère le solde USDC d'un wallet avec son seuil minimum
    /// @param _wallet Adresse du wallet à vérifier
    /// @param _minThreshold Seuil minimum pour ce wallet sur cette chaîne
    /// @return balanceData Structure contenant balance et minThreshold
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

    /// @notice Fonction de compatibilité - récupère seulement le solde
    /// @param _wallet Adresse du wallet à vérifier
    /// @return balance Solde USDC du wallet
    function fetchUSDCBalance(address _wallet) external view returns (uint256 balance) {
        IERC20 usdc = IERC20(USDC_ADDRESS);
        return usdc.balanceOf(_wallet);
    }

    /// @notice Récupère l'adresse du contrat USDC configuré
    /// @return usdcAddress Adresse du contrat USDC
    function getUSDCAddress() external view returns (address usdcAddress) {
        return USDC_ADDRESS;
    }
}