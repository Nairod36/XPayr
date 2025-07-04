// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Invoice {
    address public merchant;
    address public payer;
    address public usdc;
    uint256 public amount;
    bool public paid;
    uint256 public paidAt;

    event Paid(address indexed payer, uint256 amount, uint256 timestamp);

    constructor(address _merchant, address _usdc, uint256 _amount) {
        merchant = _merchant;
        usdc = _usdc;
        amount = _amount;
        paid = false;
    }

    function pay(address _payer) external {
        require(!paid, "Already paid");
        require(_payer != address(0), "Invalid payer");
        payer = _payer;
        paid = true;
        paidAt = block.timestamp;
        emit Paid(_payer, amount, paidAt);
    }
}
