// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VibeLinkGift {
    IERC20 public immutable usdc;

    struct Gift {
        uint256 amount;
        address funder;
        bool claimed;
    }

    mapping(bytes32 => Gift) public gifts;

    event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, uint256 amount);
    event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "invalid usdc");
        usdc = IERC20(usdcAddress);
    }

    function fundGift(bytes32 paymentIdHash, uint256 amount) external {
        require(paymentIdHash != bytes32(0), "invalid hash");
        require(amount > 0, "invalid amount");

        Gift storage gift = gifts[paymentIdHash];
        require(gift.amount == 0, "gift exists");

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        gifts[paymentIdHash] = Gift({
            amount: amount,
            funder: msg.sender,
            claimed: false
        });

        emit GiftFunded(paymentIdHash, msg.sender, amount);
    }

    function claim(bytes32 paymentIdHash, address recipient) external {
        require(recipient != address(0), "invalid recipient");

        Gift storage gift = gifts[paymentIdHash];
        require(gift.amount > 0, "gift missing");
        require(!gift.claimed, "gift claimed");

        gift.claimed = true;
        uint256 amount = gift.amount;

        bool ok = usdc.transfer(recipient, amount);
        require(ok, "transfer failed");

        emit GiftClaimed(paymentIdHash, recipient, amount);
    }
}
