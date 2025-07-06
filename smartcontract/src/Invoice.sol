// SPDX-License-Identifier: MIT

import "./IERC20.sol";
pragma solidity ^0.8.20;

/**
 * @title Invoice
 * @notice A simple invoice contract representing a payment request from a merchant
 * @dev This contract tracks payment status and stores payment details once paid
 */
contract Invoice {
    /// @notice Address of the merchant requesting payment
    address public merchant;
    
    /// @notice Address of the payer (set when payment is made)
    address public payer;
    
    /// @notice Address of the USDC token contract used for payment
    address public usdc;
    
    /// @notice Amount of USDC requested (in USDC units with 6 decimals)
    uint256 public amount;
    
    /// @notice Whether this invoice has been paid
    bool public paid;
    
    /// @notice Timestamp when the invoice was paid (0 if not paid)
    uint256 public paidAt;

    /// @notice Emitted when the invoice is paid
    /// @param payer Address who made the payment
    /// @param amount Amount paid in USDC
    /// @param timestamp When the payment was made
    event Paid(address indexed payer, uint256 amount, uint256 timestamp);

    /**
     * @notice Creates a new invoice
     * @param _merchant Address of the merchant requesting payment
     * @param _usdc Address of the USDC token contract
     * @param _amount Amount of USDC requested for this invoice
     */
    constructor(address _merchant, address _usdc, uint256 _amount) {
        merchant = _merchant;
        usdc = _usdc;
        amount = _amount;
        paid = false;
    }

    /**
     * @notice Marks the invoice as paid by a specific payer
     * @param _payer Address of the account that made the payment
     * @dev This function only updates the invoice state, actual USDC transfer should be handled externally
     */
    function pay(address _payer) external {
        require(!paid, "Already paid");
        require(_payer != address(0), "Invalid payer");

        // Transfert des USDC du client vers ce contrat
        bool success = IERC20(usdc).transferFrom(_payer, address(this), amount);
        require(success, "USDC transfer failed");

        payer = _payer;
        paid = true;
        paidAt = block.timestamp;
        emit Paid(_payer, amount, paidAt);
    }

    // Permet au merchant (ou backend) de récupérer les USDC pour bridge
    function withdrawTo(address to) external {
        require(msg.sender == merchant, "Only merchant");
        require(paid, "Invoice not paid");
        uint256 bal = IERC20(usdc).balanceOf(address(this));
        require(bal > 0, "No USDC to withdraw");
        bool success = IERC20(usdc).transfer(to, bal);
        require(success, "Withdraw failed");
    }
}
