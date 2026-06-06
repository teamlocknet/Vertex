// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuardTransient} from "openzeppelin-contracts/contracts/utils/ReentrancyGuardTransient.sol";
import {VertexCore}  from "./VertexCore.sol";
import {PulseState}  from "./PulseState.sol";
import {GasAuditor}  from "./GasAuditor.sol";
import {AegisNet}    from "./AegisNet.sol";

/// @notice Orchestrator for atomic batch deposits and single-account micropayments
///         through the Vertex parallel execution pipeline on Monad.
///
/// @dev    Security model overview:
///         - ReentrancyGuardTransient (EIP-1153, cancun+): prevents re-entrant calls
///           using TSTORE/TLOAD instead of SSTORE/SLOAD, saving ~97% of guard gas.
///         - whenNotPaused circuit breaker: owner can halt execution during an exploit
///           before a patch is deployed. Without this, a live exploit is irrecoverable.
///         - Guard order — auth BEFORE _updateDifficulty: an unauthorized caller can
///           currently increment txCounterThisBlock (steering difficulty) at zero cost
///           by making a call that reverts after the counter write. Moving auth first
///           ensures the counter is only touched by legitimately authorized senders.
///         - Safe cast on msg.value: Solidity 0.8 explicit casts do NOT check for
///           truncation. uint128(x) silently drops the upper bits when x > 2^128.
///           AmountTooLarge bounds msg.value before the cast.
///         - Shield PoW (Yul inline): rate-limits batch submission per block.
///           The Yul block is preserved verbatim from the audit baseline — any
///           change to the assembly requires re-auditing the hardcoded selector.
///         - Monad parallel execution: DiffState packed in 1 storage slot
///           means _updateDifficulty() contributes exactly 1 write-set entry
///           to the transaction dependency graph, minimising optimistic abort
///           probability when multiple authorized callers submit batches in
///           the same block.
contract VertexExecutor is ReentrancyGuardTransient {

    // ── Immutables ────────────────────────────────────────────────────────────

    VertexCore  public immutable core;
    PulseState  public immutable pulse;
    GasAuditor  public immutable auditor;
    AegisNet    public immutable aegis;

    address     public immutable owner;

    // ── Mutable state ─────────────────────────────────────────────────────────

    bool public paused;

    // ── Shield PoW state — packed into 1 storage slot ────────────────────────
    // Layout (256 bits, field order is load-bearing — do not reorder):
    //   bits   0– 63: txCounterThisBlock (uint64)
    //   bits  64–127: lastTargetBlock    (uint64)
    //   bits 128–191: currentDifficulty  (uint64)
    //   bits 192–255: reserved (zero)
    struct DiffState {
        uint64 txCounterThisBlock;
        uint64 lastTargetBlock;
        uint64 currentDifficulty;
    }
    DiffState private _diff;

    // ── Constants ─────────────────────────────────────────────────────────────

    uint64 public constant DIFFICULTY_HIGH_THRESHOLD = 5;
    uint64 public constant DIFFICULTY_LOW_THRESHOLD  = 2;
    uint64 public constant DIFFICULTY_MAX            = 64;

    uint256 public constant MAX_BATCH_SIZE = 256;

    // ── Events ────────────────────────────────────────────────────────────────

    event BatchPush(
        uint256 indexed channelId,
        uint256          opCount,
        bytes32          payloadRoot,
        uint64           timestamp
    );

    event DifficultyUpdated(uint256 newDifficulty, uint256 blockNumber);

    event ShieldBypassed(address indexed sender, uint256 indexed channelId);

    event PausedStateChanged(bool indexed paused);

    // ── Errors ────────────────────────────────────────────────────────────────

    error LengthMismatch();
    error EmptyBatch();
    error BatchTooLarge();
    error ZeroChannel();
    error ZeroAddress();
    error GasAuditFailed();
    error NotAuthorized();
    error NotOwner();
    error ContractPaused();
    error AmountTooLarge();
    error ETHTransferFailed();

    /// @dev Selector hardcoded in the Yul block below: keccak256("InvalidPoWNonce()")[0:4] = 0x8437022e.
    error InvalidPoWNonce();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address core_,
        address pulse_,
        address auditor_,
        address aegis_,
        uint256 difficulty_
    ) {
        if (core_    == address(0)) revert ZeroAddress();
        if (pulse_   == address(0)) revert ZeroAddress();
        if (auditor_ == address(0)) revert ZeroAddress();
        if (aegis_   == address(0)) revert ZeroAddress();
        core    = VertexCore(core_);
        pulse   = PulseState(pulse_);
        auditor = GasAuditor(auditor_);
        aegis   = AegisNet(aegis_);
        _diff   = DiffState({
            txCounterThisBlock: 0,
            lastTargetBlock:    uint64(block.number),
            currentDifficulty:  uint64(difficulty_)
        });
        owner   = msg.sender;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ── Fallback ──────────────────────────────────────────────────────────────

    receive() external payable {}

    // ── DiffState getters ─────────────────────────────────────────────────────

    function txCounterThisBlock() external view returns (uint64) { return _diff.txCounterThisBlock; }
    function lastTargetBlock()    external view returns (uint64) { return _diff.lastTargetBlock; }
    function currentDifficulty()  external view returns (uint64) { return _diff.currentDifficulty; }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setPaused(bool _paused) external {
        if (msg.sender != owner) revert NotOwner();
        if (paused == _paused) return;
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function withdrawETH(address payable to) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0))    revert ZeroAddress();
        uint256 bal = address(this).balance;
        if (bal == 0) return;
        (bool ok,) = to.call{value: bal}("");
        if (!ok) revert ETHTransferFailed();
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _updateDifficulty() internal returns (uint256 cachedDiff) {
        DiffState memory d = _diff;
        cachedDiff = d.currentDifficulty;

        if (uint64(block.number) != d.lastTargetBlock) {
            uint64 prevCount = d.txCounterThisBlock;
            uint64 newDiff   = d.currentDifficulty;

            if (prevCount >= DIFFICULTY_HIGH_THRESHOLD && newDiff < DIFFICULTY_MAX) {
                unchecked { newDiff += 1; }
                emit DifficultyUpdated(newDiff, block.number);
            } else if (prevCount < DIFFICULTY_LOW_THRESHOLD && newDiff > 0) {
                unchecked { newDiff -= 1; }
                emit DifficultyUpdated(newDiff, block.number);
            }

            d.lastTargetBlock    = uint64(block.number);
            d.txCounterThisBlock = 0;
            d.currentDifficulty  = newDiff;
        }
        unchecked { d.txCounterThisBlock += 1; }
        _diff = d;
    }

    function _applyShieldPoW(uint256 difficulty_, uint256 noncePoW, uint256 channelId) internal view {
        if (difficulty_ == 0) return;

        bytes32 powHash = keccak256(abi.encodePacked(msg.sender, noncePoW, channelId));
        assembly {
            let shiftAmt := 0
            switch gt(difficulty_, 63)
            case 0 {
                shiftAmt := sub(256, mul(difficulty_, 4))
            }
            if shr(shiftAmt, powHash) {
                let ptr := mload(0x40)
                mstore(ptr, 0x8437022e00000000000000000000000000000000000000000000000000000000)
                revert(ptr, 4)
            }
        }
    }

    // ── Public functions ──────────────────────────────────────────────────────

    function executeBatch(
        uint256            channelId,
        address[] calldata accounts,
        uint128[] calldata amounts,
        bytes32[] calldata payloadHashes,
        uint256            noncePoW
    ) external whenNotPaused nonReentrant {

        uint256 n = accounts.length;
        if (n > MAX_BATCH_SIZE)                                revert BatchTooLarge();
        if (n == 0)                                            revert EmptyBatch();
        if (n != amounts.length || n != payloadHashes.length) revert LengthMismatch();
        if (channelId == 0)                                    revert ZeroChannel();

        if (!aegis.isAuthorized(msg.sender, channelId)) revert NotAuthorized();

        uint256 diff_ = _updateDifficulty();

        if (diff_ == 0) emit ShieldBypassed(msg.sender, channelId);

        _applyShieldPoW(diff_, noncePoW, channelId);

        if (!auditor.auditBatch(channelId, n)) revert GasAuditFailed();

        uint128 batchVolume;
        bytes32 root = bytes32(0);

        for (uint256 i; i < n; ) {
            core.deposit(channelId, accounts[i], amounts[i]);
            batchVolume += amounts[i];
            unchecked {
                root = keccak256(abi.encodePacked(root, payloadHashes[i]));
                ++i;
            }
        }

        pulse.record(channelId, batchVolume);
        emit BatchPush(channelId, n, root, uint64(block.timestamp));
    }

    function processMicropayment(
        uint256 channelId,
        uint256 clientTimestamp,
        uint256 noncePoW
    ) external payable whenNotPaused nonReentrant {

        if (channelId == 0) revert ZeroChannel();

        if (msg.value > type(uint128).max) revert AmountTooLarge();

        if (!aegis.isAuthorized(msg.sender, channelId)) revert NotAuthorized();

        uint256 diff_ = _updateDifficulty();

        if (diff_ == 0) emit ShieldBypassed(msg.sender, channelId);

        _applyShieldPoW(diff_, noncePoW, channelId);

        if (!auditor.auditBatch(channelId, 1)) revert GasAuditFailed();

        uint128 amt = msg.value > 0 ? uint128(msg.value) : 1;
        core.deposit(channelId, msg.sender, amt);

        pulse.record(channelId, amt);
        bytes32 payloadHash = keccak256(abi.encodePacked(msg.sender, clientTimestamp));
        emit BatchPush(channelId, 1, payloadHash, uint64(block.timestamp));
    }
}
