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
        address refundAddress;
        uint64 expiresAt;
        bool claimed;
    }

    mapping(bytes32 => Gift) public gifts;

    event GiftFunded(
        bytes32 indexed paymentIdHash,
        address indexed funder,
        address indexed refundAddress,
        uint256 amount,
        uint64 expiresAt
    );
    event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount);
    event GiftReclaimed(bytes32 indexed paymentIdHash, address indexed refundAddress, uint256 amount);

    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "invalid usdc");
        usdc = IERC20(usdcAddress);
    }

    function fundGift(bytes32 paymentIdHash, uint256 amount, address refundAddress, uint64 expiresAt) external {
        require(paymentIdHash != bytes32(0), "invalid hash");
        require(amount > 0, "invalid amount");
        require(refundAddress != address(0), "invalid refund");
        require(expiresAt > block.timestamp, "invalid expiry");

        Gift storage gift = gifts[paymentIdHash];
        require(gift.amount == 0, "gift exists");

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        gifts[paymentIdHash] = Gift({
            amount: amount,
            refundAddress: refundAddress,
            expiresAt: expiresAt,
            claimed: false
        });

        emit GiftFunded(paymentIdHash, msg.sender, refundAddress, amount, expiresAt);
    }

    function claim(bytes32 paymentIdHash, address recipient) external {
        require(recipient != address(0), "invalid recipient");

        Gift storage gift = gifts[paymentIdHash];
        require(gift.amount > 0, "gift missing");
        require(!gift.claimed, "gift claimed");
        require(block.timestamp < gift.expiresAt, "gift expired");

        gift.claimed = true;
        uint256 amount = gift.amount;

        bool ok = usdc.transfer(recipient, amount);
        require(ok, "transfer failed");

        emit GiftClaimed(paymentIdHash, recipient, amount);
    }

    function reclaimExpiredGift(bytes32 paymentIdHash) external {
        Gift storage gift = gifts[paymentIdHash];
        require(gift.amount > 0, "gift missing");
        require(!gift.claimed, "gift claimed");
        require(block.timestamp >= gift.expiresAt, "gift active");

        gift.claimed = true;
        uint256 amount = gift.amount;
        address refundAddress = gift.refundAddress;

        bool ok = usdc.transfer(refundAddress, amount);
        require(ok, "refund transfer failed");

        emit GiftReclaimed(paymentIdHash, refundAddress, amount);
    }
}
