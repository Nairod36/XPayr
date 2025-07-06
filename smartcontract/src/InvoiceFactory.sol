// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Invoice.sol";

/**
 * @title InvoiceFactory
 * @notice Factory contract for creating and managing Invoice instances
 * @dev Allows merchants to create invoices and tracks all created invoices
 */
contract InvoiceFactory {
    /// @notice Owner of the factory contract
    address public owner;
    
    /// @notice Address of the USDC token contract used for all invoices
    address public usdc;
    
    /// @notice Emitted when a new invoice is created
    /// @param merchant Address of the merchant who created the invoice
    /// @param invoice Address of the newly created invoice contract
    /// @param amount USDC amount requested in the invoice
    event InvoiceCreated(address indexed merchant, address invoice, uint256 amount);

    /// @notice Array of all created invoice addresses
    address[] public allInvoices;
    
    /// @notice Mapping from merchant address to their created invoices
    mapping(address => address[]) public merchantInvoices;

    /**
     * @notice Creates the invoice factory
     * @param _usdc Address of the USDC token contract to be used for all invoices
     */
    constructor(address _usdc) {
        owner = msg.sender;
        usdc = _usdc;
    }

    /**
     * @notice Creates a new invoice for the calling merchant
     * @param amount Amount of USDC requested in the invoice (in USDC units)
     * @return Address of the newly created invoice contract
     */
    function createInvoice(uint256 amount) external returns (address) {
        require(amount > 0, "Amount must be > 0");
        Invoice invoice = new Invoice(msg.sender, usdc, amount);
        allInvoices.push(address(invoice));
        merchantInvoices[msg.sender].push(address(invoice));
        emit InvoiceCreated(msg.sender, address(invoice), amount);
        return address(invoice);
    }

    /**
     * @notice Gets all invoices created by a specific merchant
     * @param merchant Address of the merchant to query
     * @return Array of invoice contract addresses created by the merchant
     */
    function getMerchantInvoices(address merchant) external view returns (address[] memory) {
        return merchantInvoices[merchant];
    }
}
