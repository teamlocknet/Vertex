// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Per-channel execution state — packed into 1 slot (128+64+64).
// executor is immutable: set once at construction, read from bytecode (no SLOAD).
contract PulseState {
    struct ChannelState {
        uint128 totalVolume;
        uint64  batchCount;
        uint64  lastBatchTime;
    }

    // channel => state (disjoint per channel, no thread collision)
    mapping(uint256 => ChannelState) private _states;

    // Immutable: no storage slot consumed, no SLOAD on every record() call.
    address public immutable executor;

    error OnlyExecutor();
    error ZeroExecutor();
    error ZeroChannel();

    constructor(address executor_) {
        if (executor_ == address(0)) revert ZeroExecutor();
        executor = executor_;
    }

    modifier onlyExecutor() {
        if (msg.sender != executor) revert OnlyExecutor();
        _;
    }

    function record(uint256 channelId, uint128 volume) external onlyExecutor {
        if (channelId == 0) revert ZeroChannel();
        ChannelState storage s = _states[channelId];
        s.totalVolume += volume;
        unchecked {
            s.batchCount    += 1;
            s.lastBatchTime  = uint64(block.timestamp);
        }
    }

    function get(uint256 channelId)
        external
        view
        returns (uint128 totalVolume, uint64 batchCount, uint64 lastBatchTime)
    {
        ChannelState storage s = _states[channelId];
        return (s.totalVolume, s.batchCount, s.lastBatchTime);
    }

    function getBatch(uint256[] calldata channelIds)
        external
        view
        returns (uint128[] memory volumes, uint64[] memory counts, uint64[] memory lastTimes)
    {
        uint256 len = channelIds.length;
        volumes   = new uint128[](len);
        counts    = new uint64[](len);
        lastTimes = new uint64[](len);
        for (uint256 i; i < len; ) {
            ChannelState storage s = _states[channelIds[i]];
            volumes[i]   = s.totalVolume;
            counts[i]    = s.batchCount;
            lastTimes[i] = s.lastBatchTime;
            unchecked { ++i; }
        }
    }
}
