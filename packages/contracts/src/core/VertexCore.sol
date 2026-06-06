// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Per-channel, per-account balance ledger for Vertex.
/// @dev    Storage layout invariant: Partition fits in exactly 1 slot.
///         uint128 balance  (bits 0–127)
///         uint64  nonce    (bits 128–191)
///         uint64  lastUpdated (bits 192–255)
///         Total = 256 bits. Never reorder fields — the EVM packs sequentially
///         and reordering would corrupt existing on-chain state after an upgrade.
///
///         Keyed by mapping(channelId => mapping(account => Partition)).
///         Nested mappings guarantee disjoint storage keys across channels:
///         two transactions touching different channelIds never share a slot,
///         satisfying Monad's parallel execution pre-condition (no write-set overlap).
contract VertexCore {

    // ── Storage layout ────────────────────────────────────────────────────────

    /// @dev 1 slot: uint128 + uint64 + uint64 = 256 bits. Field order is load-bearing.
    struct Partition {
        uint128 balance;
        uint64  nonce;
        uint64  lastUpdated;
    }

    /// @dev Nested mapping: outer key = channelId (shard discriminator),
    ///      inner key = account. Each (channelId, account) pair maps to a unique
    ///      storage slot, so Monad can parallelise writes to different channels.
    mapping(uint256 => mapping(address => Partition)) public partitions;

    /// @dev Immutable: stored in contract bytecode, not a storage slot.
    ///      Avoids one SLOAD (~200 gas) on every hot-path call.
    ///      Set once in the constructor — there is intentionally no setter.
    address public immutable executor;

    // ── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted on a successful deposit.
    event PartitionDeposited(uint256 indexed channelId, address indexed account, uint128 amount);

    /// @notice Emitted on a successful withdrawal.
    event PartitionWithdrawn(uint256 indexed channelId, address indexed account, uint128 amount);

    // ── Errors ────────────────────────────────────────────────────────────────

    error ZeroChannel();
    error ZeroAccount();
    error OnlyExecutor();
    error ZeroExecutor();
    error InsufficientBalance();
    error ZeroAmount();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address executor_) {
        if (executor_ == address(0)) revert ZeroExecutor();
        executor = executor_;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyExecutor() {
        if (msg.sender != executor) revert OnlyExecutor();
        _;
    }

    // ── View functions ────────────────────────────────────────────────────────

    function getPartition(uint256 channelId, address account)
        external
        view
        returns (uint128 balance, uint64 nonce, uint64 lastUpdated)
    {
        Partition storage p = partitions[channelId][account];
        return (p.balance, p.nonce, p.lastUpdated);
    }

    // ── Mutating functions ────────────────────────────────────────────────────

    function deposit(uint256 channelId, address account, uint128 amount) external onlyExecutor {
        if (amount    == 0)          revert ZeroAmount();
        if (channelId == 0)          revert ZeroChannel();
        if (account   == address(0)) revert ZeroAccount();

        Partition storage p = partitions[channelId][account];
        p.balance += amount;
        unchecked {
            p.nonce      += 1;
            p.lastUpdated = uint64(block.timestamp);
        }

        emit PartitionDeposited(channelId, account, amount);
    }

    function withdraw(uint256 channelId, address account, uint128 amount) external onlyExecutor {
        if (amount    == 0)          revert ZeroAmount();
        if (channelId == 0)          revert ZeroChannel();
        if (account   == address(0)) revert ZeroAccount();

        Partition storage p = partitions[channelId][account];
        if (p.balance < amount) revert InsufficientBalance();
        unchecked {
            p.balance    -= amount;
            p.nonce      += 1;
            p.lastUpdated = uint64(block.timestamp);
        }

        emit PartitionWithdrawn(channelId, account, amount);
    }
}
