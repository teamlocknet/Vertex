// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Demo contract: flat global storage — no channel partitioning, no access control.
// Simulates Monad OCC behaviour: every deposit writes to the shared `globalBalance`
// slot. Once OCC_BLOCK_SATURATION concurrent writes land in the same block, the
// optimistic execution engine detects a write-set conflict and aborts new entrants.
// Compare with VertexCore which uses disjoint channel slots — zero cross-tx conflict.
contract MonolithDemo {
    // Per-user balance (written by every deposit — still causes per-user conflict).
    mapping(address => uint256) public balances;

    // Shared global slot — ALL callers write here → OCC conflict under Monad.
    uint256 public globalBalance;

    // OCC simulation: tracks how many writes landed in the current block.
    // After OCC_BLOCK_SATURATION writes, the "optimistic abort" kicks in.
    mapping(uint256 => uint256) private _writeCount;
    uint256 public constant OCC_BLOCK_SATURATION = 80;

    error OCCCollision();

    event StateUpdated(
        address indexed sender,
        uint256         globalBalance,
        uint256         clientTimestamp,
        uint256         blockNumber,
        uint256         shieldDifficulty
    );

    function deposit(uint256 amount, uint256 clientTimestamp) external {
        // Simulate Monad OCC abort: once this block's write budget is exhausted,
        // new txs that touch globalBalance are aborted by the conflict detector.
        uint256 count = _writeCount[block.number];
        if (count >= OCC_BLOCK_SATURATION) revert OCCCollision();
        unchecked { _writeCount[block.number] = count + 1; }

        balances[msg.sender] += amount;
        globalBalance        += amount;
        emit StateUpdated(msg.sender, globalBalance, clientTimestamp, block.number, 0);
    }

    function processMicropayment(uint256 clientTimestamp) external payable {
        uint256 count = _writeCount[block.number];
        if (count >= OCC_BLOCK_SATURATION) revert OCCCollision();
        unchecked { _writeCount[block.number] = count + 1; }

        globalBalance += msg.value;
        emit StateUpdated(msg.sender, globalBalance, clientTimestamp, block.number, 0);
    }
}
