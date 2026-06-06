// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Demo contract: flat global storage — no channel partitioning, no access control.
// Under Monad parallel execution, concurrent writes to balances[user] from different
// threads in the same block will collide. Compare with VertexCore which uses
// mapping(channelId => mapping(address => Partition)) for disjoint state access.
contract MonolithDemo {
    // Global flat mapping — all callers write to the same storage region.
    // No channelId partitioning → thread collision under Monad concurrency.
    mapping(address => uint256) public balances;

    // Global accumulated balance — updated by processMicropayment.
    uint256 public globalBalance;

    // clientTimestamp: unix seconds passed by caller, used by off-chain indexer
    // to compute round-trip latency (Date.now() - clientTimestamp * 1000).
    // shieldDifficulty is always 0 — Monolith has no PoW guard.
    event StateUpdated(
        address indexed sender,
        uint256         globalBalance,
        uint256         clientTimestamp,
        uint256         blockNumber,
        uint256         shieldDifficulty
    );

    function deposit(uint256 amount, uint256 clientTimestamp) external {
        balances[msg.sender] += amount;
        emit StateUpdated(msg.sender, balances[msg.sender], clientTimestamp, block.number, 0);
    }

    function processMicropayment(uint256 clientTimestamp) external payable {
        globalBalance += msg.value;
        emit StateUpdated(msg.sender, globalBalance, clientTimestamp, block.number, 0);
    }
}
