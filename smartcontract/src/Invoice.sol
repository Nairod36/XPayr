// SPDX-License-Identifier: MIT

import "./IERC20.sol";
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
