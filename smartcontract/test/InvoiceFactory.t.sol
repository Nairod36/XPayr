// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/InvoiceFactory.sol";
import "../src/Invoice.sol";

contract InvoiceFactoryTest is Test {
    InvoiceFactory factory;
    address usdc = address(0x1234);
    address merchant = address(0xABCD);
    address payer = address(0xBEEF);

    function setUp() public {
        factory = new InvoiceFactory(usdc);
        vm.prank(merchant);
        factory.createInvoice(1000);
    }

    function testCreateInvoice() public {
        vm.prank(merchant);
        address invoiceAddr = factory.createInvoice(2000);
        assertTrue(invoiceAddr != address(0));
        address[] memory invoices = factory.getMerchantInvoices(merchant);
        assertEq(invoices.length, 2);
    }

    function testInvoicePayment() public {
        address[] memory invoices = factory.getMerchantInvoices(merchant);
        Invoice invoice = Invoice(invoices[0]);
        assertEq(invoice.paid(), false);
        vm.prank(payer);
        invoice.pay(payer);
        assertEq(invoice.paid(), true);
        assertEq(invoice.payer(), payer);
        assertGt(invoice.paidAt(), 0);
    }

    function testCannotPayTwice() public {
        address[] memory invoices = factory.getMerchantInvoices(merchant);
        Invoice invoice = Invoice(invoices[0]);
        vm.prank(payer);
        invoice.pay(payer);
        vm.expectRevert("Already paid");
        invoice.pay(payer);
    }
}
