// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "./Invoice.sol";

contract InvoiceFactory {
    address public owner;
    address public usdc;
    
    event InvoiceCreated(address indexed merchant, address invoice, uint256 amount);

    address[] public allInvoices;
    mapping(address => address[]) public merchantInvoices;

    constructor(address _usdc) {
        owner = msg.sender;
        usdc = _usdc;
    }

    function createInvoice(uint256 amount) external returns (address) {
        require(amount > 0, "Amount must be > 0");
        Invoice invoice = new Invoice(msg.sender, usdc, amount);
        allInvoices.push(address(invoice));
        merchantInvoices[msg.sender].push(address(invoice));
        emit InvoiceCreated(msg.sender, address(invoice), amount);
        return address(invoice);
    }

    function getMerchantInvoices(address merchant) external view returns (address[] memory) {
        return merchantInvoices[merchant];
    }
}
